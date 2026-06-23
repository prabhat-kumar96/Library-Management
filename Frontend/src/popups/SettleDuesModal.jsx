import React, { useState } from "react";
import { X, CreditCard } from "lucide-react";
import { toast } from "react-toastify";
import api from "../api/api";

const SettleDuesModal = ({ isOpen, onClose, totalDue, userEmail }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async (e) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (payAmount > totalDue) {
      toast.error(`Amount cannot exceed outstanding dues of ₹${totalDue}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_email: userEmail,
        items: [
          {
            title: "Settle Outstanding Dues",
            amount: Math.round(payAmount * 100), // Convert to paisa/cents for Stripe
            currency: "inr",
            quantity: 1,
            isFinePayment: true, // Webhook will use this to identify fine settlement
          },
        ],
      };

      const res = await api.post("/api/v1/payment/create-checkout-session", payload);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("Unable to create checkout session");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Payment checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="text-blue-600" size={20} />
            Settle Outstanding Dues
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handlePayment} className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700 uppercase font-bold tracking-wider mb-1">Total Outstanding Fine</p>
            <p className="text-3xl font-black text-blue-900">₹{totalDue}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount to Pay (₹)</label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              placeholder={`Enter amount up to ₹${totalDue}`}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || totalDue <= 0}
              className="px-6 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 font-bold text-sm uppercase tracking-wider"
            >
              {loading ? "Redirecting..." : "Pay Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettleDuesModal;
