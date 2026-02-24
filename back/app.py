# ---------------- IMPORTS ----------------
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import qrcode
from datetime import datetime, timedelta
import os
from apscheduler.schedulers.background import BackgroundScheduler

# ---------------- APP CONFIG ----------------
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///warranty.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ---------------- CREATE QR FOLDER ----------------
if not os.path.exists("qrcodes"):
    os.makedirs("qrcodes")

# ---------------- DATABASE TABLES ----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(100), nullable=False)
    purchase_date = db.Column(db.String(50), nullable=False)
    warranty_period = db.Column(db.String(50), nullable=False)
    expiry_date = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

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

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    new_user = User(name=name, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

# ---------------- LOGIN ----------------
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email, password=password).first()

    if user:
        return jsonify({
            "message": "Login successful",
            "user_id": user.id
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

# ---------------- ADD PRODUCT ----------------
@app.route('/add_product', methods=['POST'])
def add_product():
    data = request.get_json()

    user_id = data.get('user_id')
    product_name = data.get('product_name')
    purchase_date = data.get('purchase_date')
    warranty_days = int(data.get('warranty_period_days'))

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    purchase_dt = datetime.strptime(purchase_date, '%Y-%m-%d')
    expiry_dt = purchase_dt + timedelta(days=warranty_days)
    expiry_date = expiry_dt.strftime('%Y-%m-%d')

    new_product = Product(
        product_name=product_name,
        purchase_date=purchase_date,
        warranty_period=str(warranty_days) + " days",
        expiry_date=expiry_date,
        user_id=user_id
    )

    db.session.add(new_product)
    db.session.commit()

    # Generate QR
    qr_file = f"qrcodes/product_{new_product.id}.png"
    qr = qrcode.QRCode(box_size=10, border=4)
    qr.add_data(f"{new_product.id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(qr_file)

    return jsonify({
        "message": "Product added successfully",
        "product_id": new_product.id,
        "qr_code": qr_file
    }), 201

# ---------------- DASHBOARD (USER-WISE) ----------------
@app.route('/dashboard/<int:user_id>', methods=['GET'])
def dashboard(user_id):

    user_products = Product.query.filter_by(user_id=user_id).all()

    dashboard_data = []

    for p in user_products:
        today = datetime.today().date()
        expiry = datetime.strptime(p.expiry_date, '%Y-%m-%d').date()
        days_remaining = (expiry - today).days

        if days_remaining < 0:
            status = "Expired 🔴"
        elif days_remaining <= 5:
            status = "Expiring Soon 🟡"
        else:
            status = "Active 🟢"

        dashboard_data.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "purchase_date": p.purchase_date,
            "expiry_date": p.expiry_date,
            "days_remaining": days_remaining,
            "status": status,
            "qr_code_file": f"qrcodes/product_{p.id}.png"
        })

    return jsonify(dashboard_data), 200

# ---------------- QR PRODUCT FETCH ----------------
@app.route('/product/<int:product_id>', methods=['GET'])
def get_product(product_id):

    product = Product.query.get(product_id)

    if not product:
        return jsonify({"message": "Product not found"}), 404

    today = datetime.today().date()
    expiry = datetime.strptime(product.expiry_date, '%Y-%m-%d').date()
    days_remaining = (expiry - today).days

    if days_remaining < 0:
        status = "Expired 🔴"
    elif days_remaining <= 5:
        status = "Expiring Soon 🟡"
    else:
        status = "Active 🟢"

    return jsonify({
        "product_id": product.id,
        "product_name": product.product_name,
        "purchase_date": product.purchase_date,
        "expiry_date": product.expiry_date,
        "days_remaining": days_remaining,
        "status": status
    }), 200

# ---------------- WARRANTY ALERT FUNCTION ----------------
def check_warranty_expiry():
    with app.app_context():
        products = Product.query.all()
        today = datetime.today().date()

        for p in products:
            expiry = datetime.strptime(p.expiry_date, '%Y-%m-%d').date()
            days_left = (expiry - today).days

            if days_left == 5:
                user = User.query.get(p.user_id)
                print(f"ALERT: {user.name}, your product '{p.product_name}' warranty expires in 5 days!")

# ---------------- START SCHEDULER ----------------
scheduler = BackgroundScheduler()
scheduler.add_job(func=check_warranty_expiry, trigger="interval", days=1)
scheduler.start()

# ---------------- RUN SERVER ----------------
if __name__ == '__main__':
    app.run(debug=True)
    