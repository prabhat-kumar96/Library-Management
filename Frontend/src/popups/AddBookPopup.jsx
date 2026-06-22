import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { X, BookPlus, Save, Image as ImageIcon } from "lucide-react";
import { toast } from "react-toastify";
import { addBook, updateBook, getAllBooks, clearBookErrors, clearBookMessage } from "../store/slices/bookSlice";

const AddBookPopup = ({ isOpen, onClose, bookToEdit }) => {
  const dispatch = useDispatch();
  const { saveLoading, error, message } = useSelector((state) => state.books);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState(""); // 👈 Added Category
  const [rentPrice, setRentPrice] = useState(""); // 👈 Added Rent Price
  const [purchasePrice, setPurchasePrice] = useState(""); // 👈 Added Purchase Price
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  
  const [frontCover, setFrontCover] = useState("");
  const [frontCoverPreview, setFrontCoverPreview] = useState("");
  const [bookPdf, setBookPdf] = useState("");

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title || "");
      setAuthor(bookToEdit.author || "");
      setCategory(bookToEdit.category || "");
      setRentPrice(bookToEdit.rentPrice || "");
      setPurchasePrice(bookToEdit.purchasePrice || "");
      setQuantity(bookToEdit.quantity || "");
      setDescription(bookToEdit.description || "");
      
      if(bookToEdit.frontCover?.url) {
        setFrontCoverPreview(bookToEdit.frontCover.url);
      }
    } else {
      setTitle("");
      setAuthor("");
      setCategory("");
      setRentPrice("");
      setPurchasePrice("");
      setQuantity("");
      setDescription("");
      setFrontCover("");
      setFrontCoverPreview("");
      setBookPdf(""); // Ensure PDF clears on close
    }
  }, [bookToEdit, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (error) {
      toast.error(error, { toastId: error });
      dispatch(clearBookErrors());
    }
    if (message) {
      toast.success(message, { toastId: message });
      dispatch(clearBookMessage());
      dispatch(getAllBooks());
      onClose();
    }
  }, [dispatch, error, message, isOpen, onClose]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontCover(file);
      setFrontCoverPreview(URL.createObjectURL(file)); 
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBookPdf(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("category", category); // 👈 Included
    formData.append("rentPrice", Number(rentPrice)); // 👈 Included
    formData.append("purchasePrice", Number(purchasePrice)); // 👈 Included
    formData.append("quantity", Number(quantity));
    formData.append("description", description);
    
    if (frontCover) {
      formData.append("frontCover", frontCover);
    }

    if (bookPdf) {
      formData.append("bookPdf", bookPdf);
    }

    if (bookToEdit) {
      dispatch(updateBook(bookToEdit._id, formData));
    } else {
      dispatch(addBook(formData)); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {bookToEdit ? <Save className="text-blue-600" size={20}/> : <BookPlus className="text-blue-600" size={20}/>}
            {bookToEdit ? "Edit Book Details" : "Add New Book"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* 🖼️ IMAGE UPLOAD AREA */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Front Cover Image</label>
            <div className="flex items-center gap-4">
              {frontCoverPreview ? (
                <img src={frontCoverPreview} alt="Cover Preview" className="w-16 h-24 object-cover rounded shadow-sm border border-gray-300" />
              ) : (
                <div className="w-16 h-24 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                  <ImageIcon size={24} />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition-colors cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Complete Book PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200 transition-colors cursor-pointer"
            />
            {bookToEdit?.bookPdf?.url && !bookPdf && (
              <p className="text-xs text-green-600 mt-2 font-medium">✓ A PDF is already attached to this book.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category / Genre</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="e.g. Sci-Fi, Programming" className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Price (₹)</label>
              <input type="number" min="0" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price (₹)</label>
              <input type="number" min="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Stock</label>
              <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500" />
            </div>
          </div>
          
          {/* ✨ AI-Aware Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Description 
              {bookPdf && (
                <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✨ AI Auto-Generate Enabled
                </span>
              )}
            </label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              required={!bookPdf} // 👈 Only required if no PDF is selected!
              placeholder={
                bookPdf 
                ? "Leave this blank and Gemini AI will write a professional description by reading your PDF!" 
                : "Enter book description manually..."
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-blue-500 h-24 resize-none transition-all ${
                bookPdf ? "bg-purple-50/30 border-purple-200 placeholder:text-purple-300" : ""
              }`} 
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
            <button type="submit" disabled={saveLoading} className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-70 font-medium">
              {saveLoading ? "Saving..." : (bookToEdit ? "Update Book" : "Add Book")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddBookPopup;