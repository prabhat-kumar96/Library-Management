import express from 'express';
import { createCheckoutSession, stripeWebhookHandler } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/v1/payment/create-checkout-session
router.post('/create-checkout-session', createCheckoutSession);

// Stripe webhook endpoint - needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

export default router;
