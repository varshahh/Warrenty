# ---------------- IMPORTS ----------------
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import qrcode
from datetime import datetime, timedelta
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import cv2
import smtplib
from email.mime.text import MIMEText

# ---------------- APP CONFIG ----------------
app = Flask(__name__)
CORS(app)

# Database config
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
    last_alert_sent = db.Column(db.String(10), nullable=True)  # YYYY-MM-DD

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
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5,5),0)
        thresh = cv2.threshold(gray, 0, 255,
                               cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        text = pytesseract.image_to_string(thresh)
        return text if text.strip() != "" else "No readable text found"
    except Exception as e:
        print("OCR ERROR:", e)
        return "OCR failed"

# ---------------- QR FUNCTION ----------------
def generate_qr(product_id):
    # QR points to frontend React route
    frontend_url = f"http://127.0.0.1:3000/product/{product_id}"  # Replace with your frontend domain when deployed
    path = f"qrcodes/product_{product_id}.png"
    qr = qrcode.make(frontend_url)
    qr.save(path)
    return path

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

    purchase_date = datetime.today().strftime("%Y-%m-%d")
    warranty_days = 365
    expiry_dt = datetime.today() + timedelta(days=warranty_days)

    product = Product(
        product_name="Uploaded Product",
        purchase_date=purchase_date,
        warranty_period=str(warranty_days) + " days",
        expiry_date=expiry_dt.strftime("%Y-%m-%d"),
        user_id=user_id
    )
    db.session.add(product)
    db.session.commit()

    # Rename uploaded bill to predictable filename
    bill_filename = f"product_{product.id}_bill.png"
    os.rename(filepath, os.path.join("uploads", bill_filename))

    qr = generate_qr(product.id)

    return jsonify({
        "message": "Product created from bill successfully",
        "product_id": product.id,
        "qr_code": qr,
        "ocr_text": text,
        "bill_url": f"/uploads/{bill_filename}"
    })

# ---------------- DASHBOARD API ----------------
@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user_id = int(get_jwt_identity())
    products = Product.query.filter_by(user_id=user_id).all()
    data = []
    for p in products:
        today = datetime.today().date()
        expiry = datetime.strptime(p.expiry_date, "%Y-%m-%d").date()
        days_remaining = (expiry - today).days
        if days_remaining < 0:
            status = "Expired"
        elif days_remaining <= 5:
            status = "Expiring Soon"
        else:
            status = "Active"

        bill_url = f"/uploads/product_{p.id}_bill.png"
        qr_url = f"/qrcodes/product_{p.id}.png"

        data.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "purchase_date": p.purchase_date,
            "expiry_date": p.expiry_date,
            "days_remaining": days_remaining,
            "status": status,
            "bill_url": bill_url,
            "qr_url": qr_url
        })
    return jsonify(data)

# ---------------- GET PRODUCT DETAILS (for QR scan) ----------------
@app.route('/product/<int:product_id>', methods=['GET'])
@jwt_required(optional=True)
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found"}), 404

    today = datetime.today().date()
    expiry = datetime.strptime(product.expiry_date, "%Y-%m-%d").date()
    days_remaining = (expiry - today).days

    if days_remaining < 0:
        status = "Expired"
    elif days_remaining <= 5:
        status = "Expiring Soon"
    else:
        status = "Active"

    bill_url = f"/uploads/product_{product.id}_bill.png"
    qr_url = f"/qrcodes/product_{product.id}.png"

    return jsonify({
        "product_id": product.id,
        "product_name": product.product_name,
        "purchase_date": product.purchase_date,
        "expiry_date": product.expiry_date,
        "days_remaining": days_remaining,
        "status": status,
        "bill_url": bill_url,
        "qr_url": qr_url
    })

# ---------------- EMAIL FUNCTION ----------------
def send_email(to_email, subject, body):
    sender_email = "vsreekutty123@gmail.com"
    sender_password = "bttuwkagaejkohza"

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email

    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.login(sender_email, sender_password)
    server.send_message(msg)
    server.quit()
    print(f"Email sent to {to_email}")

# ---------------- WARRANTY CHECK ----------------
def check_warranty():
    today_str = datetime.today().strftime("%Y-%m-%d")
    with app.app_context():
        products = Product.query.all()
        for p in products:
            expiry = datetime.strptime(p.expiry_date, "%Y-%m-%d").date()
            days = (expiry - datetime.today().date()).days
            if days in [5, 3, 1, 0] and p.last_alert_sent != today_str:
                user = db.session.get(User, p.user_id)
                subject = f"Warranty Expiry Reminder: {p.product_name}"
                body = f"Hi {user.name},\n\nYour product '{p.product_name}' will expire in {days} days ({p.expiry_date}).\n\nPlease take necessary action."
                send_email(user.email, subject, body)
                p.last_alert_sent = today_str
                db.session.commit()

# ---------------- DEMO USER & PRODUCT ----------------
with app.app_context():
    demo_user = User.query.filter_by(email="vsreekutty123@gmail.com").first()
    if not demo_user:
        demo_user = User(
            name="Demo User",
            email="vsreekutty123@gmail.com",
            password=generate_password_hash("123456")
        )
        db.session.add(demo_user)
        db.session.commit()

    demo_product = Product.query.filter_by(user_id=demo_user.id, product_name="Demo Product").first()
    if not demo_product:
        demo_product = Product(
            product_name="Demo Product",
            purchase_date=datetime.today().strftime("%Y-%m-%d"),
            warranty_period="3 days",
            expiry_date=(datetime.today() + timedelta(days=1)).strftime("%Y-%m-%d"),
            user_id=demo_user.id
        )
        db.session.add(demo_product)
        db.session.commit()

# ---------------- SCHEDULER ----------------
scheduler = BackgroundScheduler()
scheduler.add_job(check_warranty, CronTrigger(hour=9, minute=0))
scheduler.start()

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)