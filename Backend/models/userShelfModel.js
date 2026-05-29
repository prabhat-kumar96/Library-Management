import mongoose from "mongoose";

const userShelfSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    status: {
      type: String,
      enum: ["WANT_TO_READ", "CURRENTLY_READING", "COMPLETED"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate entries for the same user and book on shelves
userShelfSchema.index({ user: 1, book: 1 }, { unique: true });

export const UserShelf = mongoose.model("UserShelf", userShelfSchema);
