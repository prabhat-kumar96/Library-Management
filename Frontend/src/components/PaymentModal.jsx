import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { X, CreditCard, Lock, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

// 🧼 FIXED: Hardcoded string literal ensures Windows translation extensions can't corrupt your key values anymore
const REAL_KEY = "pk_test_51Tjkv7EsymBnEunStatWjgrwbHJdIIQeumArPT5RCEsU5Nk3ZxX9ha1i4APRmSeUrZRONcREOjiYAHkBB6bXcW9F00ttaheojZ";
const stripePromise = loadStripe(REAL_KEY);

const PaymentForm = ({ book, type, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  // Price calculations
  let amount = 0;
  let description = "";
  if (type === "membership") {
    amount = 500;
    description = "Annual Library Premium Membership Plan";
  } else if (book) {
    if (type === "buy" || type === "Purchase") {
      amount = book.purchasePrice || 300;
      description = `Purchase E-Book: ${book.title}`;
    } else if (type === "rent" || type === "Borrow") {
      amount = book.rentPrice || 30;
      description = `7-Day Physical Rental: ${book.title}`;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe has not loaded yet. Please try again.");
      return;
    }

    setLoading(true);
    const cardElement = elements.getElement(CardElement);

    try {
      // 1. Call Backend to create PaymentIntent
      const BACKEND_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000";
      const payload = {
        bookId: book ? book._id : undefined,
        type: type,
      };

      const res = await axios.post(
        `${BACKEND_URL}/api/v1/payment/create-intent`,
        payload,
        { withCredentials: true }
      );

      const clientSecret = res.data?.clientSecret;
      if (!clientSecret) {
        throw new Error("Failed to initialize transaction on backend.");
      }

      // 2. Confirm Payment on the Frontend securely (backend never touches raw card data)
      const paymentResult = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (paymentResult.error) {
        toast.error(paymentResult.error.message || "Payment verification failed.");
      } else {
        if (paymentResult.paymentIntent.status === "succeeded") {
          toast.success("Payment succeeded! Access granted.");
          if (onSuccess) {
            onSuccess();
          }
          onClose();
        } else {
          toast.warning(`Payment status: ${paymentResult.paymentIntent.status}`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || "An error occurred during payment.");
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: "#1f2937",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontSmoothing: "antialiased",
        fontSize: "15px",
        "::placeholder": {
          color: "#9ca3af",
        },
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444",
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-1 text-center">
        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
          Total Payable Amount
        </span>
        <h4 className="text-3xl font-black text-indigo-900">₹{amount}</h4>
        <p className="text-xs text-gray-500 font-medium mt-1">{description}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <CreditCard size={14} className="text-indigo-500" /> Secure Card Payment
        </label>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold border-t border-b border-gray-100 py-3 my-1">
        <span className="flex items-center gap-1">
          <Lock size={12} className="text-emerald-500" /> 256-bit SSL Encryption
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500" /> PCI-DSS Compliant
        </span>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>Processing Safe Payment...</span>
          </>
        ) : (
          <span>Confirm & Pay ₹{amount}</span>
        )}
      </button>
    </form>
  );
};

const PaymentModal = ({ isOpen, onClose, book, type, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform duration-300 border border-gray-100 relative">

        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
          <h3 className="font-extrabold text-gray-800 text-base uppercase tracking-wider flex items-center gap-2">
            <Lock className="text-indigo-600" size={18} /> Stripe Secure Checkout
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <Elements stripe={stripePromise}>
          <PaymentForm book={book} type={type} onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
};

export default PaymentModal;