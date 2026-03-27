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
from flask_jwt_extended import (
    JWTManager,
    jwt_required,
    create_access_token,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# ---------------- CONFIG ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

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
    category = db.Column(db.String(100), default="Other")
    purchase_date = db.Column(db.Date)
    warranty_period = db.Column(db.String(50))
    expiry_date = db.Column(db.Date)
    bill_image = db.Column(db.String(200))
    user_id = db.Column(db.Integer)

with app.app_context():
    db.create_all()
    # migrate: add category column if missing
    from sqlalchemy import text as sa_text
    with db.engine.connect() as conn:
        cols = [row[1] for row in conn.execute(sa_text("PRAGMA table_info(product)"))]
        if "category" not in cols:
            conn.execute(sa_text("ALTER TABLE product ADD COLUMN category VARCHAR(100) DEFAULT 'Other'"))
            conn.commit()

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

        # upscale for better OCR accuracy
        img = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # denoise before thresholding
        gray = cv2.fastNlMeansDenoising(gray, h=30)

        # OTSU threshold works better than adaptive for most bill images
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # run OCR with both page segmentation modes and pick the longer result
        config_6  = r'--oem 3 --psm 6'
        config_4  = r'--oem 3 --psm 4'
        text6 = pytesseract.image_to_string(thresh, config=config_6)
        text4 = pytesseract.image_to_string(thresh, config=config_4)
        text = text6 if len(text6) >= len(text4) else text4

        return text

    except Exception as e:
        print("OCR ERROR:", e)
        return ""

# ---------------- TEXT PARSER ----------------
def clean_name(name):
    """Remove junk characters, keep only printable alphanumeric + common punctuation."""
    import unicodedata
    cleaned = ""
    for ch in name:
        cat = unicodedata.category(ch)
        # keep letters, numbers, spaces, hyphens, dots, slashes, parentheses
        if cat.startswith("L") or cat.startswith("N") or ch in " -./()+&":
            cleaned += ch
    cleaned = " ".join(cleaned.split())  # collapse whitespace
    return cleaned.strip()

def is_valid_name(line):
    """Return True if the line looks like a real product name."""
    if len(line) < 4 or len(line) > 80:
        return False
    # reject lines that are mostly digits
    digit_ratio = sum(c.isdigit() for c in line) / len(line)
    if digit_ratio > 0.4:
        return False
    # reject lines with too many special/garbage characters
    alpha_ratio = sum(c.isalpha() or c == " " for c in line) / len(line)
    if alpha_ratio < 0.5:
        return False
    return True

def parse_text(text):
    product_name = "Unknown Product"
    purchase_date = None
    warranty_days = 365

    lines = [l.strip() for l in text.split("\n") if l.strip()]

    ignore_words = [
        "invoice", "bill", "gst", "tax", "amount", "total", "payment",
        "cash", "upi", "customer", "date", "qty", "price", "rs",
        "receipt", "order", "serial", "model", "warranty", "card",
        "thank", "visit", "again", "phone", "email", "address",
        "shop", "store", "mart", "enterprise", "pvt", "ltd", "inc"
    ]

    for line in lines[:30]:
        cleaned = clean_name(line)
        lower = cleaned.lower()

        if any(word in lower for word in ignore_words):
            continue
        if not is_valid_name(cleaned):
            continue

        product_name = cleaned
        break

    date_pattern = r'(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})'

    for line in lines:
        match = re.search(date_pattern, line)
        if match:
            date_str = match.group(1)

            for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
                        "%d/%m/%y", "%d-%m-%y"):
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
        category=request.form.get("category", "Other"),
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
        "category": product.category or "Other",
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
    product.category = data.get("category", product.category or "Other")
    purchase_date_obj = datetime.strptime(
        data.get("purchase_date"), "%Y-%m-%d"
    ).date()

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

    file_path = os.path.join(basedir, "uploads", product.bill_image)
    if os.path.exists(file_path):
        os.remove(file_path)

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
            "category": p.category or "Other",
            "purchase_date": p.purchase_date.strftime("%Y-%m-%d"),
            "expiry_date": p.expiry_date.strftime("%Y-%m-%d"),
            "status": status,
            "days_remaining": days,
            "bill_url": f"/uploads/{p.bill_image}",
            "qr_url": f"/qrcodes/product_{p.id}.png"
        })

    return jsonify({"products": data})

# ---------------- PROFILE ----------------
@app.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"name": user.name, "email": user.email})

@app.route('/profile', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_profile():
    if request.method == "OPTIONS":
        return '', 200

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json()
    new_name = data.get("name", "").strip()
    new_password = data.get("new_password", "").strip()
    current_password = data.get("current_password", "").strip()

    if not new_name:
        return jsonify({"message": "Name cannot be empty"}), 400

    user.name = new_name

    if new_password:
        if not current_password:
            return jsonify({"message": "Current password required to set new password"}), 400
        if not check_password_hash(user.password, current_password):
            return jsonify({"message": "Current password is incorrect"}), 401
        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters"}), 400
        user.password = generate_password_hash(new_password)

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "name": user.name})

# ---------------- EXPORT CSV ----------------
@app.route('/export_csv', methods=['GET'])
@jwt_required()
def export_csv():
    import csv, io
    user_id = int(get_jwt_identity())
    products = Product.query.filter_by(user_id=user_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Product Name", "Category", "Purchase Date", "Expiry Date", "Warranty Days", "Status", "Days Remaining"])

    for p in products:
        status, days = calculate_status(p.expiry_date)
        writer.writerow([
            p.product_name,
            p.category or "Other",
            p.purchase_date.strftime("%Y-%m-%d"),
            p.expiry_date.strftime("%Y-%m-%d"),
            p.warranty_period,
            status,
            days
        ])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=warranties.csv"}
    )

# ---------------- SERVE FILES ----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(
        os.path.join(basedir, "uploads"),
        filename,
        as_attachment=True
    )

@app.route('/qrcodes/<filename>')
def qr_file(filename):
    return send_from_directory(
        os.path.join(basedir, "qrcodes"),
        filename,
        as_attachment=True
    )

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)