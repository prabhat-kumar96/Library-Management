import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { Book } from "../models/bookModel.js";
import ErrorHandeler from "../middlewares/errorMiddlewares.js";
import cloudinary from "cloudinary";
import fs from "fs";
import { extractTextFromPDF, generateBookDescription, generateEmbedding } from "../services/geminiServices.js";
import redisClient from "../utils/redisClient.js";

// ==============================
// 1. ADD BOOK (AI Powered)
// ==============================
export const addBook = catchAsyncErrors(async (req, res, next) => {
  const { title, author, category, rentPrice, purchasePrice, quantity } = req.body;
  let { description } = req.body; 

  if (!title || !author || !category || !rentPrice || !purchasePrice || !quantity) {
    return next(new ErrorHandeler("Please fill all required fields.", 400));
  }

  const hasPdf = req.files && req.files.bookPdf;
  if (!description && !hasPdf) {
      return next(new ErrorHandeler("Please provide a manual description OR upload a PDF for the AI to generate one.", 400));
  }

  let finalDescription = description || "";
  let embeddingArray = [];

  if (hasPdf) {
      try {
          console.log("=== 🚀 AI PDF PROCESSING START ===");
          let pdfBuffer;
          if (req.files.bookPdf.tempFilePath) {
              pdfBuffer = fs.readFileSync(req.files.bookPdf.tempFilePath);
          } else if (req.files.bookPdf.data) {
              pdfBuffer = req.files.bookPdf.data;
          } else {
              throw new Error("Could not find PDF data buffer or temp file path.");
          }
          
          const extractedText = await extractTextFromPDF(pdfBuffer);
          finalDescription = await generateBookDescription(extractedText, {
              title,
              author,
              category,
          });
          console.log("=== ✅ AI PDF PROCESSING COMPLETE ===");
          
      } catch (error) {
          console.error("🚨 AI DESCRIPTION ERROR:", error.message);
          return next(new ErrorHandeler(`AI Processing Failed: ${error.message}`, 500));
      }
  }

  try {
      console.log("=== 🚀 GENERATING VECTOR EMBEDDING ===");
      const textToEmbed = `Title: ${title}. Author: ${author}. Category: ${category}. Description: ${finalDescription}`;
      embeddingArray = await generateEmbedding(textToEmbed);
      console.log("=== ✅ EMBEDDING SUCCESS ===");
  } catch (error) {
      console.error("🚨 AI EMBEDDING ERROR:", error.message);
      return next(new ErrorHandeler(`Failed to generate search embeddings: ${error.message}`, 500));
  }

  let bookData = {
    title,
    author,
    category,
    description: finalDescription,
    embedding: embeddingArray,     
    rentPrice,
    purchasePrice,
    quantity,
  };

  if (req.files && req.files.frontCover) {
    const cover = req.files.frontCover;
    const cloudinaryResponse = await cloudinary.v2.uploader.upload(
      cover.tempFilePath,
      { folder: "LIBRARY_BOOK_COVERS" }
    );
    bookData.frontCover = {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    };
  }

  if (hasPdf) {
    const pdf = req.files.bookPdf;
    const extension = pdf.name ? pdf.name.split('.').pop() : 'pdf';
    const baseName = pdf.name ? pdf.name.substring(0, pdf.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9-_]/g, '_') : 'book';
    const sanitizedFilename = `${Date.now()}-${baseName}.${extension}`;

    const cloudinaryResponse = await cloudinary.v2.uploader.upload(
      pdf.tempFilePath,
      { 
        folder: "LIBRARY_BOOK_PDFS", 
        resource_type: "raw",
        public_id: sanitizedFilename
      }
    );
    bookData.bookPdf = {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    };
  }

  const book = await Book.create(bookData);

  // ⚡ Real-Time Vector Store Sync via Redis Pub/Sub (Non-blocking)
  try {
    const syncPayload = {
      book_id: book._id.toString(),
      title: book.title,
      author: book.author,
      genres: book.category,
      summary: book.description
    };
    redisClient.publish("library_book_sync", JSON.stringify(syncPayload));
    console.log(`⚡ [Redis Pub] Event published for book: ${book.title}`);
  } catch (redisError) {
    console.error("🚨 [Redis Pub] Failed to publish sync event:", redisError.message);
  }

  res.status(201).json({
    success: true,
    message: "Book and AI metadata added successfully.",
    book,
  });
});

// ==============================
// 2. GET ALL BOOKS
// ==============================
export const getAllBook = catchAsyncErrors(async (req, res, next) => {
  const books = await Book.find().sort({ createdAt: -1 }); 
  res.status(200).json({
    success: true,
    books,
  });
});

// ==============================
// 3. DELETE BOOK
// ==============================
export const deleteBook = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const book = await Book.findById(id);

  if (!book) return next(new ErrorHandeler("Book not found.", 404));
  
  await book.deleteOne();
  
  res.status(200).json({
    success: true,
    message: "Book deleted successfully.",
  });
});

// ==============================
// 4. UPDATE BOOK
// ==============================
export const updateBook = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  let book = await Book.findById(id);
  if (!book) return next(new ErrorHandeler("Book not found.", 404));

  let updateData = { ...req.body };

  if (req.files && req.files.frontCover) {
    const cover = req.files.frontCover;
    const cloudinaryResponse = await cloudinary.v2.uploader.upload(
      cover.tempFilePath,
      { folder: "LIBRARY_BOOK_COVERS" }
    );
    updateData.frontCover = {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    };
  }

  if (req.files && req.files.bookPdf) {
    const pdf = req.files.bookPdf;
    const extension = pdf.name ? pdf.name.split('.').pop() : 'pdf';
    const baseName = pdf.name ? pdf.name.substring(0, pdf.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9-_]/g, '_') : 'book';
    const sanitizedFilename = `${Date.now()}-${baseName}.${extension}`;

    const cloudinaryResponse = await cloudinary.v2.uploader.upload(
      pdf.tempFilePath,
      { 
        folder: "LIBRARY_BOOK_PDFS", 
        resource_type: "raw",
        public_id: sanitizedFilename
      }
    );
    updateData.bookPdf = {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    };
  }

  book = await Book.findByIdAndUpdate(id, updateData, {
    new: true, 
    runValidators: true, 
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    message: "Book updated successfully.",
    book,
  });
});

// ==============================
// 5. SEMANTIC "VIBE" SEARCH (ATLAS CLOUD RAG VERSION)
// ==============================
export const searchBooksRAG = catchAsyncErrors(async (req, res, next) => {
    // Note: We use req.body because this is a POST request now
    const { query } = req.body;

    if (!query) {
        return next(new ErrorHandeler("Please provide a search query.", 400));
    }

    try {
        console.log(`🤖 User is searching for: "${query}"`);

        // 1. Turn user search into a Vector using Hugging Face
        const queryVector = await generateEmbedding(query);

        // 2. Ask MongoDB Atlas to find the closest matches natively
        const searchResults = await Book.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index", // The exact name of your Atlas index
                    "path": "embedding",     // The schema field
                    "queryVector": queryVector,
                    "numCandidates": 100,
                    "limit": 10              // Return top 10 results
                }
            },
            {
                // 3. Clean up the response (pass frontend exactly what it needs, hide the massive vector array)
                "$project": {
                    title: 1,
                    author: 1,
                    category: 1,
                    description: 1,
                    rentPrice: 1,
                    purchasePrice: 1,
                    quantity: 1,
                    frontCover: 1,
                    bookPdf: 1,
                    score: { "$meta": "vectorSearchScore" } // Gets the similarity % from Atlas
                }
            }
        ]);

        res.status(200).json({
            success: true,
            resultsFound: searchResults.length,
            books: searchResults // Named 'books' to match your frontend mapping
        });

    } catch (error) {
        console.error("🚨 Semantic Search Error:", error);
        return next(new ErrorHandeler("AI Search Failed. Ensure your Atlas index is active.", 500));
    }
});
