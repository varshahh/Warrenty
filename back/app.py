# ---------------- IMPORTS ----------------
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

from datetime import datetime, timedelta
import re
import qrcode
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
import google.genai as genai
from PIL import Image
from dateutil.relativedelta import relativedelta

# ---------------- CONFIG ----------------
app = Flask(__name__)
CORS(app, supports_credentials=True)
basedir = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"]        = f"sqlite:///{os.path.join(basedir, 'warranty.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"]                 = os.getenv("JWT_SECRET", "dev-secret-key")
app.config["MAIL_SERVER"]                    = "smtp.gmail.com"
app.config["MAIL_PORT"]                      = 587
app.config["MAIL_USE_TLS"]                   = True
app.config["MAIL_USERNAME"]                  = os.getenv("MAIL_USERNAME", "")
app.config["MAIL_PASSWORD"]                  = os.getenv("MAIL_PASSWORD", "")
app.config["MAIL_DEFAULT_SENDER"]            = os.getenv("MAIL_USERNAME", "")

db   = SQLAlchemy(app)
jwt  = JWTManager(app)
mail = Mail(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
os.makedirs(os.path.join(basedir, "uploads"), exist_ok=True)
os.makedirs(os.path.join(basedir, "qrcodes"), exist_ok=True)

# ---------------- DATABASE ----------------
class User(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    name     = db.Column(db.String(100))
    email    = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))

class Product(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    product_name    = db.Column(db.String(200))
    category        = db.Column(db.String(100), default="Other")
    purchase_date   = db.Column(db.Date)
    warranty_period = db.Column(db.String(50))
    expiry_date     = db.Column(db.Date)
    bill_image      = db.Column(db.String(200))
    user_id         = db.Column(db.Integer)

with app.app_context():
    db.create_all()
    from sqlalchemy import text as sa_text
    with db.engine.connect() as conn:
        cols = [row[1] for row in conn.execute(sa_text("PRAGMA table_info(product)"))]
        if "category" not in cols:
            conn.execute(sa_text("ALTER TABLE product ADD COLUMN category VARCHAR(100) DEFAULT 'Other'"))
            conn.commit()

# ---------------- HELPERS ----------------
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
    qrcode.make(url).save(qr_path)
    return f"/qrcodes/product_{product_id}.png"

def validate_product_data(data):
    if not data.get("product_name"):
        return "Product name required"
    try:
        if int(data.get("warranty_days", 0)) < 0:
            return "Invalid warranty"
    except Exception:
        return "Warranty must be number"
    return None

def categorize_product(product_name):
    name = product_name.lower()
    if any(k in name for k in ["ac", "air conditioner", "washing machine", "refrigerator",
                                "fridge", "microwave", "oven", "dishwasher", "geyser",
                                "water heater", "cooler", "fan", "iron", "vacuum",
                                "tv", "television", "heater"]):
        return "Appliances"
    if any(k in name for k in ["laptop", "notebook", "macbook", "chromebook", "thinkpad", "surface"]):
        return "Laptop"
    if any(k in name for k in ["phone", "mobile", "smartphone", "iphone", "oneplus",
                                "redmi", "realme", "oppo", "vivo", "nokia", "motorola", "pixel"]):
        return "Mobile"
    if any(k in name for k in ["camera", "headphone", "earphone", "speaker", "tablet",
                                "ipad", "smartwatch", "watch", "printer", "router",
                                "monitor", "keyboard", "mouse", "hard disk", "ssd"]):
        return "Electronics"
    return "Other"

# ---------------- GEMINI EXTRACTION ----------------
def gemini_extract(file_path):
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return None
        img = Image.open(file_path)
        client = genai.Client(api_key=api_key)
        prompt = """You are analyzing a warranty bill or invoice image.
Extract the following information and respond ONLY in this exact format, nothing else:

PRODUCT_NAME: <brand + product type, e.g. HP Laptop, Samsung Washing Machine, LG AC>
PURCHASE_DATE: <date in YYYY-MM-DD format, or UNKNOWN>
WARRANTY_PERIOD: <number and unit, e.g. 1 year, 2 years, 6 months, or UNKNOWN>

Rules:
- PRODUCT_NAME should be concise: brand name + product type only (2-4 words max)
- If brand is not visible, just use the product type (e.g. Laptop, Air Conditioner)
- PURCHASE_DATE must be the date of purchase/sale, not warranty start or expiry
- If any field cannot be determined, write UNKNOWN for that field"""
        response = client.models.generate_content(model="gemini-2.5-flash", contents=[prompt, img])
        return response.text.strip()
    except Exception as e:
        print("GEMINI ERROR:", e)
        return None

def parse_gemini_response(text):
    product_name   = None
    purchase_date  = None
    warranty_days  = 365
    warranty_match = None
    for line in text.strip().split("\n"):
        if line.startswith("PRODUCT_NAME:"):
            val = line.split(":", 1)[1].strip()
            if val and val.upper() != "UNKNOWN":
                product_name = val
        elif line.startswith("PURCHASE_DATE:"):
            val = line.split(":", 1)[1].strip()
            if val and val.upper() != "UNKNOWN":
                try:
                    dt = datetime.strptime(val, "%Y-%m-%d")
                    if 2000 <= dt.year <= datetime.today().year:
                        purchase_date = val
                except Exception:
                    pass
        elif line.startswith("WARRANTY_PERIOD:"):
            val = line.split(":", 1)[1].strip()
            if val and val.upper() != "UNKNOWN":
                m = re.search(r"(\d+)\s*(year|years|yr|yrs|month|months|day|days)", val, re.I)
                if m:
                    warranty_match = m
                    num  = int(m.group(1))
                    unit = m.group(2).lower()
                    if "year" in unit or "yr" in unit:
                        warranty_days = num * 365
                    elif "month" in unit:
                        warranty_days = num * 30
                    else:
                        warranty_days = num
    return product_name, purchase_date, warranty_days, warranty_match

# ---------------- AUTH ----------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"message": "User already exists"}), 400
    user = User(name=data.get("name"), email=data.get("email"),
                password=generate_password_hash(data.get("password")))
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"})

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get("email")).first()
    if not user:
        return jsonify({"message": "User not found"}), 404
    if not check_password_hash(user.password, data.get("password")):
        return jsonify({"message": "Invalid password"}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "name": user.name})

@app.route("/forgot-password", methods=["POST", "OPTIONS"])
def forgot_password():
    if request.method == "OPTIONS":
        return "", 200
    data         = request.get_json()
    email        = data.get("email", "").strip()
    new_password = data.get("new_password", "").strip()
    if not email or not new_password:
        return jsonify({"message": "Email and new password required"}), 400
    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "No account found with that email"}), 404
    user.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"})

# ---------------- UPLOAD ----------------
@app.route("/upload_bill", methods=["POST"])
@jwt_required()
def upload_bill():
    user_id = int(get_jwt_identity())
    if "bill" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    file     = request.files["bill"]
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secure_filename(file.filename)}"
    path     = os.path.join(basedir, "uploads", filename)
    file.save(path)

    gemini_raw = gemini_extract(path)
    if gemini_raw:
        product_name, purchase_date, warranty_days, warranty_match = parse_gemini_response(gemini_raw)
    else:
        product_name, purchase_date, warranty_days, warranty_match = None, None, 365, None

    if not product_name:
        product_name = "Unknown Product"
    if not purchase_date:
        purchase_date = datetime.today().strftime("%Y-%m-%d")

    purchase_date_obj = datetime.strptime(purchase_date, "%Y-%m-%d").date()
    if warranty_match:
        num  = int(warranty_match.group(1))
        unit = warranty_match.group(2).lower()
        if "year" in unit or "yr" in unit:
            expiry_date_obj = purchase_date_obj + relativedelta(years=num)
        elif "month" in unit:
            expiry_date_obj = purchase_date_obj + relativedelta(months=num)
        else:
            expiry_date_obj = purchase_date_obj + timedelta(days=num)
        warranty_days = (expiry_date_obj - purchase_date_obj).days
    else:
        expiry_date_obj = purchase_date_obj + timedelta(days=warranty_days)

    product = Product(
        product_name    = product_name,
        category        = request.form.get("category") or categorize_product(product_name),
        purchase_date   = purchase_date_obj,
        warranty_period = str(warranty_days),
        expiry_date     = expiry_date_obj,
        bill_image      = filename,
        user_id         = user_id
    )
    db.session.add(product)
    db.session.commit()
    qr = generate_qr(product.id)
    return jsonify({
        "product_id":    product.id,
        "product_name":  product.product_name,
        "purchase_date": product.purchase_date.strftime("%Y-%m-%d"),
        "expiry_date":   product.expiry_date.strftime("%Y-%m-%d"),
        "bill_url":      f"/uploads/{filename}",
        "qr_code":       qr
    })

# ---------------- GET PRODUCT ----------------
@app.route("/products/<int:id>", methods=["GET"])
@jwt_required()
def get_product(id):
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, id)
    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404
    status, days = calculate_status(product.expiry_date)
    return jsonify({
        "product_name":   product.product_name,
        "category":       product.category or "Other",
        "purchase_date":  product.purchase_date.strftime("%Y-%m-%d"),
        "warranty_days":  int(product.warranty_period),
        "expiry_date":    product.expiry_date.strftime("%Y-%m-%d"),
        "status":         status,
        "days_remaining": days,
        "bill_url":       f"/uploads/{product.bill_image}",
        "qr_url":         f"/qrcodes/product_{product.id}.png"
    })

# ---------------- EDIT ----------------
@app.route("/edit_product/<int:id>", methods=["PUT", "OPTIONS"])
@jwt_required()
def edit_product(id):
    if request.method == "OPTIONS":
        return "", 200
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, id)
    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404
    data  = request.get_json()
    error = validate_product_data(data)
    if error:
        return jsonify({"message": error}), 400
    product.product_name    = data.get("product_name")
    product.category        = data.get("category", product.category or "Other")
    purchase_date_obj       = datetime.strptime(data.get("purchase_date"), "%Y-%m-%d").date()
    warranty_days           = int(data.get("warranty_days"))
    product.purchase_date   = purchase_date_obj
    product.warranty_period = str(warranty_days)
    years, remaining = divmod(warranty_days, 365)
    if remaining == 0 and years > 0:
        product.expiry_date = purchase_date_obj + relativedelta(years=years)
    else:
        product.expiry_date = purchase_date_obj + timedelta(days=warranty_days)
    db.session.commit()
    return jsonify({"message": "Product updated successfully"})

# ---------------- DELETE ----------------
@app.route("/delete_product/<int:id>", methods=["DELETE", "OPTIONS"])
@jwt_required()
def delete_product(id):
    if request.method == "OPTIONS":
        return "", 200
    user_id = int(get_jwt_identity())
    product = db.session.get(Product, id)
    if not product or product.user_id != user_id:
        return jsonify({"message": "Product not found"}), 404
    for p in [os.path.join(basedir, "uploads", product.bill_image),
              os.path.join(basedir, "qrcodes", f"product_{product.id}.png")]:
        if os.path.exists(p):
            os.remove(p)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"})

# ---------------- DASHBOARD ----------------
@app.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    user_id  = int(get_jwt_identity())
    products = Product.query.filter_by(user_id=user_id).all()
    data = []
    for p in products:
        status, days = calculate_status(p.expiry_date)
        data.append({
            "product_id":     p.id,
            "product_name":   p.product_name,
            "category":       p.category or "Other",
            "purchase_date":  p.purchase_date.strftime("%Y-%m-%d"),
            "expiry_date":    p.expiry_date.strftime("%Y-%m-%d"),
            "status":         status,
            "days_remaining": days,
            "bill_url":       f"/uploads/{p.bill_image}",
            "qr_url":         f"/qrcodes/product_{p.id}.png"
        })
    return jsonify({"products": data})

# ---------------- PROFILE ----------------
@app.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user    = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"name": user.name, "email": user.email})

@app.route("/profile", methods=["PUT", "OPTIONS"])
@jwt_required()
def update_profile():
    if request.method == "OPTIONS":
        return "", 200
    user_id          = int(get_jwt_identity())
    user             = db.session.get(User, user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    data             = request.get_json()
    new_name         = data.get("name", "").strip()
    new_password     = data.get("new_password", "").strip()
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
@app.route("/export_csv", methods=["GET"])
@jwt_required()
def export_csv():
    import csv, io
    user_id  = int(get_jwt_identity())
    products = Product.query.filter_by(user_id=user_id).all()
    output   = io.StringIO()
    writer   = csv.writer(output)
    writer.writerow(["Product Name", "Category", "Purchase Date", "Expiry Date", "Warranty Days", "Status", "Days Remaining"])
    for p in products:
        status, days = calculate_status(p.expiry_date)
        writer.writerow([p.product_name, p.category or "Other",
                         p.purchase_date.strftime("%Y-%m-%d"),
                         p.expiry_date.strftime("%Y-%m-%d"),
                         p.warranty_period, status, days])
    return Response(output.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=warranties.csv"})

# ---------------- SERVE FILES ----------------
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(os.path.join(basedir, "uploads"), filename, as_attachment=True)

@app.route("/qrcodes/<filename>")
def qr_file(filename):
    return send_from_directory(os.path.join(basedir, "qrcodes"), filename, as_attachment=True)

# ---------------- EMAIL ALERTS ----------------
def send_expiry_alert(user_email, user_name, product_name, days_remaining, expiry_date):
    try:
        if not app.config["MAIL_USERNAME"]:
            return
        days_word = "day" if days_remaining == 1 else "days"
        subject   = f"Warning: Warranty Expiring in {days_remaining} {days_word} - {product_name}"
        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6a11cb,#2575fc);padding:24px;text-align:center;">
            <h2 style="color:white;margin:0;">Warranty Expiry Alert</h2>
          </div>
          <div style="padding:28px;background:#f8fafc;">
            <p style="font-size:16px;">Hi <strong>{user_name}</strong>,</p>
            <p style="font-size:15px;">Your warranty for <strong>{product_name}</strong> is expiring soon.</p>
            <div style="background:white;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #ef4444;">
              <p style="margin:0;font-size:14px;color:#64748b;">Expiry Date</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#ef4444;">{expiry_date}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#64748b;">{days_remaining} {days_word} remaining</p>
            </div>
          </div>
          <div style="padding:14px;text-align:center;background:#f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Smart Warranty Team</p>
          </div>
        </div>"""
        msg = Message(subject=subject, recipients=[user_email], html=html_body)
        mail.send(msg)
        print(f"Alert sent to {user_email} for {product_name} ({days_remaining}d left)")
    except Exception as e:
        print(f"MAIL ERROR: {e}")

def check_warranty_alerts():
    with app.app_context():
        today = datetime.today().date()
        for p in Product.query.all():
            days_left = (p.expiry_date - today).days
            if days_left in [5, 3, 1]:
                user = db.session.get(User, p.user_id)
                if user and user.email:
                    send_expiry_alert(user.email, user.name, p.product_name,
                                      days_left, p.expiry_date.strftime("%Y-%m-%d"))

scheduler = BackgroundScheduler()
scheduler.add_job(check_warranty_alerts, "cron", hour=9, minute=0)
scheduler.start()

@app.route("/test_alerts", methods=["GET"])
def test_alerts():
    check_warranty_alerts()
    return jsonify({"message": "Alert check triggered"})

@app.route("/set_expiry/<int:id>/<int:days>", methods=["GET"])
def set_expiry(id, days):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"message": "Not found"}), 404
    product.expiry_date = datetime.today().date() + timedelta(days=days)
    db.session.commit()
    return jsonify({"message": f"Expiry set to {product.expiry_date}"})

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
