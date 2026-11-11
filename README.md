# STYLE HUB PRO

An online clothing store for men, women and accessories, with a cart, orders, card payments and an admin dashboard. The storefront and the admin panel are both available in **Arabic (RTL)** and **English**. The visual identity is built around a tailor's measuring tape.

---

## Quick start

```bash
npm install            # install dependencies
cp .env.example .env   # then fill in the values   (Windows: copy .env.example .env)
npm run setup          # create tables
npm run seed           # products, coupons, shipping, countries, admin account
npm run doctor         # checks everything
npm start              # http://localhost:3000
```

- Store: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html` (or `/admin`)
- Admin credentials come from `.env`: `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters)

### The `.env` file

| Variable | Description |
|---|---|
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL / TiDB connection |
| `DB_SSL` | `true` for TiDB Cloud (with `DB_PORT=4000`); `no-verify` for hosts with a self-signed certificate such as Aiven |
| `JWT_SECRET` | A long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL` `ADMIN_PASSWORD` | The first admin account |
| `STRIPE_SECRET_KEY` `STRIPE_PUBLISHABLE_KEY` `STRIPE_WEBHOOK_SECRET` | Stripe keys (see below) |
| `PUBLIC_URL` | The public URL of your site (used for Stripe redirects) |

> Never commit `.env` (it is excluded in `.gitignore`). If a key was ever exposed, roll it in the provider's dashboard.

## Features

- **Storefront:** home page, product listing with filters (category / size / color / price), product details with a size guide, cart, coupons (`STYLE10`, `WELCOME50`), shipping by governorate (Egypt), free shipping above a threshold, cash on delivery, card payment, customer accounts.
- **Admin:** dashboard metrics, orders and status changes (cancelling returns stock), products and inventory, product images, per-product sale prices, customers, coupon creation and editing, countries and pricing, reports and CSV export.
- **Security:** prices, stock, discounts and shipping are always calculated on the server · JWT + bcrypt · helmet · rate limiting · zod validation.
- **Two modes:** with the server running, the database is used. Without it (e.g. GitHub Pages), the frontend runs on demo data in the browser (demo admin login: `admin@stylehub.example` / `admin123`).

## Countries, images and payments

- **Language:** the storefront and the admin panel are Arabic/English. Visitors choose from the top of the page; admins choose from the sidebar.
- **Countries:** Egypt + 6 Gulf countries + 9 European countries. Base prices are stored in EGP and converted using a per-country **rate**. **The seeded rates are approximate placeholders** — update them in Admin → Countries (along with shipping fees and the free-shipping threshold).
- **Images:** Admin → Products → Edit: upload up to 6 images per product. They are resized automatically in the browser and stored in the database.
- **Stripe:** put your keys in `.env` (see `.env.example`). Card payment works in all countries; cash on delivery is available in Egypt only. Create a webhook pointing to `/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`. Unpaid card orders are cancelled automatically after about 45 minutes and their stock is released.
- **Coupons and sales:** create and edit coupons, and set sale prices per product, from the admin panel.
- **Upgrading an existing database:** run `npm run setup`, then `npm run seed`, then `npm run doctor`.
- **GitHub Pages:** serves a demo version only (no server, payments or image uploads).

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
| `GET /api/images/:id` | Product image |
| `POST /api/coupons/validate` | Validate a coupon |
| `POST /api/auth/register` · `/login` · `GET /api/auth/me` | Accounts (JWT) |
| `POST /api/orders` · `/api/orders/confirm` · `GET /api/orders/mine` | Orders and payment confirmation |
| `POST /api/stripe/webhook` | Stripe webhook |
| `/api/admin/*` | stats · orders · products · images · customers · coupons · countries (admin only) |

## Deployment

- **GitHub Pages / Vercel (static)** hosts the frontend only, with demo data.
- For the full store, use a Node.js host (such as Render or Railway) with MySQL/TiDB. Set the `.env` variables in the host's settings and run `npm run setup` and `npm run seed` once.
- Use HTTPS in production.

## Troubleshooting

Run `npm run doctor`. It checks `.env`, the database connection, tables, data and Stripe settings, and tells you what to fix.

## Tests

`npm test` — pricing and coupon logic.

## Tech

HTML5 · CSS3 · JavaScript · Node.js · Express · MySQL/TiDB · Stripe · JWT · bcrypt · helmet · zod · express-rate-limit · mysql2 · dotenv · cors

## Not included yet

A specific shipping carrier integration · automatic exchange-rate updates.
