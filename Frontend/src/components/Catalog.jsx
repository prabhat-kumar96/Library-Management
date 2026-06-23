import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, Library, BookOpen } from "lucide-react";
import { getAllBooks, setSearchQuery } from "../store/slices/bookSlice"; 
import BookDetailsPopup from "../popups/BookDetailsPopup";
import { searchBooksWithAI } from "../store/slices/bookSlice";
import { toast } from "react-toastify";

const Catalog = () => {
  const dispatch = useDispatch();
  
  const { books, loading, searchQuery } = useSelector((state) => state.books);
  const [selectedBook, setSelectedBook] = useState(null);

  // Fetch all books when the component loads
  useEffect(() => {
    dispatch(getAllBooks());
  }, [dispatch]);

  // Real-time filtering logic using the global searchQuery
  const filteredBooks = books.filter((book) => {
    const query = searchQuery || ""; // Fallback to empty string if null
    return (
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      book.author.toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Library className="text-blue-600" /> Library Catalog
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Browse and search our entire collection
          </p>
        </div>

       {/* You will need to import searchBooksWithAI from your bookSlice at the top of the file! */}
{/* import { getAllBooks, setSearchQuery, searchBooksWithAI } from "../store/slices/bookSlice";  */}

{/* Local Search Bar & AI Button */}
<div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
  <div className="relative w-full md:w-80">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search className="h-5 w-5 text-gray-400" />
    </div>
    <input
      type="text"
      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
      placeholder="Search title, author, or vibe..."
      value={searchQuery || ""}
      onChange={(e) => {
        dispatch(setSearchQuery(e.target.value));
        // If they clear the search bar, fetch all normal books again
        if (e.target.value === "") {
          dispatch(getAllBooks());
        }
      }}
    />
  </div>
  
  {/* ✨ The Magic AI Search Button */}
  <button 
    onClick={() => {
      if (searchQuery && searchQuery.trim() !== "") {
        dispatch(searchBooksWithAI(searchQuery));
      } else {
        toast.info("Please enter a vibe or topic to search!");
      }
    }}
    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
  >
    ✨ AI Vibe Search
  </button>
</div>
      </div>

      {/* Book Grid */}
      {loading && books.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No books found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 group flex flex-col"
            >
              {/* 🖼️ BOOK COVER AREA */}
              <div className="h-56 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-center relative overflow-hidden">
                
                {/* Dynamically show the Image or the Icon */}
                {book.frontCover && book.frontCover.url ? (
                  <img 
                    src={book.frontCover.url} 
                    alt={book.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <BookOpen className="w-16 h-16 text-blue-200 group-hover:scale-110 transition-transform duration-300" />
                )}

                {/* Stock Badge Overlay */}
                <div className="absolute top-3 right-3 z-10">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-md shadow-sm backdrop-blur-md ${
                      book.quantity > 5
                        ? "bg-green-500/90 text-white"
                        : book.quantity > 0
                          ? "bg-yellow-500/90 text-white"
                          : "bg-red-500/90 text-white"
                    }`}
                  >
                    {book.quantity > 0
                      ? `${book.quantity} in stock`
                      : "Out of stock"}
                  </span>
                </div>
              </div>

              {/* Book Details */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <h3
                    className="text-lg font-bold text-gray-900 line-clamp-1"
                    title={book.title}
                  >
                    {book.title}
                  </h3>
                </div>
                <p className="text-sm font-semibold text-blue-600 mb-3">
                  {book.author}
                </p>

                <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                  {book.description}
                </p>

                {/* Footer of Card */}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-end mt-auto">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-blue-600">Rent: ₹{book.rentPrice || 0}</span>
                    <span className="text-sm font-bold text-green-600">Buy: ₹{book.purchasePrice || 0}</span>
                  </div>
                  <button
                    onClick={() => setSelectedBook(book)}
                    disabled={book.quantity === 0}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <BookDetailsPopup 
        book={selectedBook} 
        onClose={() => setSelectedBook(null)} 
      />
    </div>
  );
};

export default Catalog;