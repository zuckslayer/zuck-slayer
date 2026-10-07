import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { blockUser, unblockUser, haveIBlocked } from "../utils/moderation";
import ReportModal from "./ReportModal";
import { useToast } from "./Toast";

function UserActionsMenu({ targetUserId, targetUsername, contentType = "user", contentId = "" }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !targetUserId) return;
    if (currentUser.uid === targetUserId) return;
    haveIBlocked(currentUser.uid, targetUserId).then(setBlocked).catch(() => {});
  }, [currentUser, targetUserId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!currentUser || currentUser.uid === targetUserId) return null;

  const handleBlock = async () => {
    setLoading(true);
    try {
      if (blocked) {
        await unblockUser(currentUser.uid, targetUserId);
        setBlocked(false);
        showToast(`Unblocked @${targetUsername}`, "success");
      } else {
        if (!window.confirm(`Block @${targetUsername}? They won't be able to see your profile or message you.`)) {
          setLoading(false);
          return;
        }
        await blockUser(currentUser.uid, targetUserId);
        setBlocked(true);
        showToast(`Blocked @${targetUsername}`, "success");
      }
      setOpen(false);
    } catch (err) {
      console.error("Block action failed:", err);
      showToast("Action failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] flex items-center justify-center transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-[200] w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => {
                  setOpen(false);
                  setShowReport(true);
                }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 text-sm text-gray-200 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-yellow-400">
                  <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Report
              </button>

              <div className="h-px bg-white/5" />

              <button
                onClick={handleBlock}
                disabled={loading}
                className={`w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                  blocked ? "text-green-400" : "text-red-400"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l14.14 14.14" strokeLinecap="round" />
                </svg>
                {loading ? "..." : blocked ? `Unblock @${targetUsername}` : `Block @${targetUsername}`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showReport && (
          <ReportModal
            contentType={contentType}
            contentId={contentId}
            reportedUserId={targetUserId}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default UserActionsMenu;