const db = require('../config/db');

/* يُرجع المنتجات بنفس شكل data.js في الواجهة: colors / sizes / stock مجمّعة من المتغيرات */
async function load({ where = '', params = [], order = 'p.id DESC', includeInactive = false } = {}) {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.name_en, p.description_en AS desc_en, p.description AS \`desc\`, p.price, p.old_price AS \`old\`, p.tag, p.type, p.rating, p.reviews, p.is_active, c.slug AS cat
       FROM products p JOIN categories c ON c.id = p.category_id
      WHERE ${includeInactive ? '1=1' : 'p.is_active = 1'} ${where} ORDER BY ${order}`, params);
  if (!rows.length) return [];
  const [vars] = await db.query('SELECT product_id, color_name, color_hex, size, stock FROM product_variants WHERE product_id IN (?)', [rows.map(r => r.id)]);
  const [imgs] = await db.query('SELECT id, product_id FROM product_images WHERE product_id IN (?) ORDER BY sort, id', [rows.map(r => r.id)]);
  const im = {};
  imgs.forEach(i => (im[i.product_id] = im[i.product_id] || []).push(i.id));
  const by = {};
  vars.forEach(v => (by[v.product_id] = by[v.product_id] || []).push(v));
  return rows.map(r => {
    const vs = by[r.id] || [], colors = [], sizes = [];
    vs.forEach(v => {
      if (!colors.some(c => c.n === v.color_name)) colors.push({ n: v.color_name, hex: v.color_hex });
      if (!sizes.includes(v.size)) sizes.push(v.size);
    });
    return { ...r, old: r.old || null, imageIds: im[r.id] || [], images: (im[r.id] || []).map(id => '/api/images/' + id), colors, sizes, stock: vs.reduce((s, v) => s + v.stock, 0), variants: vs.map(v => ({ color: v.color_name, size: v.size, stock: v.stock })) };
  });
}
module.exports = { load };
