import React, { useState, useEffect } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import SideBar from "../layout/SideBar";
import Header from "../layout/Header";
import { getUser } from "../store/slices/authSlice";

// Dashboard Components
import AdminDashboard from "../components/AdminDashboard";
import UserDashboard from "../components/UserDashboard";
import Catalog from "../components/Catalog";
import MyBorrowedBooks from "../components/MyBorrowedBooks";
import BookManagement from "../components/BookManagement";
import Users from "../components/Users";
import BorrowRequests from "../components/borrowRequest";
import AILibrarian from "../components/AILibrarian";
import MyBookshelf from "./MyBookshelf";

const Home = () => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("Dashboard");

  const dispatch = useDispatch();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  // Fetch user data on mount to ensure session is still valid
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(getUser());
    }
  }, [dispatch, isAuthenticated]);

  // Redirect to login if not authenticated and not currently loading
  if (!isAuthenticated && !loading) {
    return <Navigate to={"/login"} />;
  }

  // Component Switcher Logic
  const renderComponent = () => {
    switch (selectedComponent) {
      case "Dashboard":
        return user?.role === "Admin" ? <AdminDashboard /> : <UserDashboard />;
      case "BookManagement":
        return <BookManagement />;
      case "Catalog":
        return <Catalog />;
      case "Users":
        return <Users />;
      case "MyBorrowedBooks":
        return <MyBorrowedBooks />;
      
      case "BorrowRequests":
      return <BorrowRequests />;
      case "AILibrarian":
        return <AILibrarian />;
      case "MyBookshelf":
        return <MyBookshelf />;
      default:
        return user?.role === "Admin" ? <AdminDashboard /> : <UserDashboard />;
    }
  };

  // Prevent flicker while loading initial user data
  if (loading && !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Sidebar Wrapper */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSideBarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SideBar
          isSideBarOpen={isSideBarOpen}
          setIsSideBarOpen={setIsSideBarOpen}
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
        />
      </div>

      {/* Mobile Backdrop */}
      {isSideBarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setIsSideBarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navigation Bar */}
       <Header setIsSideBarOpen={setIsSideBarOpen} />

        {/* Mobile-only sub-header for Sidebar Toggle */}
        <div className="lg:hidden flex items-center p-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setIsSideBarOpen(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <GiHamburgerMenu size={24} />
          </button>
          <span className="ml-4 font-bold text-gray-800 capitalize">
            {selectedComponent.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>

        {/* Scrollable Dashboard Section */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-8">
          
          {/* Dashboard Welcome Header (Desktop Only) */}
          <div className="mb-8 hidden md:block">
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedComponent === "Dashboard" ? `Welcome, ${user?.name}` : selectedComponent.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Library Management System &gt; {selectedComponent}
            </p>
          </div>

          {/* Dynamic Content Rendering Container */}
          <div className="animate-fadeIn transition-all duration-300">
            {renderComponent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;