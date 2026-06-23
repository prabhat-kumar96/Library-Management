import stripe from '../config/stripe.js';
import { User } from '../models/userModel.js';
import { Book } from '../models/bookModel.js';
import { Borrow } from '../models/borrowModel.js';
import { sendEmail } from '../utils/sendEmail.js';

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

export const createPaymentIntent = async (req, res, next) => {
  try {
    let { bookId, type } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Transaction type is required' });
    }

    // 🧼 Force everything to lower case for consistency
    const normalizedType = type.toLowerCase();

    let amount = 0;
    let metadata = {
      userId: req.user._id.toString(),
      transactionType: normalizedType // Save lowercase into Stripe's cloud metadata
    };

    if (normalizedType === 'membership') {
      amount = 500;
    } else {
      if (!bookId) {
        return res.status(400).json({ message: 'bookId is required' });
      }
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }

      if (normalizedType === 'buy' || normalizedType === 'purchase') {
        amount = book.purchasePrice || 300;
      } else if (normalizedType === 'rent' || normalizedType === 'borrow') {
        amount = book.rentPrice || 30;
      } else {
        return res.status(400).json({ message: 'Invalid transaction type' });
      }

      metadata.bookId = book._id.toString();
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid transaction amount' });
    }

    const calculatedTotalInPaise = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculatedTotalInPaise,
      currency: 'inr',
      metadata
    });

    res.json({ clientSecret: paymentIntent.client_secret });
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
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed (Legacy / Checkout fallback)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const itemsJson = session.metadata?.items;
      const items = itemsJson ? JSON.parse(itemsJson) : [];
      const userEmail = session.customer_email;
      if (userEmail && items.length > 0) {
        const user = await User.findOne({ email: userEmail });
        if (user) {
          const finePaymentItem = items.find(i => i.isFinePayment);
          if (finePaymentItem) {
            const paidAmount = Number(finePaymentItem.amount || 0) / 100;
            user.totalFinesDue = Math.max(0, user.totalFinesDue - paidAmount);
            await user.save({ validateModifiedOnly: true });
            console.log(`[Stripe Webhook] Successfully settled ₹${paidAmount} of dues for user: ${user.email}`);
          } else {
            const purchasesToAdd = items
              .filter(i => i.bookId)
              .map(i => ({ bookId: i.bookId, bookTitle: i.title || 'E-Book', purchaseDate: new Date() }));

            if (purchasesToAdd.length > 0) {
              user.purchasedBooks = user.purchasedBooks.concat(purchasesToAdd);
              await user.save({ validateModifiedOnly: true });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing checkout session webhook:', err);
    }
  }

  // Handle payment_intent.succeeded (Secure intent pattern)
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    try {
      const { userId, bookId, transactionType } = paymentIntent.metadata || {};
      const action = transactionType ? transactionType.toLowerCase() : '';
      if (userId) {
        const user = await User.findById(userId).select("+password");
        if (user) {
          if (action === 'membership') {
            console.log(`Membership subscription updated for user: ${user.email}`);
            // In the future, set user.membershipStatus = 'Premium' or similar
            console.log("💰 Webhook verified and lowercased action state safely processed:", action);
          } else if (bookId) {
            const book = await Book.findById(bookId);
            if (book) {
              if (action === 'buy' || action === 'purchase') {
                user.purchasedBooks.push({
                  bookId: book._id,
                  bookTitle: book.title,
                  purchaseDate: new Date(),
                });
                await user.save({ validateModifiedOnly: true });

                // Decrement stock for purchase
                book.quantity = Math.max(0, book.quantity - 1);
                book.availability = book.quantity > 0;
                await book.save({ validateModifiedOnly: true });

                console.log(`Book purchase processed via Webhook for user ${user.email}, book: ${book.title}`);
                console.log("💰 Webhook verified and lowercased action state safely processed:", action);

                // Send purchase thank you email
                try {
                  const subject = `Thank you for purchasing "${book.title}"!`;
                  const message = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
                      <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
                        <h1 style="color: #1e3a8a; margin: 0;">Library Management System</h1>
                        <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">Secure Digital Purchase Confirmation</p>
                      </div>
                      
                      <h2 style="color: #10b981; font-weight: bold; margin-top: 0;">Thank you for your purchase!</h2>
                      <p style="color: #374151; font-size: 16px; line-height: 1.5;">
                        Hello <strong>${user.name}</strong>,
                      </p>
                      <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                        Your purchase of the digital e-book <strong>"${book.title}"</strong> by <strong>${book.author}</strong> has been processed successfully. 
                      </p>
                      
                      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <h4 style="margin: 0 0 8px 0; color: #1f2937;">Transaction Details</h4>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4b5563;">
                          <tr>
                            <td style="padding: 4px 0;"><strong>Book Title:</strong></td>
                            <td style="padding: 4px 0; text-align: right;">${book.title}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0;"><strong>Author:</strong></td>
                            <td style="padding: 4px 0; text-align: right;">${book.author}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0;"><strong>Amount Paid:</strong></td>
                            <td style="padding: 4px 0; text-align: right; color: #1e3a8a; font-weight: bold;">₹${book.purchasePrice || 300}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0;"><strong>Access:</strong></td>
                            <td style="padding: 4px 0; text-align: right; color: #10b981; font-weight: bold;">Lifetime Digital PDF</td>
                          </tr>
                        </table>
                      </div>

                      <p style="color: #374151; font-size: 15px; line-height: 1.5;">
                        You can read the e-book online or download it as a PDF at any time. Simply navigate to the <strong>My Bookshelf</strong> or <strong>My Borrowed Books</strong> tab (under "Purchased E-Books") in your dashboard.
                      </p>
                      
                      <p style="color: #374151; font-size: 15px; line-height: 1.5; margin-top: 25px;">
                        Happy Reading!<br>
                        <strong>The Library Management Team</strong>
                      </p>
                      
                      <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px; font-size: 12px; color: #9ca3af;">
                        This is an automated purchase receipt. Please do not reply directly to this email.
                      </div>
                    </div>
                  `;

                  await sendEmail({
                    email: user.email,
                    subject,
                    message
                  });
                  console.log(`Purchase success email sent successfully to: ${user.email}`);
                } catch (emailErr) {
                  console.error("Error sending purchase success email:", emailErr);
                }
              } else if (action === 'rent' || action === 'borrow') {
                const borrowedDate = new Date();
                const dueDate = new Date(borrowedDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

                user.borrowedBooks.push({
                  bookId: book._id,
                  bookTitle: book.title,
                  borrowedDate,
                  dueDate,
                  returned: false,
                });
                await user.save({ validateModifiedOnly: true });

                await Borrow.create({
                  user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                  },
                  book: book._id,
                  dueDate,
                  price: book.rentPrice
                });

                book.quantity = Math.max(0, book.quantity - 1);
                book.availability = book.quantity > 0;
                await book.save({ validateModifiedOnly: true });

                console.log(`Book rental processed via Webhook for user ${user.email}, book: ${book.title}`);
                console.log("💰 Webhook verified and lowercased action state safely processed:", action);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing payment intent webhook:', err);
    }
  }

  res.json({ received: true });
};
