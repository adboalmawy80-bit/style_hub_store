# STYLE HUB PRO

An Arabic (RTL) online clothing store for men, women and accessories, with a cart, orders and an admin dashboard. The visual identity is built around a tailor's measuring tape.

---

## Quick start

```bash
npm install            # install dependencies
cp .env.example .env   # then fill in the values   (Windows: copy .env.example .env)
npm run setup          # create tables
npm run seed           # products, coupons, shipping, admin account
npm run doctor         # check everything
npm start              # http://localhost:3000
```

- Store: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html` (or `/admin`)
- Admin credentials come from `.env`: `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters)

### `.env` file

| Variable | Description |
|---|---|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL / TiDB connection |
| `DB_SSL` | `true` when using TiDB Cloud (with `DB_PORT=4000`) |
| `JWT_SECRET` | A long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` | The first admin account |

> Never commit `.env` to GitHub (it is excluded in `.gitignore`).

## Features

- **Storefront:** home page, products with filters (category / size / color / price), product details with a size guide, cart, coupons (`STYLE10` and `WELCOME50`), shipping by governorate with free shipping over 1,500 EGP, cash on delivery, and user accounts.
- **Admin:** dashboard metrics, orders and status changes (cancelling an order restores stock), products and inventory, customers, coupons, reports and CSV export.
- **Security:** prices, stock, discounts and shipping are calculated on the server · JWT + bcrypt · helmet · rate limiting · zod validation.
- **Two modes:** with the server, the app uses the database. Without it (e.g. GitHub Pages), the frontend runs on demo data in the browser (admin demo login: `admin@stylehub.example` / `admin123`).

## Countries, images and payments

- **Language:** the storefront is Arabic/English and the visitor chooses from the top of the page. The admin panel is Arabic only.
- **Countries:** Egypt + 6 Gulf countries + 9 European countries. Base prices are stored in EGP and converted using a per-country rate. **The seeded rates are approximate placeholders**; update them in Admin → Countries & Prices (this also covers shipping and the free-shipping threshold).
- **Images:** in Admin → Products → Edit, upload up to 6 images per product. They are resized automatically and stored in the database.
- **Stripe:** put the keys in `.env` (see `.env.example`). Card payment works in all countries; cash on delivery is Egypt only. Create a webhook pointing to `/api/stripe/webhook`. Unpaid card orders are automatically cancelled after about 45 minutes and the stock is restored.
- **Upgrading an existing database:** run `npm run setup`, then `npm run seed`, then `npm run doctor`.
- **GitHub Pages:** shows a demo version only (no server, payments or image uploads).

## Project structure

```text
STYLE-HUB-PRO/
├── frontend/      index · products · product-details · cart · checkout · login · admin (.html) + css/ js/ assets/
├── backend/       server.js · config/ · routes/ · middleware/ · models/ · services/
├── database/      schema.sql · setup.js · seed.js · doctor.js
├── docs/          PROJECT-OVERVIEW.md · TOOLS.md
├── index.html     redirects to frontend/ (useful for GitHub Pages)
├── package.json · .env.example · .gitignore
```

## API

| Route | Description |
|---|---|
| `GET /api/meta` · `/api/products` · `/api/products/:id` | Categories, shipping and products |
| `POST /api/coupons/validate` | Validate a coupon |
| `POST /api/auth/register` · `/login` · `GET /api/auth/me` | Accounts (JWT) |
| `POST /api/orders` · `GET /api/orders/mine` | Orders |
| `/api/admin/*` | stats · orders · products · customers · coupons (admin only) |

## Deployment

- **GitHub Pages** hosts the static frontend only (demo data).
- For the full store, use a Node.js host (such as Render or Railway) with TiDB/MySQL. Set the `.env` variables in the host settings and run `npm run setup` and `npm run seed` once.
- Use HTTPS in production.

## Troubleshooting

Run `npm run doctor`. It checks `.env`, the database connection, tables and data, and tells you what to fix.

## Tests

`npm test` runs the pricing and coupon logic tests.

## Tech stack

HTML5 · CSS3 · JavaScript · Node.js · Express · MySQL/TiDB · JWT · bcrypt · helmet · zod · express-rate-limit · mysql2 · dotenv · cors

## Not included yet

- Cloudinary-based product image hosting
- A specific shipping carrier integration
- Online payments
