const { ZodError } = require('zod');
/* يمرّر الأخطاء غير المتزامنة إلى معالج الأخطاء */
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const validate = schema => (req, _res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return next(r.error);
  req.body = r.data; next();
};
function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0].message, field: err.issues[0].path.join('.') });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'القيمة موجودة بالفعل.' });
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ في الخادم. حاول مرة أخرى.' });
}
module.exports = { wrap, validate, HttpError, errorHandler };
