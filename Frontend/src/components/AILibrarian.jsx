import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  CheckCircle, 
  Bookmark, 
  BookmarkCheck, 
  Plus, 
  X, 
  Loader2, 
  ShoppingBag,
  HelpCircle,
  Clock,
  ThumbsUp
} from "lucide-react";

const BACKEND_URL = "http://localhost:4000";

const AILibrarian = () => {
  const { user } = useSelector((state) => state.auth);

  // States for recommendations
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [newGenreInput, setNewGenreInput] = useState("");
  const [isUpdatingGenres, setIsUpdatingGenres] = useState(false);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [recommendationMarkdown, setRecommendationMarkdown] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [userProfileMetadata, setUserProfileMetadata] = useState(null);

  // States for chat
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: `Hello ${user?.name || "Reader"}! I am your AI Librarian. Ask me anything about our books, or request personalized reading recommendations in the panel to the left!`,
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef(null);

  // Suggested questions
  const quickReplies = [
    "Tell me about 'Clean Code' by Robert C. Martin",
    "What books do you have on Distributed Systems?",
    "How do I write readable functions?",
    "Show me recommendations based on my genres"
  ];

  // Fetch initial preferences & recommendations
  useEffect(() => {
    fetchProfilePreferences();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch user favorite genres and shelves
  const fetchProfilePreferences = async () => {
    try {
      // Fetching from `/api/user/recommendations` triggers the pipeline and returns current user state
      const res = await axios.post(`${BACKEND_URL}/api/user/recommendations`, {}, { withCredentials: true });
      if (res.data.success) {
        setFavoriteGenres(res.data.profile_metadata?.favorite_genres || []);
        setUserProfileMetadata(res.data.profile_metadata);
        if (res.data.recommendation) {
          setRecommendationMarkdown(res.data.recommendation);
          setRecommendedBooks(res.data.recommended_books || []);
        }
      }
    } catch (err) {
      // First load might not have recommendations, just catch silently or load user favorites
      if (user?.favorite_genres) {
        setFavoriteGenres(user.favorite_genres);
      }
    }
  };

  // 2. Update favorite genres in MongoDB
  const handleAddGenre = async (e) => {
    e.preventDefault();
    const genre = newGenreInput.trim();
    if (!genre) return;
    if (favoriteGenres.includes(genre)) {
      setNewGenreInput("");
      return;
    }

    const updated = [...favoriteGenres, genre];
    await saveGenres(updated);
  };

  const handleRemoveGenre = async (genreToRemove) => {
    const updated = favoriteGenres.filter(g => g !== genreToRemove);
    await saveGenres(updated);
  };

  const saveGenres = async (updatedList) => {
    setIsUpdatingGenres(true);
    try {
      const res = await axios.put(
        `${BACKEND_URL}/api/user/preferences`, 
        { favorite_genres: updatedList }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setFavoriteGenres(updatedList);
        toast.success("Favorite genres updated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update genres");
    } finally {
      setIsUpdatingGenres(false);
      setNewGenreInput("");
    }
  };

  // 3. Trigger context-aware RAG recommendations
  const generateRecommendations = async () => {
    setIsGeneratingRecs(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/user/recommendations`, 
        {}, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setRecommendationMarkdown(res.data.recommendation);
        setRecommendedBooks(res.data.recommended_books || []);
        setUserProfileMetadata(res.data.profile_metadata);
        toast.success("Fresh AI recommendations loaded!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate recommendations. Ensure AI microservice is running.");
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  // 4. General Q&A Chat submit
  const handleSendChat = async (textToSend) => {
    const text = textToSend || chatInput.trim();
    if (!text) return;

    if (!textToSend) setChatInput("");

    // Add user message to state
    setChatMessages(prev => [...prev, { sender: "user", text, timestamp: new Date() }]);
    setIsSendingChat(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/ai/ask`, 
        { question: text }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setChatMessages(prev => [
          ...prev, 
          { 
            sender: "bot", 
            text: res.data.answer, 
            books: res.data.retrieved_books,
            timestamp: new Date() 
          }
        ]);
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev, 
        { 
          sender: "bot", 
          text: `⚠️ I encountered an error communicating with the RAG microservice. Please ensure it is running on port 8000.\n\nError: ${err.message}`, 
          timestamp: new Date() 
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // 5. Checkout/Borrow book directly from recommendation card
  const handleBorrowBook = async (bookId, title) => {
    if (!user?.email) {
      toast.error("Please login to borrow books");
      return;
    }
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/borrow/record-borrow-book/${bookId}`, 
        { email: user.email }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(`Successfully checked out: ${title}!`);
        // Refresh live inventory statuses
        generateRecommendations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to borrow "${title}"`);
    }
  };

  // 6. Tag book shelf status (WANT_TO_READ, CURRENTLY_READING, COMPLETED)
  const handleTagShelf = async (bookId, title, status) => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/user/shelf`, 
        { bookId, status }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(`Tagged "${title}" on your '${status.replace("_", " ")}' shelf!`);
        fetchProfilePreferences();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update shelf status");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] w-full text-gray-800">
      
      {/* ==============================================================
          LEFT PANEL: PERSONALIZED RAG RECOMMENDATION ENGINE
         ============================================================== */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-lg p-5 overflow-y-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Personalized RAG Engine</h2>
            <p className="text-xs text-gray-500">Real-time user state fused with vector catalog</p>
          </div>
        </div>

        {/* 1. Favorite Genres Config */}
        <div className="mb-5 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">My Favorite Genres</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {favoriteGenres.map((genre) => (
              <span 
                key={genre} 
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/50 group transition-all duration-200"
              >
                {genre}
                <button 
                  onClick={() => handleRemoveGenre(genre)} 
                  className="ml-2 text-indigo-400 hover:text-indigo-600 focus:outline-none transition-colors"
                  disabled={isUpdatingGenres}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {favoriteGenres.length === 0 && (
              <span className="text-xs italic text-gray-400">No favorite genres added yet.</span>
            )}
          </div>

          <form onSubmit={handleAddGenre} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Distributed Systems, Sci-Fi..." 
              value={newGenreInput}
              onChange={(e) => setNewGenreInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-white transition-all"
              disabled={isUpdatingGenres}
            />
            <button 
              type="submit" 
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
              disabled={isUpdatingGenres}
            >
              {isUpdatingGenres ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* 2. Live Reading Profile Shelves */}
        {userProfileMetadata && (
          <div className="grid grid-cols-3 gap-3 mb-5 text-center">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">Read</span>
              <span className="text-lg font-extrabold text-emerald-800">{userProfileMetadata.already_read?.length || 0}</span>
            </div>
            <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block mb-0.5">Reading</span>
              <span className="text-lg font-extrabold text-sky-800">{userProfileMetadata.currently_reading?.length || 0}</span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-0.5">Want to Read</span>
              <span className="text-lg font-extrabold text-amber-800">{userProfileMetadata.want_to_read?.length || 0}</span>
            </div>
          </div>
        )}

        {/* 3. Action trigger button */}
        <button 
          onClick={generateRecommendations}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-95 shadow-md flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none mb-5"
          disabled={isGeneratingRecs}
        >
          {isGeneratingRecs ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Vectors & Profile State...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>Generate AI RAG Recommendations</span>
            </>
          )}
        </button>

        {/* 4. Recommendation Output */}
        {recommendationMarkdown ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Reasoning text */}
            <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed font-normal shadow-inner whitespace-pre-line">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold mb-2">
                <ThumbsUp className="w-4 h-4" />
                <span>AI Librarian Recommendations Logic:</span>
              </div>
              {recommendationMarkdown}
            </div>

            {/* Visual Book cards with MongoDB inventory tracking */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Recommended Book Status Center</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedBooks.map((book) => (
                  <div key={book.rag_id || book._id} className="flex bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                    
                    {/* Cover Photo */}
                    <div className="w-24 bg-gray-100 flex-shrink-0 relative">
                      {book.frontCover?.url ? (
                        <img 
                          src={book.frontCover.url} 
                          alt={book.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-gray-200 to-gray-300 text-gray-500 font-bold text-[10px] text-center p-2">
                          No Cover
                        </div>
                      )}
                      
                      {/* Live Badge */}
                      <div className="absolute top-1 left-1">
                        {book.is_issued ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-amber-500 text-white shadow-sm flex items-center gap-0.5">
                            <Clock className="w-2 h-2" /> Held
                          </span>
                        ) : book.availability && book.quantity > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500 text-white shadow-sm">
                            Ready
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-red-500 text-white shadow-sm">
                            Out
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-xs line-clamp-1 leading-tight">{book.title}</h4>
                        <span className="text-[10px] text-gray-500 block mb-1">By {book.author}</span>
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-gray-100 text-gray-600 rounded">
                          {book.category}
                        </span>
                      </div>

                      {/* Interactive Controls */}
                      <div className="mt-2 space-y-1">
                        {/* Shelf Tagger */}
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleTagShelf(book._id, book.title, "CURRENTLY_READING")}
                            className="flex-1 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[9px] transition-colors border border-sky-100 flex items-center justify-center gap-0.5"
                          >
                            <Bookmark className="w-2.5 h-2.5" /> Reading
                          </button>
                          <button 
                            onClick={() => handleTagShelf(book._id, book.title, "WANT_TO_READ")}
                            className="flex-1 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[9px] transition-colors border border-amber-100 flex items-center justify-center gap-0.5"
                          >
                            <BookmarkCheck className="w-2.5 h-2.5" /> Want Read
                          </button>
                        </div>

                        {/* Borrow Button */}
                        {book.is_issued ? (
                          <div className="w-full py-1 text-center bg-gray-100 text-gray-500 font-bold text-[9px] rounded border border-gray-200">
                            Currently Borrowed by You
                          </div>
                        ) : book.availability && book.quantity > 0 ? (
                          <button
                            onClick={() => handleBorrowBook(book._id, book.title)}
                            className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded flex items-center justify-center gap-1 shadow-sm transition-colors"
                          >
                            <ShoppingBag className="w-2.5 h-2.5" /> Borrow (Qty: {book.quantity})
                          </button>
                        ) : (
                          <div className="w-full py-1 text-center bg-red-50 text-red-500 font-bold text-[9px] rounded border border-red-100">
                            Out of Stock
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
            <BookOpen className="w-12 h-12 text-gray-300 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-gray-500">Your Shelf is Empty</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Add your favorite genres and hit generating recommendations to populate your reading suggestion dashboard.</p>
          </div>
        )}
      </div>

      {/* ==============================================================
          RIGHT PANEL: INTERACTIVE Q&A CONVERSATIONAL CHAT
         ============================================================== */}
      <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-lg p-5">
        
        {/* Chat Header */}
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-sm">
            AI
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 leading-tight">Smart Library AI Assistant</h3>
            <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live RAG Chat Enabled
            </span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 custom-scrollbar text-xs">
          {chatMessages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-line leading-relaxed shadow-sm ${
                  msg.sender === "user" 
                    ? "bg-indigo-600 text-white rounded-br-none" 
                    : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200/40"
                }`}
              >
                {msg.text}

                {/* Display books returned by RAG in chat */}
                {msg.books && msg.books.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-200/50 space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-600 block flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Book details mentioned in search:
                    </span>
                    {msg.books.map((b) => (
                      <div key={b.book_id} className="bg-white rounded-lg p-2 border border-gray-200 flex items-center justify-between text-[11px] font-semibold text-gray-800">
                        <div>
                          <span>{b.title}</span>
                          <span className="text-[9px] text-gray-500 block">By {b.author}</span>
                        </div>
                        {b.availability && b.quantity > 0 ? (
                          <button 
                            onClick={() => handleBorrowBook(b._id, b.title)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded text-[9px] font-bold transition-colors"
                          >
                            Checkout
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-red-500">Out</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-gray-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Typing Indicator */}
          {isSendingChat && (
            <div className="flex flex-col items-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-200/40 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Quick replies suggestion chips */}
        <div className="mb-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Suggested Queries
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleSendChat(reply)}
                className="px-2.5 py-1 text-[10px] font-medium bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-100 rounded-full text-gray-600 hover:text-indigo-600 transition-all text-left"
                disabled={isSendingChat}
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Chat input box */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }} 
          className="flex gap-2 items-center bg-gray-50 border border-gray-300 rounded-xl p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:outline-none transition-all"
        >
          <input 
            type="text" 
            placeholder="Type your library inquiry..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-xs focus:outline-none"
            disabled={isSendingChat}
          />
          <button 
            type="submit" 
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
            disabled={isSendingChat || !chatInput.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
};

export default AILibrarian;
