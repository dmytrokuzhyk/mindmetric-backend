# MindMetric Backend

Express + Stripe backend for the MindMetric IQ Test platform.

---

## Project Structure

```
mindmetric-backend/
├── src/
│   └── server.js        # Main Express server
├── .env                 # Your secret keys (never commit this)
├── .env.example         # Template for env vars
├── .gitignore
└── package.json
```

---

## Step 1 — Get Your Stripe Keys

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and create a free account
2. In the dashboard, click **Developers → API Keys**
3. Copy your **Secret key** (starts with `sk_test_...` for testing)
4. Paste it into your `.env` file:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   ```

> ✅ Use `sk_test_` keys while testing — no real money is charged.
> When ready to go live, swap in your `sk_live_` key.

---

## Step 2 — Run Locally

```bash
# Install dependencies
npm install

# Start the dev server (auto-restarts on changes)
npm run dev

# Or start normally
npm start
```

Server runs at: `http://localhost:3001`

Test it with:
```bash
curl http://localhost:3001/
# → {"status":"MindMetric backend is running ✅"}
```

---

## Step 3 — Deploy to Railway

1. **Create a GitHub repo** and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/mindmetric-backend.git
   git push -u origin main
   ```

2. **Go to [railway.app](https://railway.app)** and sign in with GitHub

3. Click **New Project → Deploy from GitHub repo** and select your repo

4. Railway will auto-detect Node.js and deploy it. Once done, you'll get a URL like:
   ```
   https://mindmetric-backend.up.railway.app
   ```

5. **Add your environment variables** in Railway:
   - Go to your project → **Variables** tab
   - Add each variable from your `.env` file:
     - `STRIPE_SECRET_KEY` = your Stripe secret key
     - `STRIPE_WEBHOOK_SECRET` = (see Step 4)
     - `FRONTEND_URL` = your frontend URL (or `*` to allow all)

---

## Step 4 — Set Up Stripe Webhook

The webhook lets Stripe notify your server when a payment succeeds.

1. In the Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Set the URL to:
   ```
   https://YOUR-RAILWAY-URL.up.railway.app/webhook
   ```
4. Under **Select events**, choose:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to Railway's environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

---

## Step 5 — Connect Your Frontend

In your `iq-test.html` file, update this line at the top of the `<script>` section:

```javascript
const BACKEND_URL = 'https://YOUR-RAILWAY-URL.up.railway.app';
```

Also replace the Stripe publishable key:
```javascript
const STRIPE_KEY = 'pk_live_YOUR_PUBLISHABLE_KEY';
```

---

## API Endpoints

### `GET /`
Health check.

### `POST /create-payment-intent`
Creates a Stripe PaymentIntent for the given test type.

**Request body:**
```json
{
  "testType": "professional",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 300,
  "testType": "professional"
}
```

### `GET /verify-payment?paymentIntentId=pi_xxx`
Verifies a payment was successful.

**Response:**
```json
{
  "status": "succeeded",
  "testType": "elite",
  "paid": true
}
```

### `POST /webhook`
Stripe webhook endpoint. Do not call this directly.

---

## Prices

| Test | Amount |
|------|--------|
| Professional | $3.00 |
| Elite | $5.00 |

To change prices, edit the `PRICES` object in `src/server.js`.

---

## Test Cards (Stripe Test Mode)

Use these card numbers to test payments without real money:

| Card | Number |
|------|--------|
| ✅ Success | `4242 4242 4242 4242` |
| ❌ Declined | `4000 0000 0000 0002` |
| 🔐 3D Secure | `4000 0025 0000 3155` |

Use any future expiry date and any 3-digit CVC.

---

## Going Live Checklist

- [ ] Swap `sk_test_` → `sk_live_` in Railway env vars
- [ ] Swap `pk_test_` → `pk_live_` in `iq-test.html`
- [ ] Update webhook URL to production endpoint
- [ ] Set `FRONTEND_URL` to your real frontend domain
- [ ] Test a real $0.50 payment to confirm everything works
