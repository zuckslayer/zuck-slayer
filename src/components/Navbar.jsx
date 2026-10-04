import { NavLink, Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// 🔥 Professional SVG Icon Components
const Icons = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Feed: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Chats: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Profile: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Login: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function Navbar() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  // 🔥 Listen for unread messages across all conversations
  useEffect(() => {
    if (!currentUser) {
      setHasUnread(false);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const anyUnread = snap.docs.some((d) => {
        const data = d.data();
        if (!data.lastMessageAt) return false;
        if (data.lastMessageSenderId === currentUser.uid) return false;
        const lastMsg = data.lastMessageAt.seconds || 0;
        const lastRead = data.lastReadAt?.[currentUser.uid]?.seconds || 0;
        return lastMsg > lastRead;
      });
      setHasUnread(anyUnread);
    });

    return () => unsub();
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium overflow-hidden ${
      isActive
        ? "bg-gradient-to-r from-pink-500/10 to-purple-500/5 text-pink-400 border border-pink-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        : "text-gray-400 hover:text-white border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Main Navigation */}
      <div className="space-y-1.5">
        <NavLink to="/" className={linkClass}>
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
          <Icons.Home /> <span className="relative z-10">Home</span>
        </NavLink>

        <NavLink to="/feed" className={linkClass}>
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
          <Icons.Feed /> <span className="relative z-10">The Chaos Feed</span>
        </NavLink>

        {/* 🔥 Messages with pink unread dot */}
        <NavLink to="/chats" className={linkClass}>
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
          <Icons.Chats /> <span className="relative z-10">Messages</span>
          {hasUnread && (
            <span className="ml-auto w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)] animate-pulse relative z-10"></span>
          )}
        </NavLink>

        {currentUser && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Creator Tools</p>
            </div>
            <NavLink to="/upload" className={linkClass}>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
              <Icons.Upload /> <span className="relative z-10">Upload Media</span>
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
              <Icons.Profile /> <span className="relative z-10">Your Profile</span>
            </NavLink>
          </>
        )}
      </div>

      {/* Bottom Section (Auth) */}
      <div className="mt-auto pt-8 pb-4 border-t border-white/5">
        {!currentUser ? (
          <div className="space-y-2">
            <NavLink to="/login" className={linkClass}>
              <Icons.Login /> <span className="relative z-10">Login</span>
            </NavLink>
            <NavLink to="/signup" className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.6)] transition-all duration-300 transform hover:scale-[1.02] active:scale-95">
              Sign Up Free
            </NavLink>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-3 bg-white/[0.02] rounded-xl border border-white/5 mb-4 hover:border-pink-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white">
                    {userProfile?.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-bold truncate">@{userProfile?.username || "user"}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate">{currentUser.email}</p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:text-red-300 transition-all duration-300 font-medium overflow-hidden border border-transparent hover:border-red-500/20 hover:bg-red-500/5 hover:shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
              <Icons.Logout /> <span className="relative z-10">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;