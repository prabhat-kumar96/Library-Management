import mongoose from "mongoose";
import jwt from "jsonwebtoken"; 
import crypto from "crypto";

// Custom validator to ensure max 5 preferences for RAG
function arrayLimit(val) {
  return val.length <= 5;
}

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
     email: {
        type: String,
        required: true,
        lowercase: true,
    },
     password: {
        type: String,
        required: true,
        select: false,
    },
     role: {
        type: String,
        enum: ["Admin","User"],
        default: "User",
    },
    accountVerified: {
        type: Boolean,
        default: true
    },
    borrowedBooks: [
       { 
        bookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Borrow"
        },
        returned: {
            type: Boolean,
            default: false,
        },
        bookTitle: String,
        borrowedDate: Date,
        dueDate: Date,
       }
    ],
    // 🛍️ NEW: Purchased Books Array (No due dates, lifetime access)
    purchasedBooks: [
        {
            bookId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Book"
            },
            bookTitle: String,
            purchaseDate: {
                type: Date,
                default: Date.now
            }
        }
    ],
    // 🤖 NEW: RAG User Preferences Array (Max 5 elements)
    preferences: {
        type: [String],
        validate: [arrayLimit, 'You can only have up to 5 preferences'],
        default: []
    },
    // 📚 RAG Personalized Recommendation Fields
    favorite_genres: {
        type: [String],
        default: []
    },
    reading_history: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book"
        }
    ],
    avatar: {
        public_id: String,
        url: String
    },
    totalFinesDue: {
        type: Number,
        default: 0,
    },
   verificationCode: Number,
    verificationCodeExpire: Date,
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date,
    lastRecommendation: {
        type: String,
        default: ""
    },
    lastRecommendedBooks: {
        type: [String],
        default: []
    },
 },
 {
    timestamps: true
 }
);

userSchema.methods.generateVerificationCode = function(){
    function generateRandomFiveDigitNumber(){
        const firstDigit = Math.floor(Math.random()*9)+1;
        const remainingDigits = Math.floor(Math.random()*10000)
        .toString()
        .padStart(4,0);
        return parseInt(firstDigit+remainingDigits);
    }
    const verificationCode = generateRandomFiveDigitNumber();
    this.verificationCode = verificationCode;
    this.verificationCodeExpire = Date.now() + 15*60*1000; // Expiry 15 minutes
    return verificationCode;
};

userSchema.methods.getJWTToken = function(){
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRE,
    })
}

userSchema.methods.getResetPasswordToken  = function(){
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
    this.resetPasswordTokenExpire = Date.now()+ 30*60*1000;

    return resetToken;
} 

export const User = mongoose.model("User",userSchema);