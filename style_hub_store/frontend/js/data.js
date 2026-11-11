/* STYLE HUB PRO — بيانات تجريبية (تُستبدل لاحقًا بـ API) */
const CATEGORIES = [
  { id: 'men',   name: 'رجالي',   blurb: 'تيشيرتات، هوديز، جينز وجاكيتات' },
  { id: 'women', name: 'حريمي',   blurb: 'فساتين، بلوزات وجاكيتات خفيفة' },
  { id: 'acc',   name: 'إكسسوارات', blurb: 'كابات وشنط يومية' }
];

const C = (n, hex) => ({ n, hex });
const PRODUCTS = [
  { id: 1,  name: 'تيشيرت قطن أوفر سايز',   cat: 'men',   type: 'tshirt', price: 349,  old: 449,  colors: [C('أبيض','#F4F4F2'),C('أسود','#1B1B1F'),C('أزرق دنيم','#3E6AA8')], sizes: ['S','M','L','XL','XXL'], rating: 4.7, reviews: 128, tag: 'الأكثر طلبًا', stock: 42, desc: 'قطن مصري 100% بوزن 220 جرام، قصّة واسعة مريحة وياقة مقوّاة لا تتمدد بعد الغسيل.' },
  { id: 2,  name: 'هودي فليس بسوستة',        cat: 'men',   type: 'hoodie', price: 899,  old: null, colors: [C('رمادي','#8A93A3'),C('كحلي','#1E2B4D'),C('زيتي','#59603F')], sizes: ['M','L','XL','XXL'], rating: 4.8, reviews: 96, tag: 'جديد', stock: 25, desc: 'فليس داخلي ناعم، جيبان جانبيان وسوستة معدنية. مناسب لشتاء القاهرة والسفر.' },
  { id: 3,  name: 'بنطلون جينز سلِم',         cat: 'men',   type: 'jeans',  price: 749,  old: 899,  colors: [C('أزرق غامق','#27406B'),C('أزرق فاتح','#6F93C4'),C('أسود','#202228')], sizes: ['30','32','34','36','38'], rating: 4.5, reviews: 211, tag: 'خصم 17%', stock: 60, desc: 'جينز استرتش بنسبة 2% إيلاستين، خصر متوسط وقصّة سلِم تناسب أغلب الأجسام.' },
  { id: 4,  name: 'جاكيت دنيم كلاسيك',        cat: 'men',   type: 'jacket', price: 1199, old: null, colors: [C('دنيم','#4B6FA5'),C('أسود','#25262B')], sizes: ['M','L','XL'], rating: 4.6, reviews: 54, tag: null, stock: 14, desc: 'دنيم ثقيل بغسلة ناعمة، أزرار معدنية وجيوب صدر. يلبس فوق التيشيرت أو الهودي.' },
  { id: 5,  name: 'قميص كتان بأكمام طويلة',   cat: 'men',   type: 'shirt',  price: 579,  old: null, colors: [C('أبيض','#F2F1EC'),C('رملي','#CDBB98'),C('أخضر زيتي','#6A7452')], sizes: ['S','M','L','XL'], rating: 4.4, reviews: 38, tag: 'صيفي', stock: 33, desc: 'كتان مخلوط خفيف يسمح بالتهوية في الحر، ويُكوى بسهولة.' },
  { id: 6,  name: 'فستان ميدي بخصر مرن',       cat: 'women', type: 'dress',  price: 849,  old: 1049, colors: [C('عنابي','#7A2236'),C('أخضر زجاجي','#2F6B5E'),C('أسود','#1D1D22')], sizes: ['S','M','L','XL'], rating: 4.9, reviews: 142, tag: 'خصم 19%', stock: 18, desc: 'قماش كريب منساب، أكمام ثلاثة أرباع وطول يغطي الركبة. يصلح للعمل والمناسبات.' },
  { id: 7,  name: 'تيشيرت كروب قطن',          cat: 'women', type: 'tshirt', price: 299,  old: null, colors: [C('وردي مطفي','#D99AA5'),C('أبيض','#F4F4F2'),C('بنفسجي','#7F6AB0')], sizes: ['S','M','L'], rating: 4.3, reviews: 77, tag: null, stock: 50, desc: 'قصّة قصيرة بقطن ربع ليكرا. تناسب الجينز عالي الخصر.' },
  { id: 8,  name: 'هودي أوفر سايز حريمي',     cat: 'women', type: 'hoodie', price: 799,  old: null, colors: [C('بيج','#C9B7A0'),C('لافندر','#A99BCB'),C('رمادي','#8A93A3')], sizes: ['S','M','L','XL'], rating: 4.7, reviews: 89, tag: 'جديد', stock: 31, desc: 'قصّة واسعة وقماش ثقيل من الداخل ناعم. مريح للبيت والخروج.' },
  { id: 9,  name: 'جينز مام فيت',              cat: 'women', type: 'jeans',  price: 699,  old: 829,  colors: [C('أزرق فاتح','#7FA1CF'),C('أزرق','#355E9B')], sizes: ['26','28','30','32','34'], rating: 4.6, reviews: 164, tag: 'خصم 16%', stock: 40, desc: 'خصر عالٍ وقصّة مستقيمة مريحة عند الفخذ، دنيم متين لا يفقد لونه بسرعة.' },
  { id: 10, name: 'جاكيت بومبر خفيف',          cat: 'women', type: 'jacket', price: 1099, old: null, colors: [C('زيتي','#5B6544'),C('أسود','#25262B'),C('وردي','#CE8D98')], sizes: ['S','M','L'], rating: 4.5, reviews: 41, tag: null, stock: 9, desc: 'مقاوم للرياح الخفيفة، بطانة ناعمة وسوستة أمامية. مناسب لبداية الشتاء.' },
  { id: 11, name: 'فستان صيفي بحمّالات',       cat: 'women', type: 'dress',  price: 649,  old: null, colors: [C('أصفر','#E6B947'),C('أبيض','#F4F4F2'),C('تركواز','#3A9AA0')], sizes: ['S','M','L'], rating: 4.4, reviews: 59, tag: 'صيفي', stock: 22, desc: 'قماش قطن خفيف مبطّن بالكامل، يتحمّل حرارة الساحل.' },
  { id: 12, name: 'كاب قطن مطرّز',             cat: 'acc',   type: 'cap',    price: 199,  old: null, colors: [C('أسود','#1B1B1F'),C('كحلي','#1E2B4D'),C('بيج','#C9B7A0')], sizes: ['مقاس واحد'], rating: 4.2, reviews: 73, tag: null, stock: 80, desc: 'قطن كانفاس، حزام خلفي قابل للضبط وتطريز شعار STYLE HUB.' },
  { id: 13, name: 'شنطة كروس يومية',           cat: 'acc',   type: 'bag',    price: 449,  old: 549,  colors: [C('أسود','#202127'),C('بني','#7B5238'),C('كحلي','#27385E')], sizes: ['مقاس واحد'], rating: 4.5, reviews: 47, tag: 'خصم 18%', stock: 27, desc: 'جلد صناعي مقاوم للخدش، ثلاثة جيوب داخلية وحزام قابل للتعديل.' },
  { id: 14, name: 'تيشيرت بولو بيكيه',         cat: 'men',   type: 'shirt',  price: 399,  old: null, colors: [C('كحلي','#1E2B4D'),C('أبيض','#F4F4F2'),C('أخضر','#3E6B4F')], sizes: ['S','M','L','XL','XXL'], rating: 4.6, reviews: 102, tag: null, stock: 55, desc: 'قماش بيكيه مسامي، ياقة بزرارين وكم مضلّع.' },
  { id: 15, name: 'بنطلون كارجو واسع',         cat: 'men',   type: 'jeans',  price: 679,  old: null, colors: [C('زيتي','#596040'),C('رملي','#BBA98A'),C('أسود','#202228')], sizes: ['30','32','34','36'], rating: 4.4, reviews: 66, tag: 'جديد', stock: 20, desc: 'جيوب جانبية واسعة وقماش جبردين متين وقصّة مريحة.' },
  { id: 16, name: 'بلوزة ساتان بأكمام واسعة',  cat: 'women', type: 'shirt',  price: 529,  old: null, colors: [C('شامبين','#D8C3A5'),C('أخضر','#2F6B5E'),C('أسود','#1D1D22')], sizes: ['S','M','L','XL'], rating: 4.7, reviews: 85, tag: null, stock: 28, desc: 'ساتان ناعم بلمعة هادئة وأزرار مخفية. ترتدي مع بنطلون قماش أو جينز.' }
];

const GOVERNORATES = [
  ['القاهرة',55],['الجيزة',55],['القليوبية',65],['الإسكندرية',70],['الدقهلية',75],['الشرقية',75],['الغربية',75],['المنوفية',75],
  ['البحيرة',80],['الإسماعيلية',80],['بورسعيد',80],['السويس',80],['دمياط',80],['كفر الشيخ',80],['الفيوم',85],['بني سويف',85],
  ['المنيا',95],['أسيوط',100],['سوهاج',105],['قنا',110],['الأقصر',115],['أسوان',120],['البحر الأحمر',130],['مطروح',130],['جنوب سيناء',140],['شمال سيناء',140],['الوادي الجديد',150]
];

/* الدول والعملات. rate = كم وحدة من العملة المحلية مقابل ١ جنيه مصري.
   ship = رسوم الشحن بالعملة المحلية، free = حد الشحن المجاني بالعملة المحلية (مصر: الشحن حسب المحافظة).
   الأسعار تقريبية ويجب تحديثها دوريًا من لوحة الإدارة > الدول. */
const COUNTRIES = [
  { code: 'EG', ar: 'مصر', en: 'Egypt', cur: 'EGP', rate: 1, ship: 0, free: 1500, region: 'EG' },
  { code: 'SA', ar: 'السعودية', en: 'Saudi Arabia', cur: 'SAR', rate: 0.075, ship: 35, free: 300, region: 'GCC' },
  { code: 'AE', ar: 'الإمارات', en: 'United Arab Emirates', cur: 'AED', rate: 0.0735, ship: 35, free: 300, region: 'GCC' },
  { code: 'KW', ar: 'الكويت', en: 'Kuwait', cur: 'KWD', rate: 0.0061, ship: 3, free: 25, region: 'GCC' },
  { code: 'QA', ar: 'قطر', en: 'Qatar', cur: 'QAR', rate: 0.0728, ship: 35, free: 300, region: 'GCC' },
  { code: 'BH', ar: 'البحرين', en: 'Bahrain', cur: 'BHD', rate: 0.0075, ship: 3.5, free: 30, region: 'GCC' },
  { code: 'OM', ar: 'عُمان', en: 'Oman', cur: 'OMR', rate: 0.0077, ship: 3.5, free: 30, region: 'GCC' },
  { code: 'GB', ar: 'المملكة المتحدة', en: 'United Kingdom', cur: 'GBP', rate: 0.0158, ship: 10, free: 85, region: 'EU' },
  { code: 'DE', ar: 'ألمانيا', en: 'Germany', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'FR', ar: 'فرنسا', en: 'France', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'IT', ar: 'إيطاليا', en: 'Italy', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'ES', ar: 'إسبانيا', en: 'Spain', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'NL', ar: 'هولندا', en: 'Netherlands', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'BE', ar: 'بلجيكا', en: 'Belgium', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'AT', ar: 'النمسا', en: 'Austria', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' },
  { code: 'IE', ar: 'أيرلندا', en: 'Ireland', cur: 'EUR', rate: 0.0185, ship: 12, free: 100, region: 'EU' }
];
/* كوبونات العرض التجريبي: القيمة الثابتة بالجنيه المصري وتُحوَّل لعملة الدولة */
const COUPONS = {
  STYLE10:   { type: 'percent', value: 10 },
  WELCOME50: { type: 'fixed',   value: 50 }
};
let CARD_ENABLED = false;   // يتحدد من الخادم (وجود مفاتيح Stripe)

/* رسومات المنتجات: SVG يتلوّن حسب لون المنتج */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, v + amt));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
function garment(type, hex) {
  const dk = shade(hex, -38), lt = shade(hex, 30);
  const st = `stroke="rgba(0,0,0,.22)" stroke-width="1.4" stroke-linejoin="round"`;
  const P = {
    tshirt: `<path d="M70 22 L38 38 L10 80 L36 96 L52 78 L52 204 L148 204 L148 78 L164 96 L190 80 L162 38 L130 22 Q100 46 70 22Z" fill="${hex}" ${st}/><path d="M70 22 Q100 46 130 22" fill="none" stroke="${dk}" stroke-width="5" stroke-linecap="round"/>`,
    shirt:  `<path d="M70 22 L38 38 L10 120 L38 128 L52 84 L52 204 L148 204 L148 84 L162 128 L190 120 L162 38 L130 22 L100 44Z" fill="${hex}" ${st}/><path d="M70 22 L100 60 L130 22 L112 18 L100 32 L88 18Z" fill="${lt}" ${st}/><path d="M100 60 L100 204" stroke="${dk}" stroke-width="1.5"/><g fill="${dk}"><circle cx="100" cy="88" r="2.2"/><circle cx="100" cy="116" r="2.2"/><circle cx="100" cy="144" r="2.2"/><circle cx="100" cy="172" r="2.2"/></g>`,
    hoodie: `<path d="M72 26 L36 42 L14 160 L42 166 L54 96 L54 206 L146 206 L146 96 L158 166 L186 160 L164 42 L128 26Z" fill="${hex}" ${st}/><path d="M72 26 Q100 -2 128 26 Q100 62 72 26Z" fill="${dk}" ${st}/><path d="M92 50 L90 84 M108 50 L110 84" stroke="${lt}" stroke-width="2.4" stroke-linecap="round"/><path d="M68 150 L132 150 L140 186 L60 186Z" fill="${dk}" opacity=".55"/>`,
    jacket: `<path d="M72 24 L36 40 L14 164 L42 170 L54 96 L54 206 L146 206 L146 96 L158 170 L186 164 L164 40 L128 24Z" fill="${hex}" ${st}/><path d="M72 24 L100 70 L128 24 L114 18 L100 40 L86 18Z" fill="${dk}" ${st}/><path d="M100 70 L100 206" stroke="${lt}" stroke-width="2"/><rect x="62" y="104" width="26" height="22" rx="2" fill="none" stroke="${dk}" stroke-width="1.6"/><rect x="112" y="104" width="26" height="22" rx="2" fill="none" stroke="${dk}" stroke-width="1.6"/>`,
    jeans:  `<path d="M56 14 L144 14 L152 208 L108 208 L100 84 L92 208 L48 208Z" fill="${hex}" ${st}/><path d="M56 14 L144 14 L144 30 L56 30Z" fill="${dk}" opacity=".7"/><path d="M100 30 L100 84" stroke="${dk}" stroke-width="1.6"/><path d="M62 36 Q76 40 80 56 M138 36 Q124 40 120 56" fill="none" stroke="${lt}" stroke-width="1.6"/>`,
    dress:  `<path d="M80 12 L120 12 L128 62 L172 208 L28 208 L72 62Z" fill="${hex}" ${st}/><path d="M72 62 L128 62" stroke="${dk}" stroke-width="6" stroke-linecap="round"/><path d="M80 12 Q100 34 120 12" fill="none" stroke="${dk}" stroke-width="4" stroke-linecap="round"/><path d="M62 208 L84 74 M100 208 L100 74 M138 208 L116 74" stroke="${dk}" stroke-width="1" opacity=".4"/>`,
    cap:    `<path d="M34 138 Q32 66 100 62 Q168 66 166 138Z" fill="${hex}" ${st}/><path d="M24 142 Q100 120 196 146 Q110 162 24 142Z" fill="${dk}" ${st}/><circle cx="100" cy="64" r="5" fill="${lt}"/><path d="M100 64 L100 134" stroke="${dk}" stroke-width="1.2" opacity=".5"/>`,
    bag:    `<path d="M62 84 Q62 30 100 30 Q138 30 138 84" fill="none" stroke="${dk}" stroke-width="8" stroke-linecap="round"/><rect x="34" y="78" width="132" height="116" rx="14" fill="${hex}" ${st}/><path d="M34 112 Q100 140 166 112" fill="none" stroke="${dk}" stroke-width="2"/><rect x="88" y="120" width="24" height="16" rx="3" fill="${lt}" ${st}/>`
  };
  return `<svg viewBox="0 0 200 220" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${P[type] || P.tshirt}</svg>`;
}

/* وضع الخادم: عند تقديم الواجهة من Express نستبدل البيانات التجريبية ببيانات الـ API.
   نستخدم طلبًا متزامنًا مرة واحدة عند التحميل حتى تبقى الصفحات بسيطة. وإن فشل نبقى على البيانات التجريبية. */
const API = {
  on: false,
  token() { try { return JSON.parse(localStorage.getItem('sh_token')); } catch { return null; } },
  async call(path, method = 'GET', body) {
    const t = API.token();
    const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'تعذّر الاتصال بالخادم.');
    return j;
  }
};
(function loadRemote() {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return; // خارج المتصفح (مثل seed.js) نتخطى
  try {
    const get = u => { const x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); if (x.status !== 200 || !/json/.test(x.getResponseHeader('content-type') || '')) throw 0; return JSON.parse(x.responseText); };
    const meta = get('/api/meta'), prods = get('/api/products');
    if (!Array.isArray(prods)) return;   // حتى لو القاعدة فارغة نبقى في وضع الخادم ولا نعرض بيانات وهمية
    PRODUCTS.splice(0, PRODUCTS.length, ...prods.map(p => ({ ...p, price: Number(p.price), old: p.old ? Number(p.old) : null, rating: Number(p.rating) })));
    GOVERNORATES.splice(0, GOVERNORATES.length, ...meta.governorates);
    if (Array.isArray(meta.countries) && meta.countries.length) COUNTRIES.splice(0, COUNTRIES.length, ...meta.countries.map(c => ({ ...c, rate: Number(c.rate), ship: Number(c.ship), free: Number(c.free) })));
    CARD_ENABLED = !!meta.cardEnabled;
    API.on = true;
  } catch (e) { /* لا يوجد خادم: نكمل بالبيانات التجريبية */ }
})();

/* تنبيه واضح لو الصفحة مفتوحة محليًا لكن بدون اتصال بالخادم: وقتها تظهر منتجات العرض فقط ولا تظهر منتجات المدير */
if (typeof document !== 'undefined' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !API.on && !/admin/.test(location.pathname)) {
  document.addEventListener('DOMContentLoaded', () => {
    const en = (() => { try { return localStorage.getItem('sh_lang') === 'en'; } catch { return false; } })();
    const b = document.createElement('div');
    b.setAttribute('style', 'position:fixed;bottom:0;inset-inline:0;z-index:999;background:#b3261e;color:#fff;padding:10px 16px;text-align:center;font:600 14px sans-serif');
    b.textContent = en ? 'Demo mode: not connected to the server/database, so products added in Admin will not appear. Run npm start and open http://localhost:3000'
      : 'نسخة العرض: الصفحة غير متصلة بالخادم وقاعدة البيانات، فلن تظهر المنتجات اللي أضفتها من المدير. شغّل npm start وافتح http://localhost:3000';
    document.body.appendChild(b);
  });
}
