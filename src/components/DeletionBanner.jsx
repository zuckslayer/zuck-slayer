import { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./Toast";

function DeletionBanner() {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [dismissing, setDismissing] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  if (!currentUser || !userProfile?.pendingDeletion || cancelled) return null;

  const purgeAt = userProfile.purgeAtMs
    ? new Date(userProfile.purgeAtMs)
    : null;

  const daysLeft = purgeAt
    ? Math.max(0, Math.ceil((purgeAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  const formattedDate = purgeAt
    ? purgeAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "in 30 days";

  const handleCancel = async () => {
    setDismissing(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        pendingDeletion: false,
        deletionRequestedAtMs: deleteField(),
        purgeAtMs: deleteField(),
      });
      setCancelled(true);
      showToast("Account restored. Welcome back.", "success");
    } catch (err) {
      console.error("Cancel deletion failed:", err);
      showToast("Couldn't cancel. Try again.", "error");
      setDismissing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="sticky top-0 z-[80] bg-gradient-to-r from-red-600/95 to-pink-600/95 backdrop-blur border-b border-red-500/40 px-4 py-3"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                Your account is scheduled for deletion
              </p>
              <p className="text-xs text-white/85 font-mono">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left · Permanent on {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            disabled={dismissing}
            className="shrink-0 px-4 py-2 rounded-xl bg-white text-red-600 font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-60"
          >
            {dismissing ? "Restoring..." : "Cancel Deletion"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DeletionBanner;