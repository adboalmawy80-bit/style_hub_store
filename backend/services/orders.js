/* عمليات الطلب المشتركة بين الدفع والـ webhook والمكنسة وحالة الإدارة */
const db = require('../config/db');
const stripe = require('./stripe');

const tx = async fn => {
  const conn = await db.getConnection();
  try { await conn.beginTransaction(); const r = await fn(conn); await conn.commit(); return r; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
};
const restoreStock = (conn, orderId) =>
  conn.query('UPDATE product_variants v JOIN order_items i ON i.variant_id = v.id SET v.stock = v.stock + i.qty WHERE i.order_id = ?', [orderId]);

/* إلغاء طلب بطاقة لم يُدفع (أو فشل دفعه) وإرجاع المخزون. آمن للتكرار. */
async function cancelUnpaid(orderId, paymentStatus = 'failed') {
  return tx(async conn => {
    const [[o]] = await conn.query('SELECT id,status,payment_status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!o || o.payment_status === 'paid' || o.status === 'cancel') return false;
    await restoreStock(conn, o.id);
    await conn.query("UPDATE orders SET status = 'cancel', payment_status = ? WHERE id = ?", [paymentStatus, o.id]);
    return true;
  });
}

/* تأكيد الدفع. لو كان الطلب أُلغي قبل وصول الدفع (تأخر webhook) نحاول إعادة حجز المخزون،
   وإن لم يكفِ نُبقيه ملغيًا ونكتب تنبيه استرداد في السجل. */
async function markPaid(orderId) {
  return tx(async conn => {
    const [[o]] = await conn.query('SELECT id,ref,status,payment_status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!o || o.payment_status === 'paid') return o || null;
    if (o.status === 'cancel') {
      const [items] = await conn.query('SELECT variant_id, qty FROM order_items WHERE order_id = ? ORDER BY variant_id', [o.id]);
      let enough = true;
      for (const i of items) {
        const [[v]] = await conn.query('SELECT stock FROM product_variants WHERE id = ? FOR UPDATE', [i.variant_id]);
        if (!v || v.stock < i.qty) enough = false;
      }
      if (enough) {
        for (const i of items) await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [i.qty, i.variant_id]);
        await conn.query("UPDATE orders SET payment_status = 'paid', status = 'new' WHERE id = ?", [o.id]);
      } else {
        await conn.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [o.id]);
        console.error(`[stripe] الطلب ${o.ref} دُفع بعد إلغائه والمخزون لا يكفي — استرد المبلغ يدويًا من لوحة Stripe.`);
      }
    } else await conn.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [o.id]);
    return o;
  });
}

const bySession = async sid => (await db.query('SELECT * FROM orders WHERE stripe_session_id = ?', [sid]))[0][0] || null;

/* مكنسة: طلبات البطاقة غير المدفوعة بعد ٤٥ دقيقة. نسأل Stripe أولًا (لو الـ webhook تأخر)، ثم نلغي ونرجع المخزون */
async function sweepUnpaid() {
  const [rows] = await db.query("SELECT id, stripe_session_id FROM orders WHERE payment_method='card' AND payment_status='pending' AND status='new' AND created_at < (NOW() - INTERVAL 45 MINUTE) LIMIT 100");
  for (const o of rows) {
    try {
      if (stripe.enabled && o.stripe_session_id) {
        const s = await stripe.get().checkout.sessions.retrieve(o.stripe_session_id);
        if (s.payment_status === 'paid') { await markPaid(o.id); continue; }
      }
      await cancelUnpaid(o.id);
    } catch (e) { console.error('[sweeper] ' + o.id + ': ' + e.message); }
  }
  return rows.length;
}
module.exports = { tx, restoreStock, cancelUnpaid, markPaid, bySession, sweepUnpaid };
