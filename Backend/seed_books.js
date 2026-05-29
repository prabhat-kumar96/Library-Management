import mongoose from "mongoose";
import { config } from "dotenv";
import { Book } from "./models/bookModel.js";

config({ path: "./config/config.env" });

const mockBooks = [
  {
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    category: "Algorithms",
    description: "Covers a deep analysis of computer algorithms, data structures, dynamic programming, sorting, and graph theory architectures.",
    rentPrice: 150,
    purchasePrice: 500,
    quantity: 5,
    availability: true
  },
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    category: "Distributed Systems",
    description: "An in-depth guide to storage engines, database internals, replication, sharding, scalability, and distributed systems.",
    rentPrice: 180,
    purchasePrice: 600,
    quantity: 8,
    availability: true
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    category: "Software Engineering",
    description: "A handbook of agile software craftsmanship. Focuses on writing meaningful names, clean functions, error handling, and unit testing.",
    rentPrice: 120,
    purchasePrice: 400,
    quantity: 10,
    availability: true
  }
];

mongoose.connect(process.env.MONGO_URI, {
    dbName: "Library_Management",
}).then(async () => {
    console.log("DB Connected for seeding!");
    for (const b of mockBooks) {
        const exists = await Book.findOne({ title: b.title });
        if (!exists) {
            await Book.create(b);
            console.log(`Seeded book: "${b.title}"`);
        } else {
            console.log(`Book already exists: "${b.title}"`);
        }
    }
    console.log("Seeding complete!");
    process.exit(0);
}).catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
