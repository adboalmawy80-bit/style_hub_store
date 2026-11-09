-- STYLE HUB PRO — مخطط قاعدة البيانات (MySQL 8)
CREATE DATABASE IF NOT EXISTS style_hub_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE style_hub_pro;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(160) NOT NULL,
  name_en VARCHAR(160) NULL,
  description TEXT,
  description_en TEXT,
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2) NULL,
  tag VARCHAR(40) NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'tshirt',   -- شكل الرسم في الواجهة
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  reviews INT NOT NULL DEFAULT 0,
  image_url VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_active (is_active, category_id)
);

-- المتغيرات: لون + مقاس + مخزون
CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  color_name VARCHAR(40) NOT NULL,
  color_hex CHAR(7) NOT NULL,
  size VARCHAR(20) NOT NULL,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE KEY uq_variant (product_id, color_name, size),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(30) PRIMARY KEY,
  type ENUM('percent','fixed') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_subtotal DECIMAL(10,2) DEFAULT 0,
  expires_at DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shipping_zones (
  governorate VARCHAR(40) PRIMARY KEY,
  fee DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  country CHAR(2) NOT NULL DEFAULT 'EG',
  governorate VARCHAR(60) NOT NULL,
  city VARCHAR(80) NOT NULL,
  postal_code VARCHAR(20) NULL,
  address VARCHAR(255) NOT NULL,
  notes VARCHAR(255) NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(30) NULL,
  shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EGP',
  fx_rate DECIMAL(14,6) NOT NULL DEFAULT 1,
  total_egp DECIMAL(12,2) NULL,
  stripe_session_id VARCHAR(255) NULL,
  payment_method ENUM('cod','card') NOT NULL DEFAULT 'cod',
  payment_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  status ENUM('new','prep','ship','done','cancel') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (coupon_code) REFERENCES coupons(code)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  name VARCHAR(160) NOT NULL,       -- نسخة وقت الشراء
  color_name VARCHAR(40), size VARCHAR(20),
  qty INT NOT NULL CHECK (qty > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- الدول: rate = كم وحدة من عملة الدولة مقابل ١ جنيه مصري (أسعار المنتجات الأساسية بالجنيه). عدّلها من لوحة الإدارة.
CREATE TABLE IF NOT EXISTS countries (
  code CHAR(2) PRIMARY KEY,
  name_ar VARCHAR(60) NOT NULL,
  name_en VARCHAR(60) NOT NULL,
  currency CHAR(3) NOT NULL,
  rate DECIMAL(14,6) NOT NULL,
  ship_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  free_from DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- صور المنتجات تُخزَّن في القاعدة نفسها (لا حاجة لتخزين ملفات خارجي)
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  mime VARCHAR(30) NOT NULL,
  data MEDIUMBLOB NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_img_product (product_id, sort),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT IGNORE INTO categories (slug, name) VALUES ('men','رجالي'),('women','حريمي'),('acc','إكسسوارات');
INSERT IGNORE INTO coupons (code,type,value) VALUES ('STYLE10','percent',10),('WELCOME50','fixed',50);
INSERT IGNORE INTO shipping_zones (governorate, fee) VALUES
('القاهرة',55),('الجيزة',55),('القليوبية',65),('الإسكندرية',70),('الدقهلية',75),('الشرقية',75),('الغربية',75),('المنوفية',75),
('البحيرة',80),('الإسماعيلية',80),('بورسعيد',80),('السويس',80),('دمياط',80),('كفر الشيخ',80),('الفيوم',85),('بني سويف',85),
('المنيا',95),('أسيوط',100),('سوهاج',105),('قنا',110),('الأقصر',115),('أسوان',120),('البحر الأحمر',130),('مطروح',130),
('جنوب سيناء',140),('شمال سيناء',140),('الوادي الجديد',150);
