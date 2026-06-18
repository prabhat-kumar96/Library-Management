import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { X, Settings, KeyRound } from "lucide-react";
import { toast } from "react-toastify";
import { updatePassword, resetAuthSlice } from "../store/slices/authSlice";

const SettingPopup = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { loading, error, message } = useSelector((state) => state.auth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    // We only want to handle the toast notifications if this popup is actually open
    if (!isOpen) return;

    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
    if (message && message === "Password updated successfully.") {
      toast.success(message);
      dispatch(resetAuthSlice());
      
      // Clear form and close on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      onClose();
    }
  }, [dispatch, error, message, isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 16) {
      toast.error("New password must be between 8 and 16 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("invalid password must contain atleast oneUppercase");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error("invalid password must contain atleast oneLowercase");
      return;
    }
    if (!/[\W_]/.test(newPassword)) {
      toast.error("invalid password must contain atleast oneSpecialCharacter");
      return;
    }

    const data = { currentPassword, newPassword, confirmNewPassword };
    dispatch(updatePassword(data));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-gray-600" size={20} /> Update Credentials
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3 mb-4">
            <KeyRound className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-sm text-blue-800">
              Ensure your new password is secure, between 8 to 16 characters long, and contains at least one uppercase, one lowercase, and one special character.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="8-16 chars, must contain one uppercase and one special character"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex gap-3 justify-end border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-70 font-medium"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SettingPopup;