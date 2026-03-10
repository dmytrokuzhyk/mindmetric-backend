require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// -------------------------------------------------------
// PRICES (in cents)
// -------------------------------------------------------
const PRICES = {
  professional: 300,  // $3.00
  elite: 500,         // $5.00
};

const TEST_NAMES = {
  professional: 'MindMetric Professional IQ Test',
  elite: 'MindMetric Elite IQ Test',
};

// -------------------------------------------------------
// CORS — allow your frontend origin
// -------------------------------------------------------
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));

// -------------------------------------------------------
// STRIPE WEBHOOK — must come BEFORE express.json()
// Raw body needed for signature verification
// -------------------------------------------------------
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const testType = intent.metadata.testType;
        const email = intent.metadata.email || 'unknown';
        console.log(`✅ Payment succeeded — ${testType} — ${email} — $${intent.amount / 100}`);
        // TODO: send confirmation email, store in DB, etc.
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        console.log(`❌ Payment failed — ${intent.metadata.testType}`);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// -------------------------------------------------------
// JSON BODY PARSER — after webhook route
// -------------------------------------------------------
app.use(express.json());

// -------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ status: 'MindMetric backend is running ✅' });
});

// -------------------------------------------------------
// CREATE PAYMENT INTENT
// POST /create-payment-intent
// Body: { testType: "professional" | "elite", email?: string }
// -------------------------------------------------------
app.post('/create-payment-intent', async (req, res) => {
  const { testType, email } = req.body;

  // Validate test type
  if (!testType || !PRICES[testType]) {
    return res.status(400).json({
      error: 'Invalid testType. Must be "professional" or "elite".',
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PRICES[testType],
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: TEST_NAMES[testType],
      metadata: {
        testType,
        email: email || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: PRICES[testType],
      testType,
    });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// VERIFY PAYMENT (optional extra check from frontend)
// GET /verify-payment?paymentIntentId=pi_xxx
// -------------------------------------------------------
app.get('/verify-payment', async (req, res) => {
  const { paymentIntentId } = req.query;

  if (!paymentIntentId) {
    return res.status(400).json({ error: 'Missing paymentIntentId' });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.json({
      status: intent.status,           // "succeeded", "requires_payment_method", etc.
      testType: intent.metadata.testType,
      paid: intent.status === 'succeeded',
    });
  } catch (err) {
    console.error('Verify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------
// START SERVER
// -------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 MindMetric backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/`);
  console.log(`   Stripe mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🟢 LIVE' : '🟡 TEST'}\n`);
});
