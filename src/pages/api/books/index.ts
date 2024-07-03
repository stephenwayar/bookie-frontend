import Book from "@/backend/models/Book";
import connectToDatabase from "@/backend/config/mongoose";
import type { NextApiRequest, NextApiResponse } from "next";
import { ErrorResponse } from "@/backend/types/res.types";
import { extractAndValidateToken } from "@/backend/middlewares/extractAndValidateToken";
import User from "@/backend/models/User";
import mongoose from "mongoose";

async function GET(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | any>,
) {
  await connectToDatabase();

  try {
    const { query, pageSize, pageNumber } = req.query;

    // If a query is provided, perform a search and return top 5 matches
    if (query) {
      const regex = new RegExp(query as string, 'i');

      const searchResults = await Book.find({
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } }
        ]
      }).populate('author').limit(5);

      return res.status(200).json({
        books: searchResults,
      });
    }

    // Handle pagination if pageSize and pageNumber are provided
    if (pageSize && pageNumber) {
      const pageSizeNum = parseInt(pageSize as string, 10);
      const pageNumberNum = parseInt(pageNumber as string, 10);

      const books = await Book.find()
        .populate('author')
        .skip((pageNumberNum - 1) * pageSizeNum)
        .limit(pageSizeNum);

      const total = await Book.countDocuments();

      return res.status(200).json({
        books,
        total,
      });
    }

    // Default behavior: return all books
    const allBooks = await Book.find();

    res.status(200).json({
      books: allBooks,
    });
  } catch (error) {
    console.log('Internal server error ', error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function POST(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | any>,
) {
  await connectToDatabase();

  try {
    const decryptedToken = await extractAndValidateToken(req, res);

    if (!decryptedToken) return;

    const { title, description } = req.body;

    const newBook = new Book({
      title,
      description,
      author: decryptedToken.id,
    });

    await newBook.save();

    const user = await User.findById(decryptedToken.id);

    if (user) {
      user.books.push(newBook._id as mongoose.ObjectId);
      await user.save();
    }

    const populatedBook = await Book.findById(newBook._id).populate('author');

    res.status(201).json(populatedBook);
  } catch (error) {
    console.log('Internal server error ', error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>,
) {
  switch (req.method) {
    case "GET":
      return await GET(req, res);
    case "POST":
      return await POST(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}