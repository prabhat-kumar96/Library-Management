import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { Request } from "../models/requestModel.js";
import { Book } from "../models/bookModel.js";
import { User } from "../models/userModel.js";
import { Borrow } from "../models/borrowModel.js";
import ErrorHandeler from "../middlewares/errorMiddlewares.js";
import { sendEmail } from "../utils/sendEmail.js";

// @desc    User: Send a rent or purchase request
export const createBookRequest = catchAsyncErrors(async (req, res, next) => {
    const { bookId } = req.params;
    const { requestType } = req.body; // Expects "Borrow" or "Purchase" from Frontend
    
    // Fetch the fresh user from DB to ensure arrays are perfectly up-to-date
    const user = await User.findById(req.user._id);

    if (!["Borrow", "Purchase"].includes(requestType)) {
        return next(new ErrorHandeler("Invalid request type. Must be Borrow or Purchase.", 400));
    }

    const book = await Book.findById(bookId);
    if (!book) return next(new ErrorHandeler("Book not found.", 404));

    if (book.quantity < 1) {
        return next(new ErrorHandeler("Book is currently out of stock.", 400));
    }

    // 🛑 1. PENDING REQUEST CHECK (Applies per-requestType)
    // A user can only have at most one pending request of a specific type for a book
    const pendingRequest = await Request.findOne({
        "user.id": user._id,
        "book.id": bookId,
        requestType: requestType,
        status: "Pending"
    });

    if (pendingRequest) {
        return next(new ErrorHandeler(`You already have a pending ${requestType === 'Borrow' ? 'Rent' : 'Purchase'} request for this book.`, 400));
    }

    // 🛑 2. STRICT RENTAL CHECK (Applies ONLY to Rent/Borrow requests)
    // Prevent user from renting a book they currently have at home
    if (requestType === "Borrow") {
        const alreadyRented = user.borrowedBooks.some(
            (b) => String(b.bookId) === String(bookId) && b.returned === false
        );
        if (alreadyRented) {
            return next(new ErrorHandeler("You are currently renting this physical book. Please return it before renting again.", 400));
        }
    }
    // Notice: There is no check here for "Purchase". They can buy as many copies/make as many purchase requests as they want!

    // Determine the agreed price based on the request type
    const priceAgreed = requestType === "Borrow" ? book.rentPrice : book.purchasePrice;

    await Request.create({
        user: { id: user._id, name: user.name, email: user.email },
        book: { id: book._id, title: book.title, price: priceAgreed },
        requestType,
    });

    res.status(201).json({
        success: true,
        message: `${requestType === 'Borrow' ? 'Rent' : 'Purchase'} request submitted successfully! Waiting for Admin approval.`
    });
});

// @desc    Admin: Get all requests (or User: Get own requests)
export const getAllBorrowRequests = catchAsyncErrors(async (req, res, next) => {
    let query = {};
    if (req.user.role !== "Admin") {
        query = { "user.id": req.user._id };
    }
    const requests = await Request.find(query).sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        requests,
    });
});

// @desc    Admin: Approve or Reject Request
// @desc    Admin: Approve or Reject Request
export const manageBorrowRequest = catchAsyncErrors(async (req, res, next) => {
    const { requestId } = req.params;
    const { action } = req.body; // "Approved" or "Rejected"

    const bookRequest = await Request.findById(requestId);
    if (!bookRequest) return next(new ErrorHandeler("Request not found.", 404));

    if (bookRequest.status !== "Pending") {
        return next(new ErrorHandeler("This request has already been processed.", 400));
    }

    if (action === "Approved") {
        const book = await Book.findById(bookRequest.book.id);
        
        // 🛠️ FIX 1: Add .select("+password") so user.save() doesn't fail validation
        const user = await User.findById(bookRequest.user.id).select("+password");

        if (!book || book.quantity < 1) {
            return next(new ErrorHandeler("Book no longer available.", 400));
        }

        // 1. Update Inventory
        book.quantity -= 1;
        book.availability = book.quantity > 0;
        
        // 🛠️ FIX 2: validateModifiedOnly ignores missing fields on old test books
        await book.save({ validateModifiedOnly: true });

        // 2. Add Price to User Dues
        user.totalFinesDue = (user.totalFinesDue || 0) + Number(bookRequest.book.price);

        // 3. Process differently based on Request Type
        if (bookRequest.requestType === "Borrow") {
            const borrowedDate = new Date();
            const dueDate = new Date(borrowedDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

            user.borrowedBooks.push({
                bookId: book._id,
                bookTitle: book.title,
                borrowedDate,
                dueDate,
                returned: false,
            });

            // 🛠️ FIX 3: Reverted book back to just ID to perfectly match your Borrow schema
            await Borrow.create({
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email 
                },
                book: book._id, 
                dueDate: dueDate,
                price: bookRequest.book.price 
            });

        } else if (bookRequest.requestType === "Purchase") {
            // Push to purchased array (No due dates, lifetime access to PDF)
            user.purchasedBooks.push({
                bookId: book._id,
                bookTitle: book.title,
                purchaseDate: new Date(),
            });
        }

        // Save User, ignoring unselected fields
        await user.save({ validateModifiedOnly: true });
        
        bookRequest.status = "Approved";
        await bookRequest.save(); // Save the status immediately

        // 📧 4. SEND APPROVAL EMAIL
        try {
            const emailSubject = `Library Request Approved: ${book.title}`;
            let emailMessage = `Hello ${user.name},\n\nCongratulations! Your request to ${bookRequest.requestType.toLowerCase()} "${book.title}" has been approved.\n\n`;
            
            if (bookRequest.requestType === "Borrow") {
                emailMessage += `Please visit the library to collect your physical copy. Note that a charge of ₹${bookRequest.book.price} has been added to your dues.\n\nHappy Reading!`;
            } else {
                emailMessage += `You can now access your lifetime digital copy in the 'Purchased E-Books' section of your library dashboard. If you requested a physical copy as well, you may pick it up at the front desk.\n\nA charge of ₹${bookRequest.book.price} has been added to your dues.\n\nHappy Reading!`;
            }

            await sendEmail({
                email: user.email,
                subject: emailSubject,
                message: emailMessage,
            });
        } catch (error) {
            console.error("Approval email could not be sent:", error);
            // Non-blocking error handling
        }

    } else if (action === "Rejected") {
        bookRequest.status = "Rejected";
        await bookRequest.save(); // Save the status immediately

        // 📧 5. SEND REJECTION EMAIL
        try {
            const emailSubject = `Library Request Update: ${bookRequest.book.title}`;
            const emailMessage = `Hello ${bookRequest.user.name},\n\nWe regret to inform you that your request to ${bookRequest.requestType.toLowerCase()} the book "${bookRequest.book.title}" has been rejected.\n\nThis is usually due to stock unavailability, pending dues, or administrative reasons. Please contact the library staff for further details.\n\nBest regards,\nThe Library Team`;

            await sendEmail({
                email: bookRequest.user.email,
                subject: emailSubject,
                message: emailMessage,
            });
        } catch (error) {
            console.error("Rejection email could not be sent:", error);
            // Non-blocking error handling
        }
    } else {
        return next(new ErrorHandeler("Invalid action.", 400));
    }

    res.status(200).json({
        success: true,
        message: `Request has been ${action} successfully. User notified via email.`
    });
});