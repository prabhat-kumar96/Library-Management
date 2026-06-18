import express from 'express';
import { 
  createCheckoutSession, 
  createPaymentIntent, 
  stripeWebhookHandler 
} from '../controllers/paymentController.js';
import { isAuthenticated } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// POST /api/v1/payment/create-checkout-session (Legacy)
router.post('/create-checkout-session', createCheckoutSession);

// POST /api/v1/payment/create-intent / /api/payments/create-intent (Stripe Intent Pattern)
router.post('/create-intent', isAuthenticated, createPaymentIntent);

// Stripe webhook endpoint - needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

export default router;
