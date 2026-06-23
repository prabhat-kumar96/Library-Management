import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { otpVerification, resetAuthSlice } from "../store/slices/authSlice";
import logo_with_title from "../assets/logo-with-title.png";

const OTP = () => {
  const [otp, setOtp] = useState("");
  // Retrieve the email from the URL parameters
  const { email } = useParams();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, message, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 5) {
      toast.error("Please enter a valid 5-digit OTP.");
      return;
    }
    // Dispatch the verification action with the email from the URL and the entered OTP
    dispatch(otpVerification(email, otp));
  };

  useEffect(() => {
    // 🧹 Clear errors when the component mounts
    dispatch(resetAuthSlice()); 

    return () => {
      // 🧹 Clear errors when the component unmounts (navigating away)
      dispatch(resetAuthSlice()); 
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
    if (message) {
      toast.success(message);
      dispatch(resetAuthSlice());
    }
    // Backend logs the user in and sends a token upon successful OTP verification
    if (isAuthenticated) {
      navigate("/");
    }
  }, [dispatch, error, message, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center">
          <img src={logo_with_title} alt="Logo" className="h-12 w-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">
            Verify Your Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a 5-digit verification code to <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-center mb-2">
              Enter Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={5}
              value={otp}
              onChange={(e) => {
                // Only allow numbers to be typed
                const value = e.target.value.replace(/\D/g, "");
                setOtp(value);
              }}
              className="w-full text-center text-3xl tracking-[0.5em] px-4 py-3 mt-1 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              placeholder="•••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 5}
            className="w-full py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-70"
          >
            {loading ? "Verifying..." : "Verify Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Didn't receive the code?{" "}
            {/* If you add a resend OTP endpoint later, you can wire it up here. For now, it links back to register. */}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Try registering again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTP;