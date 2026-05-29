import Stripe from 'stripe';
import { User } from '../models/userModel.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res, next) => {
  try {
    const { items, customer_email } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    const line_items = items.map((it) => {
      const currency = it.currency || 'usd';
      return {
        price_data: {
          currency,
          product_data: { name: it.title || 'E-Book', metadata: { bookId: it.bookId || '' } },
          unit_amount: it.amount,
        },
        quantity: it.quantity || 1,
      };
    });

    // Attach the items to session metadata so webhook can process them
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      customer_email: customer_email,
      metadata: { items: JSON.stringify(items) },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (error) {
    next(error);
  }
};

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const itemsJson = session.metadata?.items;
      const items = itemsJson ? JSON.parse(itemsJson) : [];
      const userEmail = session.customer_email;
      if (userEmail && items.length > 0) {
        const user = await User.findOne({ email: userEmail });
        if (user) {
          const purchasesToAdd = items
            .filter(i => i.bookId)
            .map(i => ({ bookId: i.bookId, bookTitle: i.title || 'E-Book', purchaseDate: new Date() }));

          if (purchasesToAdd.length > 0) {
            user.purchasedBooks = user.purchasedBooks.concat(purchasesToAdd);
            await user.save();
          }
        }
      }
    } catch (err) {
      console.error('Error processing webhook:', err);
    }
  }

  res.json({ received: true });
};
