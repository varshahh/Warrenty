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
import socket
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import smtplib
from email.mime.text import MIMEText
import re

# ---------------- APP CONFIG ----------------
app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'warranty.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-this'

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ---------------- CREATE FOLDERS ----------------
os.makedirs("qrcodes", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# ---------------- DATABASE TABLES ----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(100))
    purchase_date = db.Column(db.String(50))
    warranty_period = db.Column(db.String(50))
    expiry_date = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    last_alert_sent = db.Column(db.String(10), nullable=True)

# ---------------- CREATE DATABASE ----------------
with app.app_context():
    db.create_all()

# ---------------- HOME ----------------
@app.route('/')
def home():
    return "Smart Warranty Backend Running Successfully!"

# ---------------- REGISTER ----------------
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

    return jsonify({"message": "User registered successfully"}), 201

# ---------------- LOGIN ----------------
@app.route('/login', methods=['POST'])
def login():

    data = request.get_json()

    user = User.query.filter_by(email=data['email']).first()

    if user and check_password_hash(user.password, data['password']):

        token = create_access_token(identity=str(user.id))

        return jsonify({
            "message": "Login successful",
            "access_token": token
        })

    return jsonify({"message": "Invalid email or password"}), 401


# ---------------- OCR FUNCTION ----------------
def extract_text_from_bill(filepath):

    try:
        img = cv2.imread(filepath)

        img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        gray = cv2.GaussianBlur(gray, (5,5), 0)

        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

        text = pytesseract.image_to_string(thresh, config="--psm 6")

        print("\n=========== OCR TEXT ===========")
        print(text)
        print("================================\n")

        return text if text.strip() != "" else "No readable text found"

    except Exception as e:
        print("OCR ERROR:", e)
        return "OCR failed"


# ---------------- EXTRACT DETAILS ----------------
def extract_details_from_text(text):

    product_name = "Unknown Product"
    purchase_date = datetime.today().strftime("%Y-%m-%d")

    date_match = re.search(r'\d{1,2}\s\w+\s\d{4}', text)

    if date_match:
        try:
            purchase_date = datetime.strptime(
                date_match.group(),
                "%d %B %Y"
            ).strftime("%Y-%m-%d")
        except:
            pass

    lines = text.split("\n")

    for line in lines:

        if 6 < len(line) < 80:

            if "amazon" not in line.lower() and "order" not in line.lower():
                product_name = line.strip()
                break

    return product_name, purchase_date


# ---------------- QR GENERATION ----------------
def generate_qr(product_id):

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    # IMPORTANT: React frontend port
    frontend_url = f"http://{local_ip}:3001/product/{product_id}"

    path = f"qrcodes/product_{product_id}.png"

    qr = qrcode.make(frontend_url)

    qr.save(path)

    print("QR URL:", frontend_url)

    return f"/qrcodes/product_{product_id}.png"


# ---------------- ADD PRODUCT ----------------
@app.route('/add_product', methods=['POST'])
@jwt_required()
def add_product():

    user_id = int(get_jwt_identity())

    data = request.get_json()

    purchase_date = data['purchase_date']

    warranty_days = int(data['warranty_period_days'])

    purchase_dt = datetime.strptime(purchase_date, "%Y-%m-%d")

    expiry_dt = purchase_dt + timedelta(days=warranty_days)

    product = Product(
        product_name=data['product_name'],
        purchase_date=purchase_date,
        warranty_period=str(warranty_days) + " days",
        expiry_date=expiry_dt.strftime("%Y-%m-%d"),
        user_id=user_id
    )

    db.session.add(product)
    db.session.commit()

    qr = generate_qr(product.id)

    return jsonify({
        "message": "Product added successfully",
        "product_id": product.id,
        "qr_code": qr
    })


# ---------------- UPLOAD BILL ----------------
@app.route('/upload_bill', methods=['POST'])
@jwt_required()
def upload_bill():

    user_id = int(get_jwt_identity())

    if 'bill' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files['bill']

    if file.filename == "":
        return jsonify({"message": "No file selected"}), 400

    filename = secure_filename(file.filename)

    filepath = os.path.join("uploads", filename)

    file.save(filepath)

    text = extract_text_from_bill(filepath)

    product_name, purchase_date = extract_details_from_text(text)

    warranty_days = 365

    expiry_dt = datetime.strptime(
        purchase_date,
        "%Y-%m-%d"
    ) + timedelta(days=warranty_days)

    product = Product(
        product_name=product_name,
        purchase_date=purchase_date,
        warranty_period=str(warranty_days) + " days",
        expiry_date=expiry_dt.strftime("%Y-%m-%d"),
        user_id=user_id
    )

    db.session.add(product)
    db.session.commit()

    bill_filename = f"product_{product.id}_bill.png"

    os.rename(filepath, os.path.join("uploads", bill_filename))

    qr = generate_qr(product.id)

    return jsonify({
        "message": "Product created from bill successfully",
        "product_id": product.id,
        "product_name": product_name,
        "purchase_date": purchase_date,
        "qr_code": qr,
        "ocr_text": text,
        "bill_url": f"/uploads/{bill_filename}"
    })


# ---------------- STATUS ----------------
def calculate_status(expiry_date_str):

    today = datetime.today().date()

    expiry = datetime.strptime(
        expiry_date_str,
        "%Y-%m-%d"
    ).date()

    days_remaining = (expiry - today).days

    if days_remaining < 0:
        status = "Expired"
    elif days_remaining <= 5:
        status = "Expiring Soon"
    else:
        status = "Active"

    return status, days_remaining


# ---------------- DASHBOARD ----------------
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():

    user_id = int(get_jwt_identity())

    products = Product.query.filter_by(user_id=user_id).all()

    data = []

    for p in products:

        status, days_remaining = calculate_status(p.expiry_date)

        data.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "purchase_date": p.purchase_date,
            "expiry_date": p.expiry_date,
            "status": status,
            "days_remaining": days_remaining,
            "bill_url": f"/uploads/product_{p.id}_bill.png",
            "qr_url": f"/qrcodes/product_{p.id}.png"
        })

    return jsonify(data)


# ---------------- PUBLIC PRODUCT ----------------
@app.route('/product/<int:product_id>', methods=['GET'])
def get_product(product_id):

    product = Product.query.get(product_id)

    if not product:
        return jsonify({"message": "Product not found"}), 404

    status, days_remaining = calculate_status(product.expiry_date)

    return jsonify({
        "product_name": product.product_name,
        "purchase_date": product.purchase_date,
        "expiry_date": product.expiry_date,
        "status": status,
        "days_remaining": days_remaining,
        "bill_url": f"/uploads/product_{product.id}_bill.png"
    })


# ---------------- SERVE FILES ----------------
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)


@app.route('/qrcodes/<filename>')
def qr_file(filename):
    return send_from_directory('qrcodes', filename)


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)