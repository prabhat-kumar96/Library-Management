import React from "react";
import { createPortal } from "react-dom";
import { X, BookOpen, AlertCircle, Download } from "lucide-react";

const ReadBookPopup = ({ isOpen, onClose, book }) => {
  if (!isOpen || !book) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    const url = book.bookPdf?.url;
    if (!url) return;
    const filename = `${book.title}.pdf`;

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
      console.error("Direct download failed, falling back to window.open:", error);
      const fallbackUrl = url.includes("cloudinary.com") ? url.replace("/upload/", "/upload/fl_attachment/") : url;
      window.open(fallbackUrl, "_blank");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center flex-shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <BookOpen className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold line-clamp-1">{book.title}</h2>
              <p className="text-xs text-gray-400 font-medium">By {book.author}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {book.bookPdf && book.bookPdf.url && (
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md mr-1"
              >
                <Download size={14} /> Download PDF
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* PDF Viewer Area */}
        <div className="flex-1 bg-gray-100 relative w-full h-full overflow-hidden">
          {book.bookPdf && book.bookPdf.url ? (
            
            /* 🚀 The Magic iFrame with Google Viewer! */
            /* We encode your Cloudinary URL and pass it to Google so it renders inline securely */
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(book.bookPdf.url)}&embedded=true`}
              className="w-full h-full border-none"
              title={book.title}
            ></iframe>

          ) : (
            /* Fallback if Admin hasn't uploaded a PDF yet */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Digital Copy Not Available</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                The digital PDF version of <strong>{book.title}</strong> has not been uploaded to the system yet. Please contact the librarian or check back later.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ReadBookPopup;