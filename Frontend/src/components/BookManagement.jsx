import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Edit, Trash2, Search, BookOpen } from "lucide-react";
import { toast } from "react-toastify";

// 👇 1. Import the clear actions here!
import { getAllBooks, deleteBook, clearBookMessage, clearBookErrors } from "../store/slices/bookSlice";

import AddBookPopup from "../popups/AddBookPopup";

const BookManagement = () => {
  const dispatch = useDispatch();
  
  // 👇 2. Grab error and message from Redux too
  const { books, loading, error, message } = useSelector((state) => state.books);

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    dispatch(getAllBooks());
  }, [dispatch]);


  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: error }); 
      dispatch(clearBookErrors());
    }
    if (message) {
      toast.success(message, { toastId: message }); 
      dispatch(clearBookMessage());
      dispatch(getAllBooks());
      setIsAddPopupOpen(false);
    }
  }, [dispatch, error, message]);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this book from the database? This action cannot be undone.")) {
      dispatch(deleteBook(id));
    }
  };

  const handleAddNew = () => {
    dispatch(clearBookMessage());
    dispatch(clearBookErrors());
    
    setSelectedBook(null); 
    setIsAddPopupOpen(true);
  };

  const handleEdit = (book) => {
    dispatch(clearBookMessage());
    dispatch(clearBookErrors());
    
    setSelectedBook(book); 
    setIsAddPopupOpen(true);
  };

  // Filter books based on search input
  const filteredBooks = books?.filter((book) =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" /> Book Inventory
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage library stock, add new arrivals, or edit pricing.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Add New Button */}
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> Add New Book
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Book Info</th>
                <th className="px-6 py-4">Pricing (Rent / Buy)</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Added On</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">Loading inventory...</td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No books found matching your search.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 line-clamp-1" title={book.title}>{book.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{book.author}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="text-blue-600 font-semibold">Rent: ₹{book.rentPrice || 0}</span>
                        <span className="text-green-600 font-semibold">Buy: ₹{book.purchasePrice || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        book.quantity > 5 ? 'bg-green-100 text-green-700' :
                        book.quantity > 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {book.quantity} {book.quantity === 1 ? 'copy' : 'copies'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(book.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        {/* Edit Button */}
                        <button 
                          onClick={() => handleEdit(book)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                          title="Edit Book"
                        >
                          <Edit size={18} />
                        </button>
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDelete(book._id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                          title="Delete Book"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render the Popup safely at the bottom */}
      <AddBookPopup 
        isOpen={isAddPopupOpen} 
        onClose={() => setIsAddPopupOpen(false)} 
        bookToEdit={selectedBook} // Pass the selected book (or null) to the popup!
      />

    </div>
  );
};

export default BookManagement;