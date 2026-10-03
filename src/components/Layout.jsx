import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

function Layout() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white flex flex-col md:flex-row font-sans selection:bg-pink-500/30">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-[#111111] border-r border-white/5 z-50">
        
        {/* Professional Brand Logo */}
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)]">
            {/* Custom Shield/Z Logo SVG */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 tracking-tighter leading-none">
              ZUCK SLAYER
            </h1>
            <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-1">V 0.1.0 BETA</p>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 overflow-y-auto mt-4">
          <Navbar />
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#111111] border-b border-white/5 p-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
             <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/></svg>
          </div>
          <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            ZUCK SLAYER
          </h1>
        </div>
        <button className="text-gray-400 text-2xl">☰</button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 relative min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;