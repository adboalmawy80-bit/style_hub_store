/* Stripe Checkout. يعمل فقط لو STRIPE_SECRET_KEY صالح في .env */
const { stripe: cfg } = require('../config/env');
const enabled = !!cfg.secretKey;
let client = null;
const get = () => client || (client = require('stripe')(cfg.secretKey));
module.exports = { enabled, get, cfg };
