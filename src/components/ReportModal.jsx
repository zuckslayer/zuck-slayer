import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { reportContent } from "../utils/moderation";

const REASONS = [
  { id: "spam", label: "Spam or scam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "nudity", label: "Nudity or sexual content" },
  { id: "violence", label: "Violence or dangerous content" },
  { id: "false", label: "False information" },
  { id: "other", label: "Something else" },
];

function ReportModal({ contentType, contentId, reportedUserId, onClose }) {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return setError("Pick a reason first.");
    setSending(true);
    setError("");

    try {
      await reportContent({
        reporterId: currentUser.uid,
        contentType,
        contentId,
        reportedUserId,
        reason,
        details,
      });
      setDone(true);
      setTimeout(() => onClose(), 1600);
    } catch (err) {
      console.error("Report failed:", err);
      setError("Couldn't submit the report. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111111] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {done ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-green-400">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thanks for reporting</h3>
            <p className="text-sm text-gray-500">Our team will review this shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-white">Report</h3>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Why are you reporting this?
              </p>
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    reason === r.id
                      ? "bg-gradient-to-r from-pink-500/10 to-purple-500/5 border-pink-500/40"
                      : "bg-white/[0.02] border-white/5 hover:border-white/15"
                  }`}
                >
                  <span className={`text-sm font-semibold ${reason === r.id ? "text-white" : "text-gray-300"}`}>
                    {r.label}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    reason === r.id ? "border-pink-500" : "border-white/20"
                  }`}>
                    {reason === r.id && <div className="w-2 h-2 rounded-full bg-pink-500"></div>}
                  </div>
                </button>
              ))}

              <div className="pt-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Additional details (optional)
                </p>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything else we should know?"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/50 transition-all resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 px-5 pb-2">{error}</p>
            )}

            <div className="p-5 border-t border-white/5 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-white font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !reason}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ReportModal;