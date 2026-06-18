import { createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

const userSlice = createSlice({
    name: "users",
    initialState: {
        loading: false,
        users: [],
        error: null,
        message: null,
    },
    reducers: {
        getAllUsersRequest(state) {
            state.loading = true;
            state.error = null;
        },
        getAllUsersSuccess(state, action) {
            state.loading = false;
            state.users = action.payload.users;
        },
        getAllUsersFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },
        
        registerAdminRequest(state) {
            state.loading = true;
            state.error = null;
            state.message = null;
        },
        registerAdminSuccess(state, action) {
            state.loading = false;
            state.message = action.payload.message;
        },
        registerAdminFailed(state, action) {
            state.loading = false;
            state.error = action.payload;
        },

        // 👇 THESE WERE MISSING! Added them back so settleDues works!
        userActionRequest(state) { 
            state.loading = true; 
            state.error = null; 
            state.message = null; 
        },
        userActionSuccess(state, action) { 
            state.loading = false; 
            state.message = action.payload; 
        },
        userActionFailed(state, action) { 
            state.loading = false; 
            state.error = action.payload; 
        },
        
        clearUserErrors(state) {
            state.error = null;
        },
        clearUserMessage(state) {
            state.message = null;
        }
    }
});

// THUNKS
export const getAllUsers = () => async (dispatch) => {
    dispatch(userSlice.actions.getAllUsersRequest());
    try {
        const { data } = await api.get("/api/v1/user/all");
        dispatch(userSlice.actions.getAllUsersSuccess(data));
    } catch (error) {
        dispatch(userSlice.actions.getAllUsersFailed(error.response?.data?.message || "Failed to fetch users"));
    }
};

export const registerAdmin = (formData) => async (dispatch) => {
    dispatch(userSlice.actions.registerAdminRequest());
    try {
        const { data } = await api.post("/api/v1/user/register-admin", formData, {
            headers: {
                "Content-Type": "multipart/form-data", 
            }
        });
        dispatch(userSlice.actions.registerAdminSuccess(data));
    } catch (error) {
        dispatch(userSlice.actions.registerAdminFailed(error.response?.data?.message || "Failed to register admin"));
    }
};

// This thunk will now successfully trigger the reducers above!
export const settleDues = (id, paymentData) => async (dispatch) => {
  dispatch(userSlice.actions.userActionRequest());
  try {
    const { data } = await api.put(`/api/v1/user/settle-dues/${id}`, paymentData);
    // Note: We use data.message here because your backend sends { message: "Payment & Dues updated successfully." }
    dispatch(userSlice.actions.userActionSuccess(data.message)); 
  } catch (error) {
    dispatch(userSlice.actions.userActionFailed(error.response?.data?.message || "Failed to update dues"));
  }
};

export const { clearUserErrors, clearUserMessage } = userSlice.actions;
export default userSlice.reducer;