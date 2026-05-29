import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Sparkles,
  Send,
  BookOpen,
  Loader2,
  HelpCircle,
  ThumbsUp
} from "lucide-react";

const BACKEND_URL = "http://localhost:4000";

const AILibrarian = () => {
  const { user } = useSelector((state) => state.auth);

  // States for recommendations
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [recommendationMarkdown, setRecommendationMarkdown] = useState("");
  const [recommendedBooks, setRecommendedBooks] = useState([]);

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

  const quickReplies = [
    "Tell me about 'Clean Code' by Robert C. Martin",
    "What books do you have on Distributed Systems?",
    "How do I write readable functions?",
    "Show me recommendations based on my genres"
  ];

  useEffect(() => {
    fetchInitialRecommendations();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchInitialRecommendations = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/user/recommendations`, {}, { withCredentials: true });
      if (res.data.success && res.data.recommendation) {
        setRecommendationMarkdown(res.data.recommendation);
        setRecommendedBooks(res.data.recommended_books || []);
      }
    } catch (err) {
      console.log("No previous recommendations found.");
    }
  };

  const generateRecommendations = async () => {
    // FIX 1: Explicit Loading Guard Gate
    // If a request is already mid-flight, completely ignore subsequent clicks
    if (isGeneratingRecs) return;

    setIsGeneratingRecs(true); // Lock the gate immediately
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/user/recommendations`,
        {},
        {
          withCredentials: true,
          // FIX 2: Set frontend timeout higher than backend dual-fallback processing time
          // This prevents Axios from silently duplicating the request when it gets impatient
          timeout: 30000
        }
      );
      if (res.data.success) {
        setRecommendationMarkdown(res.data.recommendation);
        setRecommendedBooks(res.data.recommended_books || []);
        toast.success("Fresh AI recommendations loaded!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate recommendations. Ensure AI microservice is running.");
    } finally {
      setIsGeneratingRecs(false); // Open the gate back up when finished
    }
  };

  const handleSendChat = async (textToSend) => {
    const text = textToSend || chatInput.trim();
    if (!text || isSendingChat) return;

    if (!textToSend) setChatInput("");

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
        generateRecommendations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to borrow "${title}"`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-12rem)] w-full text-gray-800">

      {/* LEFT COLUMN: REFACTOR EXTENDED EXPANISVE AI RECOMMENDATION BOX */}
      <div className="flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-lg p-5 min-h-0 h-full">

        {/* Title Block */}
        <div className="flex items-center space-x-3 mb-5 flex-shrink-0">
          <div className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Personalized RAG Recommendations</h2>
            <p className="text-xs text-gray-500 font-medium">Real-time profile fusion with library vector database</p>
          </div>
        </div>

        {/* Glow Action Recommendation Button with Loading Guards */}
        <button
          onClick={generateRecommendations}
          // FIX 3: HTML level disabling to prevent multiple accidental clicks
          disabled={isGeneratingRecs}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none mb-4 relative overflow-hidden group flex-shrink-0"
        >
          {isGeneratingRecs ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Vector Dimensions...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>Generate AI RAG Recommendations</span>
            </>
          )}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        {/* Recommendation Result Display View */}
        {recommendationMarkdown ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
            <div className="flex-1 bg-indigo-50/45 border border-indigo-100/55 rounded-xl p-5 text-xs text-gray-700 leading-relaxed font-normal shadow-inner whitespace-pre-line overflow-y-auto">
              <div className="flex items-center space-x-2 text-indigo-700 font-bold mb-3 sticky top-0 bg-transparent">
                <ThumbsUp className="w-4 h-4" />
                <span>AI Recommendation Reasoning:</span>
              </div>
              {recommendationMarkdown}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 min-h-0">
            <BookOpen className="w-10 h-10 text-gray-300 mb-2 animate-pulse" />
            <p className="text-xs font-bold text-gray-500">Your AI Suggestion Feed is Empty</p>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[280px]">Click above to evaluate your profile against the vector database entries.</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: SMART LIBRARY AI CHAT ASSISTANT */}
      <div className="flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-lg p-5 min-h-0 h-full">

        {/* Chat Header */}
        <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-100 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 custom-scrollbar text-xs min-h-0">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-line leading-relaxed shadow-sm ${msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200/40"
                  }`}
              >
                {msg.text}

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
        <div className="mb-3 flex-shrink-0">
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
          className="flex gap-2 items-center bg-gray-50 border border-gray-300 rounded-xl p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 focus-within:outline-none transition-all flex-shrink-0"
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