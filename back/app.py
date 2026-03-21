# ---------------- IMPORTS ----------------
import os
from datetime import datetime, timedelta
import re
import cv2
import pytesseract
import qrcode

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename


# ---------------- CONFIG ----------------
pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_PATH", "tesseract")

app = Flask(__name__)
CORS(app, supports_credentials=True)

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, "warranty.db")

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET", "dev-secret-key")

db = SQLAlchemy(app)
jwt = JWTManager(app)


# ---------------- CREATE FOLDERS ----------------
os.makedirs(os.path.join(basedir, "uploads"), exist_ok=True)
os.makedirs(os.path.join(basedir, "qrcodes"), exist_ok=True)


# ---------------- DATABASE ----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    product_name = db.Column(db.String(200))
    purchase_date = db.Column(db.Date)
    warranty_period = db.Column(db.String(50))
    expiry_date = db.Column(db.Date)

    bill_image = db.Column(db.String(200))
    user_id = db.Column(db.Integer)


with app.app_context():
    db.create_all()


# ---------------- HELPER FUNCTIONS ----------------
def calculate_status(expiry_date):
    today = datetime.today().date()

    days_remaining = (expiry_date - today).days

    if days_remaining < 0:
        status = "Expired"
    elif days_remaining <= 30:
        status = "Expiring Soon"
    else:
        status = "Active"

    return status, max(days_remaining, 0)


def generate_qr(product_id):
    frontend_host = os.environ.get("FRONTEND_HOST", "localhost:3000")
    url = f"http://{frontend_host}/product/{product_id}"

    qr_path = os.path.join(basedir, "qrcodes", f"product_{product_id}.png")

    img = qrcode.make(url)
    img.save(qr_path)

    return f"/qrcodes/product_{product_id}.png"


def validate_product_data(data):
    if not data.get("product_name"):
        return "Product name required"

    try:
        if int(data.get("warranty_days", 0)) < 0:
            return "Invalid warranty"
    except:
        return "Warranty must be number"

    return None


# ---------------- OCR ----------------
def ocr_extract(file_path):
    try:
        img = cv2.imread(file_path)

        if img is None:
            return ""

        img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 11, 17, 17)

        thresh = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(thresh, config=config)

        return text

    except Exception as e:
        print("OCR ERROR:", e)
        return ""


# ---------------- TEXT PARSER ----------------
def parse_text(text):

    product_name = "Unknown Product"
    purchase_date = None
    warranty_days = 365

    lines = [l.strip() for l in text.split("\n") if l.strip()]

    ignore_words = [
        "invoice", "bill", "gst", "tax", "amount",
        "total", "payment", "cash", "upi",
        "customer", "date", "qty", "price", "rs"
    ]

    for line in lines[:25]:
        clean = line.lower()

        if any(word in clean for word in ignore_words):
            continue

        if len(clean) < 5:
            continue

        if sum(c.isdigit() for c in clean) > 3:
            continue

        product_name = line
        break

    date_pattern = r'(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})'

    for line in lines:
        match = re.search(date_pattern, line)

        if match:
            date_str = match.group(1)

            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y"):
                try:
                    dt = datetime.strptime(date_str, fmt)
                    purchase_date = dt.strftime("%Y-%m-%d")
                    break
                except:
                    pass

        if purchase_date:
            break

    if not purchase_date:
        purchase_date = datetime.today().strftime("%Y-%m-%d")

    warranty_match = re.search(
        r'(\d+)\s*(year|years|yr|yrs|month|months|day|days)',
        text,
        re.I
    )

    if warranty_match:
        num = int(warranty_match.group(1))
        unit = warranty_match.group(2).lower()

        if "year" in unit or "yr" in unit:
            warranty_days = num * 365
        elif "month" in unit:
            warranty_days = num * 30
        else:
            warranty_days = num

    return product_name, purchase_date, warranty_days


# ---------------- AUTH ----------------
@app.route('/register', methods=['POST'])
def register():
    data = request.json

    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"message": "User already exists"}), 400

    user = User(
        name=data.get("name"),
        email=data.get("email"),
        password=generate_password_hash(data.get("password"))
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"})


@app.route('/login', methods=['POST'])
def login():
    data = request.json

    user = User.query.filter_by(email=data.get("email")).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not check_password_hash(user.password, data.get("password")):
        return jsonify({"message": "Invalid password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({"token": token, "name": user.name})


# ---------------- UPLOAD ----------------
@app.route('/upload_bill', methods=['POST'])
@jwt_required()
def upload_bill():

    user_id = int(get_jwt_identity())

    if 'bill' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files['bill']

    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(file.filename)}"
    path = os.path.join(basedir, "uploads", filename)

    file.save(path)

    text = ocr_extract(path)
    product_name, purchase_date, warranty_days = parse_text(text)

    purchase_date_obj = datetime.strptime(purchase_date, "%Y-%m-%d").date()
    expiry_date_obj = purchase_date_obj + timedelta(days=warranty_days)

    product = Product(
        product_name=product_name,
        purchase_date=purchase_date_obj,
        warranty_period=str(warranty_days),
        expiry_date=expiry_date_obj,
        bill_image=filename,
        user_id=user_id
    )

    db.session.add(product)
    db.session.commit()

    qr = generate_qr(product.id)

    return jsonify({
        "product_id": product.id,
        "product_name": product.product_name,
        "purchase_date": product.purchase_date.strftime("%Y-%m-%d"),
        "expiry_date": product.expiry_date.strftime("%Y-%m-%d"),
        "bill_url": f"/uploads/{filename}",
        "qr_code": qr
    })


# ---------------- GET PRODUCT ----------------
@app.route('/products/<int:id>', methods=['GET'])
@jwt_required()
def get_product(id):

    user_id = int(get_jwt_identity())
    product = Product.query.get(id)

    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404

    status, days = calculate_status(product.expiry_date)

    return jsonify({
        "product_name": product.product_name,
        "purchase_date": product.purchase_date.strftime("%Y-%m-%d"),
        "warranty_days": int(product.warranty_period),
        "expiry_date": product.expiry_date.strftime("%Y-%m-%d"),
        "status": status,
        "days_remaining": days,
        "bill_url": f"/uploads/{product.bill_image}",
        "qr_url": f"/qrcodes/product_{product.id}.png"
    })


# ---------------- EDIT ----------------
@app.route('/edit_product/<int:id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def edit_product(id):

    if request.method == "OPTIONS":
        return '', 200

    user_id = int(get_jwt_identity())
    product = Product.query.get(id)

    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404

    data = request.get_json()

    error = validate_product_data(data)
    if error:
        return jsonify({"message": error}), 400

    product.product_name = data.get("product_name")

    purchase_date_obj = datetime.strptime(data.get("purchase_date"), "%Y-%m-%d").date()
    warranty_days = int(data.get("warranty_days"))

    product.purchase_date = purchase_date_obj
    product.warranty_period = str(warranty_days)
    product.expiry_date = purchase_date_obj + timedelta(days=warranty_days)

    db.session.commit()

    return jsonify({"message": "Product updated successfully"})


# ---------------- DELETE ----------------
@app.route('/delete_product/<int:id>', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def delete_product(id):

    if request.method == "OPTIONS":
        return '', 200

    user_id = int(get_jwt_identity())
    product = Product.query.get(id)

    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404

    # delete bill file
    file_path = os.path.join(basedir, "uploads", product.bill_image)
    if os.path.exists(file_path):
        os.remove(file_path)

    # delete qr
    qr_path = os.path.join(basedir, "qrcodes", f"product_{product.id}.png")
    if os.path.exists(qr_path):
        os.remove(qr_path)

    db.session.delete(product)
    db.session.commit()

    return jsonify({"message": "Product deleted successfully"})


# ---------------- DASHBOARD ----------------
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():

    user_id = int(get_jwt_identity())
    products = Product.query.filter_by(user_id=user_id).all()

    data = []

    for p in products:
        status, days = calculate_status(p.expiry_date)

        data.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "purchase_date": p.purchase_date.strftime("%Y-%m-%d"),
            "expiry_date": p.expiry_date.strftime("%Y-%m-%d"),
            "status": status,
            "days_remaining": days,
            "bill_url": f"/uploads/{p.bill_image}",
            "qr_url": f"/qrcodes/product_{p.id}.png"
        })

    return jsonify({"products": data})


# ---------------- SERVE FILES ----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(os.path.join(basedir, "uploads"), filename, as_attachment=True)


@app.route('/qrcodes/<filename>')
def qr_file(filename):
    return send_from_directory(os.path.join(basedir, "qrcodes"), filename, as_attachment=True)


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)