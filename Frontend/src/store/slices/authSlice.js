import { createSlice } from "@reduxjs/toolkit";

import api from "../../api/api";
import Register from "../../pages/Register";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    logoutLoading: false,
    error: null,
    message: null,
    user: null,
    isAuthenticated: false,
  },
  reducers: {
    registerRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    registerSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    },
    registerFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    otpVerificationRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    otpVerificationSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    },
    otpVerificationFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    loginRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    },
    loginFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logoutRequest(state) {
      state.logoutLoading = true;
      state.error = null;
      state.message = null;
    },
    logoutSuccess(state, action) {
      state.logoutLoading = false;
      state.message = action.payload;
      state.isAuthenticated = false;
      state.user = null;
    },
    logoutFailed(state, action) {
      state.logoutLoading = false;
      state.error = action.payload;
      state.message = null;
    },
    getUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUserSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    getUserFailed(state) {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
    },
    forgotPasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    forgotPasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
     forgotPasswordFailed(state, action) {
      // Added action
      state.loading = false;
      state.error = action.payload;
    },

    resetPasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    resetPasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    resetPasswordFailed(state, action) {
      // ✅ Added 'action'
      state.loading = false;
      state.error = action.payload;
    },

    updatePasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updatePasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
   

    updatePasswordFailed(state, action) {
      // Added action
      state.loading = false;
      state.error = action.payload;
    },
    resetAuthSlice(state) {
      state.error = null;
      state.user = state.user;
      state.loading = false;
      state.message = null;
    },
  },
});

export const resetAuthSlice = () => (dispatch) => {
  dispatch(authSlice.actions.resetAuthSlice());
};

export const register = (data) => async (dispatch) => {
  dispatch(authSlice.actions.registerRequest());
  await api
    .post("/api/v1/auth/register", data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      dispatch(authSlice.actions.registerSuccess(res.data));
    })
    .catch((err) => {
      dispatch(authSlice.actions.registerFailed(err.response?.data?.message || err.message || "Registration failed. Please try again."));
    });
};

export const otpVerification = (email, otp) => async (dispatch) => {
  dispatch(authSlice.actions.otpVerificationRequest());
  await api
    .post(
      "/api/v1/auth/verify_otp",
      { email, otp },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((res) => {
      dispatch(authSlice.actions.otpVerificationSuccess(res.data));
    })
    .catch((err) => {
      dispatch(
        authSlice.actions.otpVerificationFailed(err.response?.data?.message || err.message || "OTP verification failed. Please try again."),
      );
    });
};

export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());
  await api
    .post("/api/v1/auth/login", data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      // SUCCESS: Pass res.data which contains both 'message' and 'user'
      dispatch(authSlice.actions.loginSuccess(res.data));
    })
    .catch((err) => {
      dispatch(authSlice.actions.loginFailed(err.response?.data?.message || err.message || "Login failed. Please try again."));
    });
};

export const logout = () => async (dispatch) => {
  dispatch(authSlice.actions.logoutRequest());
  await api
    .get("/api/v1/auth/logout")
    .then((res) => {
      dispatch(authSlice.actions.logoutSuccess(res.data.message));
    })
    .catch((err) => {
      dispatch(authSlice.actions.logoutFailed(err.response?.data?.message || err.message || "Logout failed. Please try again."));
    });
};

export const getUser = () => async (dispatch) => {
  dispatch(authSlice.actions.getUserRequest());
  await api
    .get("/api/v1/auth/me")
    .then((res) => {
      dispatch(authSlice.actions.getUserSuccess(res.data));
    })
    .catch((err) => {
      dispatch(authSlice.actions.getUserFailed(err.response?.data?.message || err.message || "Failed to fetch user."));
    });
};

export const forgotPassword = (email) => async (dispatch) => {
  dispatch(authSlice.actions.forgotPasswordRequest());
  await api
    .post(
      "/api/v1/auth/password/forgot",
      { email },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((res) => {
      dispatch(authSlice.actions.forgotPasswordSuccess(res.data));
    })
    .catch((err) => {
      dispatch(
        authSlice.actions.forgotPasswordFailed(err.response?.data?.message || err.message || "Request failed. Please try again."),
      );
    });
};

export const resetPassword = (data, token) => async (dispatch) => {
  dispatch(authSlice.actions.resetPasswordRequest());
  await api
    .put(`/api/v1/auth/password/reset/${token}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      dispatch(authSlice.actions.resetPasswordSuccess(res.data));
    })
    .catch((err) => {
      dispatch(
        authSlice.actions.resetPasswordFailed(err.response?.data?.message || err.message || "Password reset failed. Please try again."),
      );
    });
};

export const updatePassword = (data) => async (dispatch) => {
  dispatch(authSlice.actions.updatePasswordRequest());
  await api
    .put("/api/v1/auth/password/update", data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => {
      dispatch(authSlice.actions.updatePasswordSuccess(res.data.message));
    })
    .catch((err) => {
      dispatch(
        authSlice.actions.updatePasswordFailed(err.response?.data?.message || err.message || "Failed to update password. Please try again."),
      );
    });
};

export default authSlice.reducer;
