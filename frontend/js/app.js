/* STYLE HUB PRO — المنطق المشترك: اللغة والدولة والسلة والهيدر والفوتر */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => PRODUCTS.find(p => p.id === Number(id));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ---------- أسماء مترجمة ---------- */
const catName = id => t((CATEGORIES.find(c => c.id === id) || {}).name || '');
const pName = p => (isEN && p.name_en) || t(p.name);
const pDesc = p => (isEN && p.desc_en) || t(p.desc);

/* ---------- الدولة والعملة ---------- */
const TZ = { 'Africa/Cairo': 'EG', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Asia/Kuwait': 'KW', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM',
  'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Dublin': 'IE' };
const Country = {
  get code() {
    const saved = store.get('sh_country', null);
    if (saved && COUNTRIES.some(c => c.code === saved)) return saved;
    let g = 'EG'; try { g = TZ[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'EG'; } catch {}
    return COUNTRIES.some(c => c.code === g) ? g : COUNTRIES[0].code;
  },
  get c() { return COUNTRIES.find(x => x.code === this.code) || COUNTRIES[0]; },
  get isEG() { return this.code === 'EG'; },
  set(code) { store.set('sh_country', code); location.reload(); },
  name(c) { return isEN ? c.en : c.ar; }
};
/* كل المبالغ داخليًا بالـ cents (أعداد صحيحة) بعملة الدولة المختارة، وبنفس معادلة الخادم */
const unitCents = p => Math.round(p.price * Country.c.rate * 100);
const oldCents = p => Math.round(p.old * Country.c.rate * 100);
const fixedCents = egp => Math.round(egp * Country.c.rate * 100);
const freeFromCents = () => Math.round(Country.c.free * 100);
function fmtC(cents, cur = Country.c.cur) {
  const n = cents / 100, whole = Number.isInteger(n) && cur === 'EGP';
  try { return new Intl.NumberFormat(isEN ? 'en-US' : 'ar-EG', { style: 'currency', currency: cur, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(n); }
  catch { return n.toFixed(2) + ' ' + cur; }
}
const money = egp => fmtC(fixedCents(egp));          // لعرض مبلغ مرجعي بالجنيه محوّلًا (مثل حد السعر)
const fmtDate = d => new Date(d).toLocaleDateString(isEN ? 'en-GB' : 'ar-EG');

/* ---------- السلة ---------- */
const Cart = {
  items() { return store.get('sh_cart', []); },
  save(a) { store.set('sh_cart', a); Cart.refresh(); },
  add(id, size, color, qty = 1) {
    const a = Cart.items(), p = byId(id);
    const hit = a.find(i => i.id === id && i.size === size && i.color === color);
    if (hit) hit.qty = Math.min(hit.qty + qty, p.stock); else a.push({ id, size, color, qty: Math.min(qty, p.stock) });
    Cart.save(a);
  },
  setQty(idx, q) { const a = Cart.items(); if (!a[idx]) return; const p = byId(a[idx].id); a[idx].qty = Math.max(1, Math.min(q, p.stock)); Cart.save(a); },
  remove(idx) { const a = Cart.items(); a.splice(idx, 1); Cart.save(a); },
  clear() { Cart.save([]); store.set('sh_coupon', null); },
  count() { return Cart.items().reduce((s, i) => s + i.qty, 0); },
  lines() { return Cart.items().map((i, idx) => ({ ...i, idx, p: byId(i.id) })).filter(l => l.p).map(l => ({ ...l, unit: unitCents(l.p) })); },
  subtotal() { return Cart.lines().reduce((s, l) => s + l.unit * l.qty, 0); },
  coupon() { return store.get('sh_coupon', null); },          // {code,type,value}
  discount() {
    const c = Cart.coupon(); if (!c) return 0;
    const sub = Cart.subtotal();
    return Math.min(sub, c.type === 'percent' ? Math.round(sub * c.value / 100) : fixedCents(c.value));
  },
  /* null = المحافظة لم تُختر بعد (مصر فقط) */
  shipping(gov) {
    if (!Cart.count()) return 0;
    if (Cart.subtotal() - Cart.discount() >= freeFromCents()) return 0;
    if (Country.isEG) { const g = GOVERNORATES.find(x => x[0] === gov); return g ? g[1] * 100 : null; }
    return Math.round(Country.c.ship * 100);
  },
  swatch(l) { const c = l.p.colors.find(c => c.n === l.color) || l.p.colors[0]; return c.hex; },
  thumb(l) { return l.p.images && l.p.images[0] ? `<img src="${esc(l.p.images[0])}" alt="" loading="lazy">` : garment(l.p.type, Cart.swatch(l)); },
  refresh() {
    $$('[data-cart-count]').forEach(b => { const n = Cart.count(); b.textContent = n ? num(n) : ''; b.dataset.n = n; });
    Cart.renderDrawer();
    document.dispatchEvent(new Event('cart:change'));
  },
  renderDrawer() {
    const body = $('#drawer-body'); if (!body) return;
    const ls = Cart.lines();
    body.innerHTML = ls.length ? ls.map(l => `
      <div class="line"><div class="t">${Cart.thumb(l)}</div>
      <div><h4>${esc(pName(l.p))}</h4><small>${esc(t(l.color))} — ${t('مقاس {s}', { s: esc(l.size) })}</small>
      <small>${t('الكمية: {n}', { n: num(l.qty) })}</small><button class="rm" data-rm="${l.idx}">${t('حذف')}</button></div>
      <div class="lp">${fmtC(l.unit * l.qty)}</div></div>`).join('')
      : `<div class="empty" style="margin-top:20px"><h3>${t('السلة فاضية')}</h3><p>${t('ابدأ بإضافة قطعة تعجبك.')}</p><a class="btn" href="products.html">${t('تصفّح المنتجات')}</a></div>`;
    $('#drawer-total').textContent = fmtC(Cart.subtotal());
    $('#drawer-foot').style.display = ls.length ? 'grid' : 'none';
    $$('[data-rm]', body).forEach(b => b.onclick = () => Cart.remove(+b.dataset.rm));
  }
};

/* ---------- عناصر مساعدة ---------- */
function stars(r) { const f = Math.round(r); return `<span class="stars" aria-label="${t('تقييم {r} من 5', { r: num(r) })}">${'★'.repeat(f)}${'☆'.repeat(5 - f)}</span>`; }
function productImg(p, color) { return p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="${esc(pName(p))}" loading="lazy">` : garment(p.type, (color || p.colors[0]).hex); }
function productCard(p) {
  const sale = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  const tag = sale ? t('خصم {n}%', { n: num(sale) }) : (p.tag && !/^خصم/.test(p.tag) ? t(p.tag) : '');
  return `<article class="pcard">
    <a class="pimg ${p.images && p.images[0] ? 'has-img' : ''}" href="product-details.html?id=${p.id}" aria-label="${esc(pName(p))}">
      ${tag ? `<span class="ptag ${sale ? 'sale' : ''}">${esc(tag)}</span>` : ''}
      ${productImg(p)}
    </a>
    <div class="pbody">
      <a class="pname" href="product-details.html?id=${p.id}">${esc(pName(p))}</a>
      <div class="pmeta">${stars(p.rating)} <span>(${num(p.reviews)})</span></div>
      <div class="dots" aria-label="${t('الألوان المتاحة')}">${p.colors.map(c => `<span class="dot" title="${esc(t(c.n))}" style="background:${c.hex}"></span>`).join('')}</div>
      <div class="price"><b>${fmtC(unitCents(p))}</b>${p.old ? `<s>${fmtC(oldCents(p))}</s>` : ''}</div>
    </div></article>`;
}
let toastT;
function toast(html) {
  const el = $('#toast'); if (!el) return;
  el.innerHTML = html; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 3800);
}

/* ---------- الهيدر والفوتر ---------- */
const ICON = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
function countryOptions() {
  const groups = [['EG', t('مصر')], ['GCC', t('دول الخليج')], ['EU', t('أوروبا')]];
  return groups.map(([g, label]) => {
    const list = COUNTRIES.filter(c => c.region === g); if (!list.length) return '';
    const opts = list.map(c => `<option value="${c.code}" ${c.code === Country.code ? 'selected' : ''}>${esc(Country.name(c))} (${c.cur})</option>`).join('');
    return g === 'EG' ? opts : `<optgroup label="${esc(label)}">${opts}</optgroup>`;
  }).join('');
}
function mountChrome() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const cur = p => (page === p ? ' aria-current="page"' : '');
  const user = store.get('sh_user', null), c = Country.c;
  const hdr = $('#hdr');
  if (hdr) hdr.innerHTML = `
  <div class="announce"><div class="wrap ann">
    <span>${t('شحن مجاني للطلبات فوق {a}', { a: `<b>${fmtC(freeFromCents())}</b>` })} — ${Country.isEG ? t('الدفع عند الاستلام متاح') : t('الدفع الآمن بالبطاقة')}</span>
    <span class="prefs">
      <label class="sr" for="ctrySel">${t('الدولة والعملة')}</label><select id="ctrySel">${countryOptions()}</select>
      <label class="sr" for="langSel">${t('اللغة')}</label><select id="langSel"><option value="ar" ${isEN ? '' : 'selected'}>العربية</option><option value="en" ${isEN ? 'selected' : ''}>English</option></select>
    </span></div></div>
  <header class="site-header"><div class="wrap hd">
    <button class="ibtn burger" id="burger" aria-label="${t('القائمة')}" aria-expanded="false">${ICON.menu}</button>
    <a class="logo" href="index.html" aria-label="STYLE HUB PRO — ${t('الرئيسية')}"><b>STYLE HUB</b></a>
    <nav class="nav" id="nav" aria-label="${t('التنقل الرئيسي')}">
      <a href="index.html"${cur('index.html')}>${t('الرئيسية')}</a>
      <a href="products.html?cat=men">${t('رجالي')}</a>
      <a href="products.html?cat=women">${t('حريمي')}</a>
      <a href="products.html?cat=acc">${t('إكسسوارات')}</a>
      <a href="products.html?sale=1">${t('التخفيضات')}</a>
    </nav>
    <span class="spacer"></span>
    <form class="search" id="search" role="search" action="products.html">
      <input type="search" name="q" placeholder="${t('ابحث عن تيشيرت، جينز، فستان…')}" aria-label="${t('بحث')}">
      <button aria-label="${t('بحث')}">${ICON.search}</button></form>
    <div class="icons">
      <button class="ibtn" id="sbtn" aria-label="${t('بحث')}" style="display:none">${ICON.search}</button>
      <a class="ibtn" href="login.html" aria-label="${user ? t('حسابي') : t('تسجيل الدخول')}" title="${user ? esc(user.name) : t('تسجيل الدخول')}">${ICON.user}</a>
      <button class="ibtn" id="cartbtn" aria-label="${t('فتح السلة')}">${ICON.bag}<span class="badge" data-cart-count></span></button>
    </div></div></header>
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="drawer" aria-label="${t('سلة المشتريات')}" aria-hidden="true">
    <header><h3>${t('سلتك')}</h3><button class="ibtn" id="dclose" aria-label="${t('إغلاق')}">${ICON.x}</button></header>
    <div class="body" id="drawer-body"></div>
    <footer id="drawer-foot"><div class="sum"><div class="total"><span>${t('الإجمالي')}</span><span id="drawer-total"></span></div></div>
      <a class="btn tape-btn block" href="checkout.html">${t('إتمام الطلب')}</a><a class="btn ghost block" href="cart.html">${t('عرض السلة')}</a></footer>
  </aside><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  const ftr = $('#ftr');
  if (ftr) ftr.innerHTML = `<footer class="footer"><div class="wrap">
    <div class="ft">
      <div><a class="logo" href="index.html"><b>STYLE HUB</b></a>
        <p class="about">${t('ملابس رجالي وحريمي بقصّات مريحة وخامات تتحمّل الاستخدام اليومي. نشحن إلى مصر والخليج وأوروبا.')}</p></div>
      <div><h4>${t('تسوّق')}</h4><ul><li><a href="products.html?cat=men">${t('رجالي')}</a></li><li><a href="products.html?cat=women">${t('حريمي')}</a></li><li><a href="products.html?cat=acc">${t('إكسسوارات')}</a></li><li><a href="products.html?sale=1">${t('التخفيضات')}</a></li></ul></div>
      <div><h4>${t('مساعدة')}</h4><ul><li><a href="cart.html">${t('السلة')}</a></li><li><a href="login.html">${t('حسابي')}</a></li><li><a href="#policies">${t('الاستبدال والاسترجاع')}</a></li><li><a href="#policies">${t('سياسة الخصوصية')}</a></li><li><a href="admin.html">${t('لوحة الإدارة')}</a></li></ul></div>
      <div id="policies"><h4>${t('تواصل معنا')}</h4><ul><li>${t('واتساب')}: <span dir="ltr">01000000000</span></li><li>support@stylehub.example</li><li>${t('من السبت إلى الخميس، 10 ص – 8 م')}</li></ul></div>
    </div>
    <div class="copy"><span>© ${new Date().getFullYear()} STYLE HUB PRO. ${t('جميع الحقوق محفوظة.')}</span><span>${t('استبدال خلال 14 يومًا من الاستلام')}</span></div></div></footer>`;

  const burger = $('#burger'), nav = $('#nav'), search = $('#search'), sbtn = $('#sbtn');
  if (burger) burger.onclick = () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
  const mq = matchMedia('(max-width:900px)');
  const sync = () => { if (sbtn) sbtn.style.display = mq.matches ? 'grid' : 'none'; }; sync(); mq.onchange = sync;
  if (sbtn) sbtn.onclick = () => { search.classList.toggle('open'); search.querySelector('input').focus(); };
  const cs = $('#ctrySel'), ls = $('#langSel');
  if (cs) cs.onchange = () => Country.set(cs.value);
  if (ls) ls.onchange = () => setLang(ls.value);

  const drawer = $('#drawer'), scrim = $('#scrim');
  const open = o => { drawer.classList.toggle('open', o); scrim.classList.toggle('open', o); drawer.setAttribute('aria-hidden', !o); };
  if (drawer) {
    $('#cartbtn').onclick = () => open(true);
    $('#dclose').onclick = scrim.onclick = () => open(false);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
  }
  window.openDrawer = open;
  Cart.refresh();
}
document.addEventListener('DOMContentLoaded', mountChrome);
