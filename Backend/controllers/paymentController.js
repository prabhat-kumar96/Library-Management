import stripe from "../config/stripe.js";
import { User } from "../models/userModel.js";

const toRupees = (amountInPaise = 0) => Number(amountInPaise) / 100;

export const createCheckoutSession = async (req, res, next) => {
  try {
    const { items, customer_email } = req.body;

    if (!customer_email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No payment item provided.",
      });
    }

    const duesItem = items.find((item) => item.isFinePayment);

    if (!duesItem) {
      return res.status(400).json({
        success: false,
        message: "Only dues settlement payments are supported here.",
      });
    }

    const amountInPaise = Number(duesItem.amount);

    if (!Number.isFinite(amountInPaise) || amountInPaise < 5000) {
      return res.status(400).json({
        success: false,
        message: "Minimum payment amount is Rs. 50.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email,
      line_items: [
        {
          price_data: {
            currency: duesItem.currency || "inr",
            product_data: {
              name: duesItem.title || "Settle Outstanding Dues",
            },
            unit_amount: amountInPaise,
          },
          quantity: duesItem.quantity || 1,
        },
      ],
      metadata: {
        paymentType: "dues",
        customerEmail: customer_email,
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
    });

    return res.status(200).json({
      success: true,
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentIntent = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Payment Intent flow is not active. Use dues checkout session.",
  });
};

export const stripeWebhookHandler = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("[Stripe Webhook] Signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  try {
    const session = event.data.object;

    if (session.metadata?.paymentType !== "dues") {
      return res.status(200).json({ received: true });
    }

    const userEmail = session.customer_email || session.metadata?.customerEmail;
    const paidAmount = toRupees(session.amount_total);

    if (!userEmail || paidAmount <= 0) {
      return res.status(200).json({ received: true });
    }

    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.warn(`[Stripe Webhook] User not found for dues payment: ${userEmail}`);
      return res.status(200).json({ received: true });
    }

    user.totalFinesDue = Math.max(0, Number(user.totalFinesDue || 0) - paidAmount);
    await user.save({ validateModifiedOnly: true });

    console.log(
      `[Stripe Webhook] Settled Rs. ${paidAmount} dues for user: ${user.email}`,
    );

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Failed to process dues payment:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};
