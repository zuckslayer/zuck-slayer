import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Navbar from "./Navbar";

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileOpen]);

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white flex flex-col md:flex-row font-sans selection:bg-pink-500/30">

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-[#111111] border-r border-white/5 z-50">
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-6 h-6 text-white">
              <path d="M7 20L14 4" />
              <path d="M13 20L20 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tighter leading-none">
              ZUCK SLAYER
            </h1>
            <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-1">V 0.1.0 BETA</p>
          </div>
        </div>
        <nav className="flex-1 px-4 overflow-y-auto mt-4">
          <Navbar />
        </nav>
      </aside>

      {/* ═══ MOBILE TOP BAR ═══ */}
      <div className="md:hidden bg-[#111111]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-4 h-4 text-white">
              <path d="M7 20L14 4" />
              <path d="M13 20L20 4" />
            </svg>
          </div>
          <h1 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tighter">
            ZUCK SLAYER
          </h1>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 flex items-center justify-center transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ═══ MOBILE DRAWER ═══ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
            />

            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-[70] w-72 max-w-[85vw] bg-[#111111] border-r border-white/10 shadow-2xl md:hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-6 h-6 text-white">
                      <path d="M7 20L14 4" />
                      <path d="M13 20L20 4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tighter leading-none">
                      ZUCK SLAYER
                    </h1>
                    <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-1">V 0.1.0 BETA</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Drawer Navigation */}
              <nav className="flex-1 px-4 py-4 overflow-y-auto">
                <Navbar />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 md:ml-72 relative min-h-[100dvh] w-full">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;