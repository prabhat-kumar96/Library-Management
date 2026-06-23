import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../api/api";
import { toast } from "react-toastify";
import { 
  BookOpen, 
  Bookmark, 
  CheckCircle, 
  Sparkles, 
  X, 
  Plus, 
  Loader2, 
  ArrowRight, 
  HelpCircle,
  Tag
} from "lucide-react";
import { getUser } from "../store/slices/authSlice";



const MyBookshelf = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // States for bookshelves
  const [currentlyReading, setCurrentlyReading] = useState([]);
  const [wantToRead, setWantToRead] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(false);

  // States for favorite genres
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [newGenreInput, setNewGenreInput] = useState("");
  const [isUpdatingGenres, setIsUpdatingGenres] = useState(false);
  const [activeDropdownBookId, setActiveDropdownBookId] = useState(null);

  useEffect(() => {
    fetchBookshelves();
    if (user?.favorite_genres) {
      setFavoriteGenres(user.favorite_genres);
    }
  }, [user]);

  // 1. Fetch user populated shelves
  const fetchBookshelves = async () => {
    setLoadingShelves(true);
    try {
      const res = await api.get("/api/user/shelves");
      if (res.data.success) {
        setCurrentlyReading(res.data.currently_reading || []);
        setWantToRead(res.data.want_to_read || []);
        setCompleted(res.data.completed || []);
      }
    } catch (err) {
      console.error("Failed to fetch shelves:", err);
      toast.error("Could not load bookshelves");
    } finally {
      setLoadingShelves(false);
    }
  };

  // 2. Add / Delete Genres in Profile Preferences
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
      const res = await api.put(
        "/api/user/preferences", 
        { favorite_genres: updatedList }
      );
      if (res.data.success) {
        setFavoriteGenres(updatedList);
        // Refresh global Redux user state
        dispatch(getUser());
        toast.success("Favorite genres updated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update genres");
    } finally {
      setIsUpdatingGenres(false);
      setNewGenreInput("");
    }
  };

  // 3. Move book to different shelf (WANT_TO_READ, CURRENTLY_READING, COMPLETED)
  const handleMoveShelf = async (bookId, title, targetStatus) => {
    try {
      const res = await api.post(
        "/api/user/shelf", 
        { bookId, status: targetStatus }
      );
      if (res.data.success) {
        toast.success(`Moved "${title}" on your bookshelf!`);
        fetchBookshelves();
        dispatch(getUser()); // Sync reading history updates
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to move book");
    }
  };

  const handleRemoveFromShelf = async (bookId, title) => {
    try {
      const res = await api.post(
        "/api/user/shelf", 
        { bookId, status: "REMOVE" }
      );
      if (res.data.success) {
        toast.success(`Removed "${title}" from shelves!`);
        fetchBookshelves();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove book");
    }
  };

  // Helper to determine reading progress bar percent based on ID
  const getProgressPercent = (bookId) => {
    if (!bookId) return 30;
    const charCodeSum = bookId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (charCodeSum % 60) + 15; // Returns consistent progress between 15% and 75%
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto p-2">
      
      {/* ==============================================================
          HEADER: GENRE MANAGEMENT & BOOKSHELF METADATA
         ============================================================== */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            My Personal Bookshelves
          </h2>
          <p className="text-sm text-gray-500 mt-1">Organize your reading catalog and adjust your AI preferences</p>
        </div>

        {/* Favorite Genres Chip Widget */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/50 w-full md:max-w-md">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-blue-500" /> AI Recommendation Focus Categories
          </label>
          
          <div className="flex flex-wrap gap-1.5 mb-3">
            {favoriteGenres.map((genre) => (
              <span 
                key={genre} 
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 transition-all duration-200"
              >
                {genre}
                <button 
                  onClick={() => handleRemoveGenre(genre)} 
                  className="ml-1.5 text-blue-400 hover:text-blue-600 focus:outline-none"
                  disabled={isUpdatingGenres}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {favoriteGenres.length === 0 && (
              <span className="text-xs italic text-gray-400">Add categories below...</span>
            )}
          </div>

          <form onSubmit={handleAddGenre} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Distributed Systems, Sci-Fi..." 
              value={newGenreInput}
              onChange={(e) => setNewGenreInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white"
              disabled={isUpdatingGenres}
            />
            <button 
              type="submit" 
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center transition-colors shadow-sm"
              disabled={isUpdatingGenres}
            >
              {isUpdatingGenres ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </form>
        </div>
      </div>

      {loadingShelves ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/55 rounded-2xl border border-gray-200/50">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-500">Loading your bookshelves...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ==============================================================
              SECTION 1: CURRENTLY READING
             ============================================================== */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <BookOpen className="w-5 h-5 text-sky-500" />
              Currently Reading ({currentlyReading.length})
            </h3>
            
            {currentlyReading.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentlyReading.map((book) => {
                  const progress = getProgressPercent(book._id);
                  return (
                    <div key={book._id} className="flex bg-gray-50 border border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="w-24 bg-gray-100 flex-shrink-0">
                        {book.frontCover?.url ? (
                          <img src={book.frontCover.url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-[10px] text-gray-400 font-bold p-2 text-center">No Cover</div>
                        )}
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-sm line-clamp-1">{book.title}</h4>
                          <span className="text-[10px] text-gray-500 block mb-2">By {book.author}</span>
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-sky-100 text-sky-800 rounded">
                            {book.category}
                          </span>
                        </div>

                        {/* Interactive Reading Progress Indicator */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-1">
                            <span>Reading Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2 relative">
                          <button
                            onClick={() => handleMoveShelf(book._id, book.title, "COMPLETED")}
                            className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                          </button>
                          
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownBookId(activeDropdownBookId === book._id ? null : book._id);
                              }}
                              className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                            >
                              ⚙️
                            </button>
                            {activeDropdownBookId === book._id && (
                              <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-1 z-50 min-w-[150px] text-gray-800 flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => { handleMoveShelf(book._id, book.title, "WANT_TO_READ"); setActiveDropdownBookId(null); }}
                                  className="w-full px-3 py-1.5 hover:bg-amber-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-amber-700"
                                >
                                  📌 Want to Read
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { handleMoveShelf(book._id, book.title, "COMPLETED"); setActiveDropdownBookId(null); }}
                                  className="w-full px-3 py-1.5 hover:bg-emerald-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-emerald-700"
                                >
                                  ✅ Completed / Read
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  type="button"
                                  onClick={() => { handleRemoveFromShelf(book._id, book.title); setActiveDropdownBookId(null); }}
                                  className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                                >
                                  ❌ Drop from Shelf
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-semibold">No books on your 'Currently Reading' shelf.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Move books from your 'Want to Read' shelf below to get started!</p>
              </div>
            )}
          </div>

          {/* ==============================================================
              SECTION 2: WANT TO READ
             ============================================================== */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <Bookmark className="w-5 h-5 text-amber-500" />
              Want to Read ({wantToRead.length})
            </h3>

            {wantToRead.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wantToRead.map((book) => (
                  <div key={book._id} className="flex bg-gray-50 border border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="w-24 bg-gray-100 flex-shrink-0">
                      {book.frontCover?.url ? (
                        <img src={book.frontCover.url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-[10px] text-gray-400 font-bold p-2 text-center">No Cover</div>
                      )}
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-sm line-clamp-1">{book.title}</h4>
                        <span className="text-[10px] text-gray-500 block mb-2">By {book.author}</span>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                          {book.category}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2 relative">
                        <button
                          onClick={() => handleMoveShelf(book._id, book.title, "CURRENTLY_READING")}
                          className="flex-1 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Start Reading <ArrowRight className="w-3 h-3" />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownBookId(activeDropdownBookId === book._id ? null : book._id);
                            }}
                            className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                          >
                            ⚙️
                          </button>
                          {activeDropdownBookId === book._id && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-1 z-50 min-w-[150px] text-gray-800 flex flex-col">
                              <button
                                type="button"
                                onClick={() => { handleMoveShelf(book._id, book.title, "CURRENTLY_READING"); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-blue-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-blue-700"
                              >
                                📖 Currently Reading
                              </button>
                              <button
                                type="button"
                                onClick={() => { handleMoveShelf(book._id, book.title, "COMPLETED"); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-emerald-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-emerald-700"
                              >
                                ✅ Completed / Read
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                type="button"
                                onClick={() => { handleRemoveFromShelf(book._id, book.title); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                              >
                                ❌ Drop from Shelf
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-semibold">No books on your 'Want to Read' shelf.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Explore the catalog or AI suggestions to add items here!</p>
              </div>
            )}
          </div>

          {/* ==============================================================
              SECTION 3: FINISHED / COMPLETED
             ============================================================== */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Finished & Completed ({completed.length})
            </h3>

            {completed.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completed.map((book) => (
                  <div key={book._id} className="flex bg-gray-50 border border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all opacity-85">
                    <div className="w-24 bg-gray-100 flex-shrink-0 relative">
                      {book.frontCover?.url ? (
                        <img src={book.frontCover.url} alt={book.title} className="w-full h-full object-cover grayscale-[30%]" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-[10px] text-gray-400 font-bold p-2 text-center">No Cover</div>
                      )}
                      
                      <div className="absolute top-1 left-1">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500 text-white shadow-sm flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Done
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-sm line-clamp-1 line-through text-gray-500">{book.title}</h4>
                        <span className="text-[10px] text-gray-400 block mb-2">By {book.author}</span>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          {book.category}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 relative">
                        <span className="text-emerald-600 font-extrabold text-[10px] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> You've read this!
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownBookId(activeDropdownBookId === book._id ? null : book._id);
                            }}
                            className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                          >
                            ⚙️
                          </button>
                          {activeDropdownBookId === book._id && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-1 z-50 min-w-[150px] text-gray-800 flex flex-col">
                              <button
                                type="button"
                                onClick={() => { handleMoveShelf(book._id, book.title, "WANT_TO_READ"); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-amber-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-amber-700"
                              >
                                📌 Want to Read
                              </button>
                              <button
                                type="button"
                                onClick={() => { handleMoveShelf(book._id, book.title, "CURRENTLY_READING"); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-blue-50 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors text-gray-700 hover:text-blue-700"
                              >
                                📖 Currently Reading
                              </button>
                              <div className="border-t border-gray-100 my-1"></div>
                              <button
                                type="button"
                                onClick={() => { handleRemoveFromShelf(book._id, book.title); setActiveDropdownBookId(null); }}
                                className="w-full px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg text-left text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                              >
                                ❌ Drop from Shelf
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-semibold">No completed books yet.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Keep reading and check them off to complete your collection!</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default MyBookshelf;
