import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.trim() : '';



if (!secretKey) {
    console.error("❌ STRIPE_SECRET_KEY is missing!");
}

const stripe = new Stripe(secretKey);

export default stripe;