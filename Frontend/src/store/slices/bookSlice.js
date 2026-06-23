import { createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

const bookSlice = createSlice({
  name: "books",
  initialState: {
    loading: false,
    saveLoading: false,
    books: [],
    error: null,
    message: null,
    searchQuery: "",
  },
  reducers: {
    // GET ALL BOOKS
    getAllBooksRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getAllBooksSuccess(state, action) {
      state.loading = false;
      state.books = action.payload.books;
    },
    getAllBooksFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // ADD NEW BOOK
    addBookRequest(state) {
      state.saveLoading = true;
      state.error = null;
      state.message = null;
    },
    addBookSuccess(state, action) {
      state.saveLoading = false;
      state.message = action.payload.message;
    },
    addBookFailed(state, action) {
      state.saveLoading = false;
      state.error = action.payload;
    },

    // DELETE BOOK
    deleteBookRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    deleteBookSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    deleteBookFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // UPDATE BOOK

    updateBookRequest(state) {
      state.saveLoading = true;
      state.error = null;
      state.message = null;
    },
    updateBookSuccess(state, action) {
      state.saveLoading = false;
      state.message = action.payload.message;
    },
    updateBookFailed(state, action) {
      state.saveLoading = false;
      state.error = action.payload;
    },

    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },

    // CLEANUP MESSAGES
    clearBookErrors(state) {
      state.error = null;
    },
    clearBookMessage(state) {
      state.message = null;
    },
    
  },
});

// ================= THUNKS =================

// Base URL assumption: In app.js, your book router is likely mounted at /api/v1/book
export const getAllBooks = () => async (dispatch) => {
  dispatch(bookSlice.actions.getAllBooksRequest());
  try {
    const { data } = await api.get("/api/v1/book/all");
    dispatch(bookSlice.actions.getAllBooksSuccess(data));
  } catch (error) {
    dispatch(
      bookSlice.actions.getAllBooksFailed(
        error.response?.data?.message || "Failed to fetch books",
      ),
    );
  }
};
export const addBook = (bookData) => async (dispatch) => {
  dispatch(bookSlice.actions.addBookRequest());
  try {
    const { data } = await api.post(
      "/api/v1/book/admin/add",
      bookData, // This is now FormData, not JSON!
      {
        headers: {
          "Content-Type": "multipart/form-data", // 👈 Crucial change!
        },
      }
    );
    dispatch(bookSlice.actions.addBookSuccess(data));
  } catch (error) {
    dispatch(bookSlice.actions.addBookFailed(error.response?.data?.message || "Failed to add book"));
  }
};

export const updateBook = (id, bookData) => async (dispatch) => {
    dispatch(bookSlice.actions.updateBookRequest());
    try {
        const { data } = await api.put(`/api/v1/book/update/${id}`, bookData, {
            headers: { "Content-Type": "multipart/form-data" } // 👈 Crucial change!
        });
        dispatch(bookSlice.actions.updateBookSuccess(data));
    } catch (error) {
        dispatch(bookSlice.actions.updateBookFailed(error.response?.data?.message || "Failed to update book"));
    }
};
export const deleteBook = (id) => async (dispatch) => {
  dispatch(bookSlice.actions.deleteBookRequest());
  try {
    const { data } = await api.delete(
      `/api/v1/book/delete/${id}`
    );
    dispatch(bookSlice.actions.deleteBookSuccess(data));
  } catch (error) {
    dispatch(
      bookSlice.actions.deleteBookFailed(
        error.response?.data?.message || "Failed to delete book",
      ),
    );
  }
};

// ==========================================
// ✨ AI SEMANTIC "VIBE" SEARCH ACTION
// ==========================================
export const searchBooksWithAI = (query) => async (dispatch) => {
  // 👇 1. Use the existing getAllBooksRequest reducer
  dispatch(bookSlice.actions.getAllBooksRequest()); 
  try {
    const { data } = await api.get(
      `/api/v1/book/semantic-search?query=${query}`
    );
    // 👇 2. Use the existing getAllBooksSuccess reducer. 
    // We pass 'data' directly because your backend already returns { success: true, books: [...] }
    dispatch(bookSlice.actions.getAllBooksSuccess(data));
  } catch (error) {
    // 👇 3. Use the existing getAllBooksFailed reducer
    dispatch(
      bookSlice.actions.getAllBooksFailed(
        error.response?.data?.message || "AI Search Failed"
      )
    );
  }
};


export const { clearBookErrors, clearBookMessage, setSearchQuery } = bookSlice.actions;
export default bookSlice.reducer;
