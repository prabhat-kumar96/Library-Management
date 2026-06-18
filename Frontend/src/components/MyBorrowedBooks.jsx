import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BookMarked, Clock, CheckCircle, AlertCircle, Calendar, BookOpen, ShoppingBag, Library, Download } from "lucide-react";
import { toast } from "react-toastify";

// Import your existing ReadBookPopup and the getAllBooks action
import ReadBookPopup from "../popups/ReadBookPopup"; 
import { getAllBooks } from "../store/slices/bookSlice";

const MyBorrowedBooks = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { books } = useSelector((state) => state.books);
  
  // States for Tabs and PDF Reader
  const [activeTab, setActiveTab] = useState("rented"); // "rented" or "purchased"
  const [bookToRead, setBookToRead] = useState(null);
  
  useEffect(() => {
    dispatch(getAllBooks());
  }, [dispatch]);

  // 1. Extract and Sort Rented Books
  const borrowedBooks = user?.borrowedBooks || [];
  const sortedRentedBooks = [...borrowedBooks].sort((a, b) => {
    if (a.returned === b.returned) {
      return new Date(b.dueDate) - new Date(a.dueDate); 
    }
    return a.returned ? 1 : -1; 
  });

  // 2. Extract and Sort Purchased Books
  const purchasedBooks = user?.purchasedBooks || [];
  const sortedPurchasedBooks = [...purchasedBooks].sort((a, b) => {
    return new Date(b.purchaseDate) - new Date(a.purchaseDate);
  });

  const handleDownload = async (url, title) => {
    const filename = `${title}.pdf`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      const fallbackUrl = url.includes("cloudinary.com") ? url.replace("/upload/", "/upload/fl_attachment/") : url;
      window.open(fallbackUrl, "_blank");
    }
  };

  const getStatusBadge = (returned, dueDate) => {
    if (returned) {
      return (
        <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">
          <CheckCircle size={14} /> Returned
        </span>
      );
    }
    if (new Date() > new Date(dueDate)) {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit animate-pulse">
          <AlertCircle size={14} /> Overdue
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">
        <Clock size={14} /> Rented
      </span>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      
      {/* Header Section */}
      <div className="mb-6 pb-4">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1">
          <Library className="text-blue-600" size={28} /> My Library
        </h2>
        <p className="text-sm text-gray-500">
          Manage your rented physical books and read your purchased e-books.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab("rented")}
          className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${
            activeTab === "rented" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <BookMarked size={18} /> RENTED BOOKS
          </div>
          {activeTab === "rented" && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>

        <button 
          onClick={() => setActiveTab("purchased")}
          className={`pb-3 font-bold text-sm tracking-wide transition-colors relative ${
            activeTab === "purchased" ? "text-green-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} /> PURCHASED E-BOOKS
          </div>
          {activeTab === "purchased" && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>}
        </button>
      </div>

      {/* ======================================= */}
      {/* TAB CONTENT: RENTED BOOKS (Physical)    */}
      {/* ======================================= */}
      {activeTab === "rented" && (
        <div className="space-y-4 animate-fadeIn">
          {sortedRentedBooks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <BookMarked className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No rented books yet</h3>
              <p className="mt-1 text-gray-500 text-sm">Rent physical books from the catalog.</p>
            </div>
          ) : (
            sortedRentedBooks.map((record) => (
              <div 
                key={record._id} 
                className={`p-5 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !record.returned && new Date() > new Date(record.dueDate)
                    ? 'bg-red-50/30 border-red-100' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-indigo-50 rounded shadow-sm flex items-center justify-center flex-shrink-0 border border-blue-100/50">
                    <BookMarked className="text-blue-400 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg line-clamp-1">{record.bookTitle}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-500">Rented:</span> 
                        {new Date(record.borrowedDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-500">Due:</span> 
                        <span className={!record.returned && new Date() > new Date(record.dueDate) ? 'text-red-600 font-bold' : ''}>
                          {new Date(record.dueDate).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center gap-3">
                  {getStatusBadge(record.returned, record.dueDate)}
                  {!record.returned && new Date() > new Date(record.dueDate) && (
                    <span className="text-xs text-red-500 font-medium">Return required (Fines applying)</span>
                  )}
                  {/* NO READ BUTTON HERE - Physical Only */}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================= */}
      {/* TAB CONTENT: PURCHASED BOOKS (E-Books)  */}
      {/* ======================================= */}
      {activeTab === "purchased" && (
        <div className="space-y-4 animate-fadeIn">
          {sortedPurchasedBooks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No purchased e-books</h3>
              <p className="mt-1 text-gray-500 text-sm">Buy a book from the catalog to read the PDF here.</p>
            </div>
          ) : (
            sortedPurchasedBooks.map((record) => (
              <div 
                key={record._id} 
                className="p-5 rounded-xl border bg-white border-gray-100 hover:border-green-100 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-16 bg-gradient-to-br from-green-100 to-emerald-50 rounded shadow-sm flex items-center justify-center flex-shrink-0 border border-green-100/50">
                    <BookOpen className="text-green-500 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg line-clamp-1">{record.bookTitle}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-500">Purchased on:</span> 
                        {new Date(record.purchaseDate).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        Lifetime Access
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                  <button 
                    onClick={() => {
                      // Bulletproof PDF retrieval
                      const fullBookData = books?.find((b) => 
                        String(b._id) === String(record.bookId) || 
                        b.title?.toLowerCase() === record.bookTitle?.toLowerCase()
                      );
                      
                      if (fullBookData && fullBookData.bookPdf?.url) {
                        setBookToRead(fullBookData); 
                      } else if (fullBookData) {
                        toast.info("No PDF attached to this book yet. Please contact Admin.");
                      } else {
                        toast.warning("Still loading book data... Please try again in a moment.");
                      }
                    }}
                    className="px-5 py-2.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-black active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                  >
                    <BookOpen size={14} /> Read E-Book
                  </button>

                  {(() => {
                    const fullBookData = books?.find((b) => 
                      String(b._id) === String(record.bookId) || 
                      b.title?.toLowerCase() === record.bookTitle?.toLowerCase()
                    );
                    if (fullBookData && fullBookData.bookPdf?.url) {
                      return (
                        <button
                          onClick={() => handleDownload(fullBookData.bookPdf.url, record.bookTitle)}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wide rounded-xl active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                        >
                          <Download size={14} /> Download PDF
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Read PDF Modal */}
      <ReadBookPopup 
        isOpen={!!bookToRead}
        onClose={() => setBookToRead(null)} 
        book={bookToRead} 
      />

    </div>
  );
};

export default MyBorrowedBooks;