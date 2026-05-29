import express from "express";
import { isAuthenticated } from "../middlewares/authMiddlewares.js";
import { 
  askAILibrarian, 
  getUserRecommendations, 
  tagBookOnShelf, 
  updateUserPreferences,
  getUserShelves
} from "../controllers/aiController.js";

const router = express.Router();

// General Q&A route
router.post("/ask", isAuthenticated, askAILibrarian);

// Personalized recommendations route
router.post("/recommendations", isAuthenticated, getUserRecommendations);

// Bookshelf tagging route (e.g. tag book as WANT_TO_READ, CURRENTLY_READING, COMPLETED)
router.post("/shelf", isAuthenticated, tagBookOnShelf);

// Update user preferences route
router.put("/preferences", isAuthenticated, updateUserPreferences);

// Fetch user populated bookshelves route
router.get("/shelves", isAuthenticated, getUserShelves);

export default router;
