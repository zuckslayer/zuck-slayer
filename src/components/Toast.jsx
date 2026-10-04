import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 🔥 Icon set
  const Icons = {
    success: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    message: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };

  // 🔥 Style variants
  const styles = {
    success: "border-green-500/40 shadow-[0_0_30px_-5px_rgba(34,197,94,0.5)]",
    error: "border-red-500/40 shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)]",
    info: "border-pink-500/40 shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)]",
    message: "border-pink-500/40 shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)]",
  };

  const iconStyles = {
    success: "text-green-400 bg-green-500/10",
    error: "text-red-400 bg-red-500/10",
    info: "text-pink-400 bg-pink-500/10",
    message: "text-pink-400 bg-pink-500/10",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* 🔥 Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full sm:w-auto px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={() => dismissToast(toast.id)}
              className={`pointer-events-auto cursor-pointer flex items-start gap-3 p-4 rounded-2xl bg-[#111111]/95 backdrop-blur-xl border ${styles[toast.type]} relative overflow-hidden group`}
            >
              {/* Gradient accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-blue-500"></div>

              {/* Icon */}
              <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${iconStyles[toast.type]}`}>
                {Icons[toast.type]}
              </div>

              {/* Message */}
              <p className="flex-1 text-sm text-white leading-relaxed pt-1.5 pr-2">
                {toast.message}
              </p>

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Progress bar */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3.5, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}