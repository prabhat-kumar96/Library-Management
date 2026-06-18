import { createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

const borrowSlice = createSlice({
    name: "borrow",
    initialState: {
        loading: false,
        borrowedBooks: [],
        error: null,
        message: null,
    },
    reducers: {
        // Record Borrow (Issue Book)
        recordBorrowRequest(state) {
            state.loading = true;
            state.error = null;
            state.message = null;
        },
        recordBorrowSuccess(state, action) {
            state.loading = false;
            state.message = action.payload.message;
        },
        recordBorrowFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },

        // Process Return
        returnBookRequest(state) {
            state.loading = true;
            state.error = null;
            state.message = null;
        },
        returnBookSuccess(state, action) {
            state.loading = false;
            state.message = action.payload.message;
        },
        returnBookFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },

        // Fetch Admin Borrows
        getAdminBorrowsRequest(state) {
            state.loading = true;
            state.error = null;
        },
        getAdminBorrowsSuccess(state, action) {
            state.loading = false;
            state.borrowedBooks = action.payload.borrowedBooks;
        },
        getAdminBorrowsFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },

        clearBorrowErrors(state) {
            state.error = null;
        },
        clearBorrowMessage(state) {
            state.message = null;
        }
    }
});

// THUNKS
export const recordBorrowBook = (bookId, email) => async (dispatch) => {
    dispatch(borrowSlice.actions.recordBorrowRequest());
    try {
        const { data } = await api.post(`/api/v1/borrow/record-borrow-book/${bookId}`, { email }, {
            headers: { "Content-Type": "application/json" }
        });
        dispatch(borrowSlice.actions.recordBorrowSuccess(data));
    } catch (error) {
        dispatch(borrowSlice.actions.recordBorrowFailed(error.response?.data?.message || "Failed to record borrow"));
    }
};

export const returnBorrowedBook = (bookId, email) => async (dispatch) => {
    dispatch(borrowSlice.actions.returnBookRequest());
    try {
        const { data } = await api.put(`/api/v1/borrow/return-borrowed-book/${bookId}`, { email }, {
            headers: { "Content-Type": "application/json" }
        });
        dispatch(borrowSlice.actions.returnBookSuccess(data));
    } catch (error) {
        dispatch(borrowSlice.actions.returnBookFailed(error.response?.data?.message || "Failed to return book"));
    }
};

export const getAdminBorrowedBooks = () => async (dispatch) => {
    dispatch(borrowSlice.actions.getAdminBorrowsRequest());
    try {
        const { data } = await api.get("/api/v1/borrow/borrowed-books-by-users");
        dispatch(borrowSlice.actions.getAdminBorrowsSuccess(data));
    } catch (error) {
        dispatch(borrowSlice.actions.getAdminBorrowsFailed(error.response?.data?.message || "Failed to fetch borrowed books"));
    }
};

export const { clearBorrowErrors, clearBorrowMessage } = borrowSlice.actions;
export default borrowSlice.reducer;