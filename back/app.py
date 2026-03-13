# ---------------- IMPORTS ----------------
import cv2
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import qrcode
from datetime import datetime, timedelta
import os
import re
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from PIL import Image
import numpy as np

# ---------------- APP CONFIG ----------------
app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'warranty.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key'

# EMAIL CONFIG
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USERNAME'] = 'youremail@gmail.com'
app.config['MAIL_PASSWORD'] = 'your_app_password'
app.config['MAIL_USE_TLS'] = True

mail = Mail(app)
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
    products = db.relationship("Product", backref="user", lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200))
    purchase_date = db.Column(db.String(50))
    warranty_period = db.Column(db.String(50))
    expiry_date = db.Column(db.String(50))
    bill_image = db.Column(db.String(200))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

with app.app_context():
    db.create_all()

# ---------------- STATUS ----------------
def calculate_status(expiry_date):
    try:
        today = datetime.today().date()
        expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        days_remaining = (expiry - today).days

        if days_remaining < 0:
            status = "Expired"
        elif days_remaining <= 30:
            status = "Expiring Soon"
        else:
            status = "Active"

        return status, max(days_remaining, 0)
    except Exception as e:
        print("Error in calculate_status:", e)
        return "Unknown", 0

# ---------------- QR ----------------
def generate_qr(product_id):
    frontend_ip = "127.0.0.1:3000"  # React frontend
    url = f"http://{frontend_ip}/product/qr/{product_id}"  # Points to frontend
    qr_path = os.path.join(basedir, "qrcodes", f"product_{product_id}.png")
    img = qrcode.make(url)
    img.save(qr_path)
    return f"/qrcodes/product_{product_id}.png"

# ---------------- EMAIL REMINDER ----------------
def send_expiry_email(user_email, product_name, days):
    msg = Message(
        "Warranty Expiring Soon",
        sender="youremail@gmail.com",
        recipients=[user_email]
    )
    msg.body = f"""
Hello,

Your warranty for "{product_name}" will expire in {days} days.

Please check your warranty details.

Smart Warranty System
"""
    mail.send(msg)

def check_warranties():
    with app.app_context():
        products = Product.query.all()
        for product in products:
            status, days = calculate_status(product.expiry_date)
            if days == 7:
                user = User.query.get(product.user_id)
                if user:
                    send_expiry_email(user.email, product.product_name, days)

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_warranties, trigger="interval", hours=24)
scheduler.start()

# ---------------- AUTH ----------------
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 400
    user = User(
        name=data['name'],
        email=data['email'],
        password=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Registered successfully"})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        token = create_access_token(identity=str(user.id))
        return jsonify({"access_token": token})
    return jsonify({"message": "Invalid credentials"}), 401

# ---------------- UPLOAD BILL ----------------
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ocr_extract(file_path):
    try:
        img = Image.open(file_path).convert('L')
        img = img.resize((img.width*2, img.height*2))
        img_np = np.array(img)
        img_np = cv2.adaptiveThreshold(img_np, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, 11, 2)
        text = pytesseract.image_to_string(img_np)
        print("OCR Text Extracted:\n", text)
        return text
    except Exception as e:
        print("OCR extraction error:", e)
        return ""

def parse_text(text):
    product_name = "Unknown Product"
    purchase_date = datetime.today().strftime("%Y-%m-%d")
    warranty_days = 365
    for line in text.split('\n'):
        line_clean = line.strip()
        # Product Name
        if re.search(r'product', line_clean, re.IGNORECASE):
            product_name = re.sub(r'product[:\s]*', '', line_clean, flags=re.IGNORECASE).strip()
        # Purchase Date
        date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4})', line_clean)
        if date_match:
            date_str = date_match.group(1)
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                try:
                    dt = datetime.strptime(date_str, fmt)
                    purchase_date = dt.strftime("%Y-%m-%d")
                    break
                except:
                    continue
        # Warranty Period
        warranty_match = re.search(r'(\d+)\s*(days|month|months|year|years)', line_clean, re.IGNORECASE)
        if warranty_match:
            num = int(warranty_match.group(1))
            unit = warranty_match.group(2).lower()
            if 'month' in unit:
                warranty_days = num * 30
            elif 'year' in unit:
                warranty_days = num * 365
            else:
                warranty_days = num
    print("Parsed:", product_name, purchase_date, warranty_days)
    return product_name, purchase_date, warranty_days

@app.route('/upload_bill', methods=['POST'])
@jwt_required()
def upload_bill():
    user_id = int(get_jwt_identity())
    if 'bill' not in request.files:
        return jsonify({"message": "No file part"}), 400
    file = request.files['bill']
    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400
    if not allowed_file(file.filename):
        return jsonify({"message": "File type not allowed"}), 400

    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(file.filename)}"
    path = os.path.join(basedir, "uploads", filename)
    file.save(path)

    text = ocr_extract(path)
    product_name, purchase_date, warranty_days = parse_text(text)
    expiry = (datetime.strptime(purchase_date, "%Y-%m-%d") + timedelta(days=warranty_days)).strftime("%Y-%m-%d")

    product = Product(
        product_name=product_name,
        purchase_date=purchase_date,
        warranty_period=str(warranty_days),
        expiry_date=expiry,
        bill_image=filename,
        user_id=user_id
    )
    db.session.add(product)
    db.session.commit()
    qr = generate_qr(product.id)

    return jsonify({
        "message": "✅ Bill uploaded",
        "product_id": product.id,
        "product_name": product.product_name,
        "purchase_date": product.purchase_date,
        "warranty_days": product.warranty_period,
        "expiry_date": product.expiry_date,
        "qr_code": qr,
        "bill_url": f"/uploads/{filename}"
    })

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
            "purchase_date": p.purchase_date,
            "expiry_date": p.expiry_date,
            "status": status,
            "days_remaining": days,
            "bill_url": f"/uploads/{p.bill_image}",
            "qr_url": f"/qrcodes/product_{p.id}.png"
        })
    return jsonify({"products": data})

# ---------------- PRODUCT DETAILS ----------------
@app.route('/products/<int:id>', methods=['GET'])
def get_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    status, days = calculate_status(product.expiry_date)
    return jsonify({
        "id": product.id,
        "name": product.product_name,
        "purchase_date": product.purchase_date,
        "expiry_date": product.expiry_date,
        "status": status,
        "days_remaining": days,
        "bill_url": f"/uploads/{product.bill_image}",
        "qr_url": f"/qrcodes/product_{product.id}.png"
    })

@app.route('/product/qr/<int:product_id>', methods=['GET'])
def get_product_by_qr(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404
    status, days = calculate_status(product.expiry_date)
    return jsonify({
        "id": product.id,
        "name": product.product_name,
        "purchase_date": product.purchase_date,
        "expiry_date": product.expiry_date,
        "status": status,
        "days_remaining": days,
        "bill_url": f"/uploads/{product.bill_image}",
        "qr_url": f"/qrcodes/product_{product.id}.png"
    })

# ---------------- DELETE PRODUCT ----------------
@app.route('/delete_product/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_product(id):
    user_id = int(get_jwt_identity())
    product = Product.query.get(id)
    if not product:
        return jsonify({"message": "Not found"}), 404
    if product.user_id != user_id:
        return jsonify({"message": "Unauthorized"}), 403
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Deleted"})

# ---------------- SERVE FILES ----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(os.path.join(basedir, "uploads"), filename)

@app.route('/qrcodes/<filename>')
def qr_file(filename):
    return send_from_directory(os.path.join(basedir, "qrcodes"), filename)

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)