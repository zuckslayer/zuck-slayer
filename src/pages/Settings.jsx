import { useState } from "react";
import { auth, db } from "../firebase";
import { signOut, sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Settings() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMessage("Password reset link sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("Are you sure? This will permanently delete your account and all your data.");
    if (!confirm1) return;
    const confirm2 = window.prompt("Type DELETE in all caps to confirm:");
    if (confirm2 !== "DELETE") {
      alert("Cancelled.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Delete user document from Firestore
      if (userProfile) {
        await deleteDoc(doc(db, "users", currentUser.uid));
      }
      // Delete the auth user
      await deleteUser(currentUser);
      navigate("/signup");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setError("Please log out and log back in before deleting your account.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const SettingsRow = ({ icon, title, description, onClick, danger, rightElement }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 text-left group ${
        danger
          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
          : "bg-white/[0.02] border-white/5 hover:border-pink-500/30 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          danger ? "bg-red-500/10 text-red-400" : "bg-white/[0.03] text-pink-400"
        }`}>
          {icon}
        </div>
        <div>
          <p className={`font-semibold text-sm ${danger ? "text-red-400" : "text-white"}`}>{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {rightElement || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-5 h-5 ${danger ? "text-red-400/50" : "text-gray-600"} group-hover:translate-x-1 transition-transform`}>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-white">
      
      {/* Header */}
      <div className="mb-8">
        <Link to="/profile" className="text-xs font-mono text-gray-500 hover:text-pink-400 transition tracking-widest uppercase mb-4 inline-block">
          ← Back to Profile
        </Link>
        <h1 className="text-4xl font-black tracking-tighter">
          Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">Settings</span>
        </h1>
        <p className="text-gray-500 text-sm mt-2">Manage your account, security, and privacy.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        {/* Account Info Card */}
        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Signed in as</p>
          <p className="text-sm text-pink-400 font-mono truncate">{currentUser?.email}</p>
        </div>

        {/* Security Section */}
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 px-2">Security</p>
          <div className="space-y-2">
            <SettingsRow
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="Change Password"
              description="Send a reset link to your email"
              onClick={handlePasswordReset}
            />
          </div>
        </div>

        {/* Account Section */}
        <div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3 px-2 mt-6">Account</p>
          <div className="space-y-2">
            <SettingsRow
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="Log Out"
              description="Sign out of this device"
              onClick={handleLogout}
            />
            <SettingsRow
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="Delete Account"
              description="Permanently delete your account and data"
              onClick={handleDeleteAccount}
              danger
            />
          </div>
        </div>

        {/* Messages */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 mt-6"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-400 mt-0.5 shrink-0">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs text-green-400">{message}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mt-6"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-400 mt-0.5 shrink-0">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 font-mono pt-8">
          Zuck Slayer v0.1.0 BETA · Built for the paranoid
        </p>
      </motion.div>
    </div>
  );
}

export default Settings;