import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userModel.js";
import { Book } from "../models/bookModel.js";
import { UserShelf } from "../models/userShelfModel.js";
import ErrorHandeler from "../middlewares/errorMiddlewares.js";
import axios from "axios";
import mongoose from "mongoose";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

// Helper to map RAG book_id back to Mongo Book
const resolveBookFromRagId = async (ragId) => {
  if (ragId === "book_101") {
    return await Book.findOne({ title: "Introduction to Algorithms" });
  } else if (ragId === "book_102") {
    return await Book.findOne({ title: "Designing Data-Intensive Applications" });
  } else if (ragId === "book_103") {
    return await Book.findOne({ title: "Clean Code" });
  } else if (mongoose.Types.ObjectId.isValid(ragId)) {
    return await Book.findById(ragId);
  }
  return null;
};

// ======================================================
// 1. GENERAL Q&A PROXY WITH RAG LIBRARIAN
// ======================================================
export const askAILibrarian = catchAsyncErrors(async (req, res, next) => {
  const { question } = req.body;
  if (!question) {
    return next(new ErrorHandeler("Please provide a question.", 400));
  }

  try {
    // 1. Post query to FastAPI microservice
    const response = await axios.post(`${FASTAPI_URL}/api/ai/chat`, { question });
    const { answer, retrieved_books } = response.data;

    // 2. Query MongoDB for real-time inventory of mentioned books
    const enrichedBooks = [];
    if (retrieved_books && Array.isArray(retrieved_books)) {
      for (const item of retrieved_books) {
        const mongoBook = await resolveBookFromRagId(item.book_id);
        if (mongoBook) {
          enrichedBooks.push({
            book_id: item.book_id,
            title: mongoBook.title,
            author: mongoBook.author,
            rentPrice: mongoBook.rentPrice,
            purchasePrice: mongoBook.purchasePrice,
            quantity: mongoBook.quantity,
            availability: mongoBook.availability,
            frontCover: mongoBook.frontCover,
            _id: mongoBook._id
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      answer,
      retrieved_books: enrichedBooks,
    });
  } catch (error) {
    console.error("FastAPI Chat Error:", error.message);
    return next(new ErrorHandeler(`AI Microservice Offline: ${error.message}`, 503));
  }
});

// ======================================================
// 2. PERSONALIZED RECOMMENDATIONS PROXY WITH REALTIME STATE
// ======================================================
export const getUserRecommendations = catchAsyncErrors(async (req, res, next) => {
  const { initialLoad } = req.body;
  const userId = req.user._id;

  // 1. Fetch user's favorite genres & reading history populated from MongoDB
  const user = await User.findById(userId).populate("reading_history");
  if (!user) {
    return next(new ErrorHandeler("User not found", 404));
  }

  // 2. Fetch books on user shelves
  const shelves = await UserShelf.find({ user: userId }).populate("book");
  
  const already_read = user.reading_history.map(b => b.title);
  const currently_reading = [];
  const want_to_read = [];

  shelves.forEach(shelf => {
    if (shelf.book) {
      if (shelf.status === "CURRENTLY_READING") {
        currently_reading.push(shelf.book.title);
      } else if (shelf.status === "WANT_TO_READ") {
        want_to_read.push(shelf.book.title);
      } else if (shelf.status === "COMPLETED") {
        already_read.push(shelf.book.title);
      }
    }
  });

  // Deduplicate list
  const uniqueAlreadyRead = [...new Set(already_read)];

  // 3. Package user state into RAG context
  const payload = {
    favorite_genres: user.favorite_genres || [],
    already_read: uniqueAlreadyRead,
    currently_reading,
    want_to_read
  };

  // SHORT-CIRCUIT CACHING GATE: If initial load request, return historic data directly
  if (initialLoad === true) {
    const cachedBooks = [];
    const bookIds = user.lastRecommendedBooks || [];
    if (bookIds && Array.isArray(bookIds)) {
      for (const id of bookIds) {
        const mongoBook = await resolveBookFromRagId(id);
        if (mongoBook) {
          const isIssuedToUser = user.borrowedBooks.some(
            b => b.bookId.toString() === mongoBook._id.toString() && b.returned === false
          );
          
          cachedBooks.push({
            rag_id: id,
            _id: mongoBook._id,
            title: mongoBook.title,
            author: mongoBook.author,
            category: mongoBook.category,
            description: mongoBook.description,
            quantity: mongoBook.quantity,
            availability: mongoBook.availability,
            rentPrice: mongoBook.rentPrice,
            purchasePrice: mongoBook.purchasePrice,
            frontCover: mongoBook.frontCover,
            is_issued: isIssuedToUser,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      recommendation: user.lastRecommendation || "",
      recommended_books: cachedBooks,
      profile_metadata: payload
    });
  }

  try {
    // 4. Hit FastAPI recommendations endpoint
    const response = await axios.post(`${FASTAPI_URL}/api/ai/recommend`, payload);
    const { recommendation, recommended_book_ids } = response.data;

    // Save fresh recommendations to user profile cache
    user.lastRecommendation = recommendation;
    user.lastRecommendedBooks = recommended_book_ids || [];
    await user.save();

    // 5. Intercept book IDs and enrich them with real-time MongoDB status
    const recommendedBooks = [];
    if (recommended_book_ids && Array.isArray(recommended_book_ids)) {
      for (const id of recommended_book_ids) {
        const mongoBook = await resolveBookFromRagId(id);
        if (mongoBook) {
          // Check if user is currently issuing this specific book
          const isIssuedToUser = user.borrowedBooks.some(
            b => b.bookId.toString() === mongoBook._id.toString() && b.returned === false
          );
          
          recommendedBooks.push({
            rag_id: id,
            _id: mongoBook._id,
            title: mongoBook.title,
            author: mongoBook.author,
            category: mongoBook.category,
            description: mongoBook.description,
            quantity: mongoBook.quantity,
            availability: mongoBook.availability,
            rentPrice: mongoBook.rentPrice,
            purchasePrice: mongoBook.purchasePrice,
            frontCover: mongoBook.frontCover,
            is_issued: isIssuedToUser, // Realtime issue status for user placement value
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      recommendation,
      recommended_books: recommendedBooks,
      profile_metadata: payload
    });
  } catch (error) {
    console.error("FastAPI Recommendations Error:", error.message);
    return next(new ErrorHandeler(`AI Microservice Offline: ${error.message}`, 503));
  }
});

// ======================================================
// 3. TAG BOOK ON SHELF (WANT_TO_READ, CURRENTLY_READING, COMPLETED)
// ======================================================
export const tagBookOnShelf = catchAsyncErrors(async (req, res, next) => {
  const { bookId, status } = req.body;
  const userId = req.user._id;

  if (!bookId || !status) {
    return next(new ErrorHandeler("Please provide bookId and status.", 400));
  }

  const book = await Book.findById(bookId);
  if (!book) {
    return next(new ErrorHandeler("Book not found.", 404));
  }

  // Update or insert shelf entry
  const shelf = await UserShelf.findOneAndUpdate(
    { user: userId, book: bookId },
    { status },
    { new: true, upsert: true }
  );

  // If status is COMPLETED, automatically push to User's reading_history array if not present
  if (status === "COMPLETED") {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { reading_history: bookId }
    });
  }

  res.status(200).json({
    success: true,
    message: `Book successfully added to shelf: ${status}`,
    shelf
  });
});

// ======================================================
// 4. UPDATE USER FAVORITE GENRES & PROFILE PREFERENCES
// ======================================================
export const updateUserPreferences = catchAsyncErrors(async (req, res, next) => {
  const { favorite_genres } = req.body;
  const userId = req.user._id;

  if (!favorite_genres || !Array.isArray(favorite_genres)) {
    return next(new ErrorHandeler("favorite_genres array is required.", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { favorite_genres },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Preferences updated successfully.",
    favorite_genres: updatedUser.favorite_genres
  });
});

// ======================================================
// 5. FETCH ALL USER SHELVES WITH POPULATED BOOKS
// ======================================================
export const getUserShelves = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const shelves = await UserShelf.find({ user: userId }).populate("book");

  const currently_reading = shelves
    .filter((s) => s.status === "CURRENTLY_READING" && s.book)
    .map((s) => s.book);

  const want_to_read = shelves
    .filter((s) => s.status === "WANT_TO_READ" && s.book)
    .map((s) => s.book);

  const completed = shelves
    .filter((s) => s.status === "COMPLETED" && s.book)
    .map((s) => s.book);

  res.status(200).json({
    success: true,
    currently_reading,
    want_to_read,
    completed,
  });
});
