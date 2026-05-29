import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, BookOpen, ShoppingCart, Clock } from "lucide-react";
import { createRequest, clearErrors, clearMessage } from "../store/slices/requestSlice"; 
import { toast } from "react-toastify";
import axios from 'axios';

const BookDetailsPopup = ({ book, onClose }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // 👈 Added `requests` to the destructuring to check for pending status
  const { loading, error, message, requests } = useSelector((state) => state.requests); 

  const handleRequest = (type) => {
    if (!user) {
      return toast.error("Please login to request a book");
    }
    if (type === 'Purchase') {
      // Create a Stripe Checkout session and redirect
      (async () => {
        try {
          const payload = {
            customer_email: user.email,
            items: [
              {
                title: book.title,
                amount: Math.round((book.purchasePrice || 0) * 100),
                currency: 'inr',
                quantity: 1,
                bookId: book._id,
              }
            ]
          };
          const res = await axios.post(`${import.meta.env.VITE_API_BASE || ''}/api/v1/payment/create-checkout-session`, payload, { withCredentials: true });
          if (res.data?.url) {
            window.location.href = res.data.url;
          } else {
            toast.error('Unable to create checkout session');
          }
        } catch (err) {
          console.error(err);
          toast.error(err?.response?.data?.message || err.message || 'Checkout failed');
        }
      })();
    } else {
      dispatch(createRequest(book._id, type));
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (message) {
      toast.success(message);
      dispatch(clearMessage());
      onClose(); 
    }
  }, [dispatch, error, message, onClose]);

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col md:flex-row">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-red-50 hover:text-red-600 transition-all shadow-md">
          <X size={20} />
        </button>

        <div className="md:w-5/12 bg-gray-100 flex items-center justify-center p-8">
          <img src={book.frontCover?.url || book.image?.url} alt={book.title} className="w-full max-w-[220px] rounded-lg shadow-2xl transform hover:scale-105 transition-transform duration-500" />
        </div>

        <div className="md:w-7/12 p-8 flex flex-col justify-between">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 mb-3">
              {book.category || "General"}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-1">{book.title}</h2>
            <p className="text-gray-500 italic mb-4">by <span className="text-gray-800 font-semibold">{book.author}</span></p>
            
            <div className="space-y-4 mb-6">
              <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {book.description}
                </p>
              </div>

              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Rent Price</p>
                  <p className="text-lg font-bold text-blue-600">₹{book.rentPrice}</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Buy Price</p>
                  <p className="text-lg font-bold text-green-600">₹{book.purchasePrice}</p>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">In Stock</p>
                  <p className="text-lg font-bold text-gray-800">{book.quantity}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            {user?.role === "Admin" ? (
              <p className="text-sm text-gray-400 italic text-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">Admins manage inventory via Dashboard</p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                {(() => {
                  // 1. Check if user is already renting the book (Block Renting)
                  const isRenting = user?.borrowedBooks?.some(b => String(b.bookId) === String(book._id) && !b.returned);
                  
                  // 2. Check if there are pending requests for this user & book
                  const pendingRent = requests?.some(req => String(req.book.id) === String(book._id) && String(req.user.id) === String(user?._id) && req.requestType === "Borrow" && req.status === "Pending");
                  const pendingPurchase = requests?.some(req => String(req.book.id) === String(book._id) && String(req.user.id) === String(user?._id) && req.requestType === "Purchase" && req.status === "Pending");

                  return (
                    <>
                      {/* RENT BUTTON */}
                      <button
                        onClick={() => handleRequest("Borrow")}
                        disabled={loading || book.quantity === 0 || isRenting || pendingRent}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                          pendingRent
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200 cursor-not-allowed"
                          : isRenting 
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                          : book.quantity > 0 
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {pendingRent ? <Clock size={18} /> : <BookOpen size={18} />}
                        {loading ? "Processing..." : pendingRent ? "Rent Pending" : isRenting ? "Currently Rented" : book.quantity > 0 ? "Rent Physical" : "Out of Stock"}
                      </button>

                      {/* BUY BUTTON (Unlimited Purchases Allowed) */}
                      <button
                        onClick={() => handleRequest("Purchase")}
                        disabled={loading || book.quantity === 0 || pendingPurchase}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                          pendingPurchase
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200 cursor-not-allowed"
                          : book.quantity > 0 
                          ? "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg active:scale-95" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {pendingPurchase ? <Clock size={18} /> : <ShoppingCart size={18} />}
                        {loading ? "Processing..." : pendingPurchase ? "Purchase Pending" : book.quantity > 0 ? "Buy + Soft Copy" : "Out of Stock"}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailsPopup;