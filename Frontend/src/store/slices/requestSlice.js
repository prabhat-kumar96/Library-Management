import { createSlice } from "@reduxjs/toolkit";
import api from "../../api/api";

const requestSlice = createSlice({
  name: "requests",
  initialState: {
    loading: false,
    requests: [],
    error: null,
    message: null,
  },
  reducers: {
    requestActionRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    requestActionSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
    getAllRequestsSuccess(state, action) {
      state.loading = false;
      state.requests = action.payload;
    },
    requestActionFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    clearErrors(state) {
      state.error = null;
    },
    clearMessage(state) {
      state.message = null;
    },
  },
});

// THUNKS
// 👈 Now accepts requestType ("Borrow" or "Purchase")
export const createRequest = (bookId, requestType) => async (dispatch) => { 
  dispatch(requestSlice.actions.requestActionRequest());
  try {
    const { data } = await api.post(
      `/api/v1/request/send/${bookId}`, 
      { requestType } // 👈 Sent in req.body
    );
    dispatch(requestSlice.actions.requestActionSuccess(data.message));
  } catch (error) {
    dispatch(requestSlice.actions.requestActionFailed(error.response?.data?.message || "An error occurred"));
  }
};

export const getAllRequests = () => async (dispatch) => {
  dispatch(requestSlice.actions.requestActionRequest());
  try {
    const { data } = await api.get("/api/v1/request/all");
    dispatch(requestSlice.actions.getAllRequestsSuccess(data.requests));
  } catch (error) {
    dispatch(requestSlice.actions.requestActionFailed(error.response?.data?.message || "An error occurred"));
  }
};

export const manageRequest = (requestId, action) => async (dispatch) => {
  dispatch(requestSlice.actions.requestActionRequest());
  try {
    const { data } = await api.put(
      `/api/v1/request/manage/${requestId}`, 
      { action }
    );
    dispatch(requestSlice.actions.requestActionSuccess(data.message));
  } catch (error) {
    dispatch(requestSlice.actions.requestActionFailed(error.response?.data?.message || "An error occurred"));
  }
};

export const { clearErrors, clearMessage } = requestSlice.actions;
export default requestSlice.reducer;