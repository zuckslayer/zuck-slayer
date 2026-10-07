import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./Toast";

const TYPES = [
  { id: "bug", label: "Bug", emoji: "🐞" },
  { id: "idea", label: "Idea", emoji: "💡" },
  { id: "other", label: "Other", emoji: "💬" },
];

function FeedbackButton() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);

    try {
      await addDoc(collection(db, "feedback"), {
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        type,
        message: message.trim().slice(0, 1000),
        url: window.location.pathname,
        userAgent: navigator.userAgent.slice(0, 200),
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
      });
      setDone(true);
      showToast("Thanks. We got it.", "success");
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setMessage("");
        setType("bug");
      }, 1600);
    } catch (err) {
      console.error("Feedback failed:", err);
      showToast("Failed to send. Try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[90] w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-[0_8px_30px_-5px_rgba(236,72,153,0.7)] flex items-center justify-center text-white transition-all active:scale-90"
        title="Send feedback"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !sending && setOpen(false)}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#111111] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {done ? (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-green-400">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Message sent</h3>
                  <p className="text-sm text-gray-500">Thanks for helping us build this.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="p-5 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Send Feedback</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Bugs, ideas, anything</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Type tabs */}
                    <div className="grid grid-cols-3 gap-2">
                      {TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setType(t.id)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            type === t.id
                              ? "bg-gradient-to-br from-pink-500/15 to-purple-500/10 border-pink-500/40"
                              : "bg-white/[0.02] border-white/5 hover:border-white/15"
                          }`}
                        >
                          <p className="text-xl mb-1">{t.emoji}</p>
                          <p className={`text-xs font-bold ${type === t.id ? "text-white" : "text-gray-400"}`}>
                            {t.label}
                          </p>
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={1000}
                      placeholder="Tell us what's on your mind..."
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/50 transition-all resize-none"
                      autoFocus
                    />
                    <p className="text-[10px] text-gray-600 font-mono text-right -mt-2">
                      {message.length}/1000
                    </p>
                  </div>

                  <div className="p-5 border-t border-white/5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex-1 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-white font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FeedbackButton;