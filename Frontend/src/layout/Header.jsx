import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { 
  FaUserCircle, FaSearch, FaBell, FaBars, FaWallet, 
  FaUserEdit, FaSignOutAlt, FaChevronDown 
} from "react-icons/fa";
import { setSearchQuery } from "../store/slices/bookSlice";
import ProfileModal from "../popups/ProfileModal";
import SettleDuesModal from "../popups/SettleDuesModal";

const Header = ({ setIsSideBarOpen }) => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);
  const { searchQuery } = useSelector((state) => state.books);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettleDuesOpen, setIsSettleDuesOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 💰 SIMPLEST LOGIC: Just show what the backend says
  const totalDue = useMemo(() => {
    return Number(user?.totalFinesDue || 0);
  }, [user]);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 shadow-sm w-full font-sans">
      
      {/* Left: Search */}
      <div className="flex items-center gap-4 flex-1">
        <button onClick={() => setIsSideBarOpen && setIsSideBarOpen(true)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <FaBars className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center w-full max-w-md relative">
          <FaSearch className="absolute left-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery || ""}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Search catalog..."
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3 sm:space-x-6 flex-shrink-0">
        
        {/* Wallet Badge */}
        {user?.role !== "Admin" && (
          <div 
            onClick={() => totalDue > 0 && setIsSettleDuesOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
              totalDue > 0 
                ? 'bg-red-50 border-red-200 text-red-700 font-bold cursor-pointer hover:bg-red-100 hover:scale-105 active:scale-95' 
                : 'bg-green-50 border-green-200 text-green-700 font-bold'
            }`}
            title={totalDue > 0 ? "Click to pay outstanding fine" : "No outstanding fine"}
          >
            <FaWallet className={totalDue > 0 ? 'animate-pulse' : ''} />
            <span className="text-sm">₹{totalDue}</span>
          </div>
        )}

        <button className="text-gray-500 hover:text-blue-600 relative p-2 rounded-full hover:bg-gray-100">
          <FaBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
        </button>

        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 cursor-pointer p-1 rounded-xl hover:bg-gray-50 transition-all select-none group"
          >
            <div className="text-right hidden md:block leading-none">
              <p className="text-sm font-bold text-gray-800">{user?.name || "User"}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-black tracking-widest">{user?.role || "Member"}</p>
            </div>
            
            <div className="relative flex-shrink-0">
              {user?.avatar?.url ? (
                <img src={user.avatar.url} alt="p" className="h-10 w-10 rounded-full border-2 border-blue-500 p-0.5 object-cover" />
              ) : (
                <FaUserCircle className="h-10 w-10 text-gray-400" />
              )}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full border border-gray-200 p-0.5">
                <FaChevronDown className={`text-[8px] text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-white border border-gray-100 rounded-xl shadow-2xl z-[999] py-2 animate-fadeIn">
              <button 
                onClick={() => { setIsProfileModalOpen(true); setIsDropdownOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
              >
                <FaUserEdit className="text-blue-500" /> View Profile
              </button>
              <div className="border-t border-gray-50 my-1"></div>
              <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={user} />
      <SettleDuesModal isOpen={isSettleDuesOpen} onClose={() => setIsSettleDuesOpen(false)} totalDue={totalDue} userEmail={user?.email} />
    </header>
  );
};

export default Header;