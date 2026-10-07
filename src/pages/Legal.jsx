import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function Legal() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden text-gray-300">
      
      {/* Grid Background */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow Orbs */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-pink-600/15 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(236,72,153,0.5)] group-hover:shadow-[0_0_25px_-3px_rgba(236,72,153,0.8)] transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="w-6 h-6 text-white">
              <path d="M7 20L14 4" />
              <path d="M13 20L20 4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight hidden sm:block">
              ZUCK<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500"> SLAYER</span>
            </span>
          </Link>
          <button 
              onClick={() => navigate(-1)} 
              className="text-xs font-mono text-gray-500 hover:text-pink-400 transition tracking-widest uppercase"
            >
            ← Back
            </button>
        </div>
      </nav>

      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-3xl mx-auto px-6 py-16"
      >
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">Fine Print</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl">
            We're building a social network that actually respects you. Here's the honest truth about how we handle your data and what we expect from you.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs font-mono text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Last updated: October 2026 · v0.1.0 BETA
          </div>
        </div>

        {/* Section 1: Privacy */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-pink-400">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h2>
          </div>
          
          <div className="space-y-6 text-[15px] leading-relaxed text-gray-400">
            <div>
              <h3 className="text-white font-semibold mb-2">What we collect</h3>
              <p>The bare minimum. Your email and username are required to create an account. That's it. We don't ask for your phone number, your real name, or your location.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">How we protect it</h3>
              <p>Your chats and captions are encrypted on your device using AES-256-GCM before they ever touch our servers. We use Firebase for authentication and Firestore for database storage, but your encryption keys never leave your device. We literally cannot read your messages.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">What we don't do</h3>
              <p>We don't sell your data. We don't run ads. We don't track your behavior across the internet. We don't build shadow profiles of you. If you delete your account, your data is permanently deleted from our servers within 30 days.</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>

        {/* Section 2: Terms */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Terms of Service</h2>
          </div>
          
          <div className="space-y-6 text-[15px] leading-relaxed text-gray-400">
            <div>
              <h3 className="text-white font-semibold mb-2">Don't be a Zuck.</h3>
              <p>Spam, harassment, doxxing, and illegal activity are not welcome here. If you use the platform to harm others, we reserve the right to permanently ban your account without warning.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">You own your content.</h3>
              <p>Everything you post on Zuck Slayer belongs to you. We claim no ownership over your memes, your art, or your hot takes. By uploading, you grant us permission to host and display it to your followers.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Beta warning.</h3>
              <p>This is a beta product. Things will break. Features will change. We are constantly shipping updates to make the platform more secure and more fun. By using Zuck Slayer, you accept that you're part of the test crew.</p>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-12"></div>

        {/* Section 3: Contact */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-purple-400">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Contact & Updates</h2>
          </div>
          <p className="text-[15px] leading-relaxed text-gray-400">
            We may update these terms as the platform grows. When we do, we'll notify you inside the app. If you have any questions, requests for data deletion, or just want to say hi, reach out to the team directly.
          </p>
          <div className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Support Email</p>
              <a
                href="mailto:helper27076@gmail.com?subject=Zuck%20Slayer%20Support&body=Hi%2C%20I%20have%20a%20question%20about..."
                className="text-sm font-mono text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors"
              >
                helper27076@gmail.com
              </a>
            </div>
            <Link to="/signup" className="text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-full transition-all">
              Return to the Rebellion
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600 font-mono">
            © 2026 Zuck Slayer. All rights reserved. Built for the paranoid.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-gray-500 hover:text-white transition font-mono">HOME</Link>
            <Link to="/login" className="text-xs text-gray-500 hover:text-white transition font-mono">LOGIN</Link>
            <Link to="/signup" className="text-xs text-gray-500 hover:text-white transition font-mono">SIGNUP</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Legal;