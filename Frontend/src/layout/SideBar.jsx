import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

// Modern SVG Icons
import { RiAdminFill } from "react-icons/ri";
import { 
  LayoutDashboard, 
  Book, 
  Library, 
  Users, 
  Settings, 
  LogOut, 
  X,
  BookMarked,
  GitPullRequest, // 👈 Added for Borrow Requests
  Sparkles,
  BookOpen
} from "lucide-react";

// Redux Actions
import { logout, resetAuthSlice } from "../store/slices/authSlice";
import { toggleAddNewAdminPopup, toggleSettingPopup } from "../store/slices/popUpSlice";

// Components
import AddNewAdmin from "../popups/AddNewAdmin"; 
import SettingPopup from "../popups/SettingPopup";

// Assets
import logo_with_title from "../assets/logo-with-title.png";

const SideBar = ({ isSideBarOpen, setIsSideBarOpen, selectedComponent, setSelectedComponent }) => {
  const dispatch = useDispatch();
  
  // Pull popup states directly from Redux
  const { isAddNewAdminPopupOpen, isSettingPopupOpen } = useSelector((state) => state.popup);

  const { loading, logoutLoading, error, message, isAuthenticated, user } = useSelector(
    (state) => state.auth
  );

  const handleLogout = () => {
    dispatch(logout());
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
    if (message) {
      toast.success(message);
      dispatch(resetAuthSlice());
    }
  }, [dispatch, error, message]);

  // Helper function to style active links
  const getNavItemClass = (componentName) => {
    const isActive = selectedComponent === componentName;
    return `w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
      isActive
        ? "bg-blue-600 text-white shadow-md"
        : "text-gray-300 hover:bg-gray-800 hover:text-white"
    }`;
  };

  return (
    <>
      <aside className="flex flex-col h-full bg-gray-900 text-white shadow-2xl relative w-full">
        
        {/* Mobile Close Button */}
        <button 
          className="absolute top-4 right-4 p-2 rounded-md lg:hidden hover:bg-gray-800 transition-colors focus:outline-none"
          onClick={() => setIsSideBarOpen(false)}
        >
          <X className="w-6 h-6 opacity-80 hover:opacity-100 text-gray-300" />
        </button>

        {/* Logo Section */}
        <div className="flex items-center justify-center h-24 border-b border-gray-800 px-6">
          <img src={logo_with_title} alt="Library Logo" className="max-h-12 object-contain" />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* ========================================== */}
          {/* SHARED LINKS (Visible to both Admin & User) */}
          {/* ========================================== */}
          
          <button
            onClick={() => {
              setSelectedComponent("Dashboard");
              setIsSideBarOpen(false);
            }}
            className={getNavItemClass("Dashboard")}
          >
            <LayoutDashboard className="w-5 h-5" /> 
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setSelectedComponent("Catalog");
              setIsSideBarOpen(false);
            }}
            className={getNavItemClass("Catalog")}
          >
            <Library className="w-5 h-5" /> 
            <span>Catalog</span>
          </button>

          <button
            onClick={() => {
              setSelectedComponent("AILibrarian");
              setIsSideBarOpen(false);
            }}
            className={getNavItemClass("AILibrarian")}
          >
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> 
            <span>Smart AI Librarian</span>
          </button>

          <button
            onClick={() => {
              setSelectedComponent("MyBookshelf");
              setIsSideBarOpen(false);
            }}
            className={getNavItemClass("MyBookshelf")}
          >
            <BookOpen className="w-5 h-5 text-blue-400" /> 
            <span>My Bookshelf</span>
          </button>

          {/* ========================================== */}
          {/* ADMIN ONLY LINKS                             */}
          {/* ========================================== */}
          {isAuthenticated && user?.role === "Admin" && (
            <>
              {/* 🟢 NEW: Borrow Requests Link */}
              <button
                onClick={() => {
                  setSelectedComponent("BorrowRequests");
                  setIsSideBarOpen(false);
                }}
                className={getNavItemClass("BorrowRequests")}
              >
                <GitPullRequest className="w-5 h-5 text-amber-400" /> 
                <span>Borrow Requests</span>
              </button>

              <button
                onClick={() => {
                  setSelectedComponent("BookManagement");
                  setIsSideBarOpen(false);
                }}
                className={getNavItemClass("BookManagement")}
              >
                <Book className="w-5 h-5" /> 
                <span>Manage Books</span>
              </button>

              <button
                onClick={() => {
                  setSelectedComponent("Users");
                  setIsSideBarOpen(false);
                }}
                className={getNavItemClass("Users")}
              >
                <Users className="w-5 h-5" /> 
                <span>Users</span>
              </button>

              <div className="pt-4 mt-4 border-t border-gray-800">
                <button
                   onClick={() => dispatch(toggleAddNewAdminPopup(true))}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-emerald-400 hover:bg-gray-800 hover:text-emerald-300 transition-all duration-200"
                >
                  <RiAdminFill className="w-5 h-5" /> 
                  <span>Add New Admin</span>
                </button>
              </div>
            </>
          )}

          {/* ========================================== */}
          {/* USER ONLY LINKS                               */}
          {/* ========================================== */}
          {isAuthenticated && user?.role === "User" && (
            <button
              onClick={() => {
                setSelectedComponent("MyBorrowedBooks");
                setIsSideBarOpen(false);
              }}
              className={getNavItemClass("MyBorrowedBooks")}
            >
              <BookMarked className="w-5 h-5" />
              <span>My Borrowed Books</span>
            </button>
          )}

          {/* ========================================== */}
          {/* SHARED SETTINGS (Visible to everyone)        */}
          {/* ========================================== */}
          <button
            onClick={() => dispatch(toggleSettingPopup(true))}
            className="w-full flex items-center space-x-3 px-4 py-3 mt-2 rounded-lg font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
            <span>Update Credentials</span>
          </button>
        </nav>

        {/* Logout Section at Bottom */}
        <div className="p-4 border-t border-gray-800">
          <button
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <LogOut className="w-5 h-5" /> 
            <span>{logoutLoading ? "Logging out..." : "Log Out"}</span>
          </button>
        </div>
      </aside>

      {/* Popups controlled by Redux */}
      <AddNewAdmin 
        isOpen={isAddNewAdminPopupOpen} 
        onClose={() => dispatch(toggleAddNewAdminPopup(false))} 
      />
      <SettingPopup 
        isOpen={isSettingPopupOpen} 
        onClose={() => dispatch(toggleSettingPopup(false))} 
      />
    </>
  );
};

export default SideBar;