import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
        try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Welcome back to the chaos.", "success");
      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      const msg = err.message
        .replace("Firebase: ", "")
        .replace("Error (auth/invalid-credential).", "Incorrect email or password.")
        .replace("Error (auth/user-not-found).", "No account found with this email.")
        .replace("Error (auth/wrong-password).", "Incorrect password.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col lg:flex-row relative">
      
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
      <div className="fixed top-[-200px] left-[-200px] w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-pink-600/25 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-blue-600/25 blur-[130px] pointer-events-none" />

      {/* LEFT SIDE: Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-between p-14 border-r border-white/5">
        <Link to="/" className="flex items-center gap-4 w-fit group">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(236,72,153,0.6)] group-hover:shadow-[0_0_45px_-5px_rgba(236,72,153,0.9)] group-hover:scale-105 transition-all duration-300">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none">
              ZUCK<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500"> SLAYER</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1.5">EST. 2025 · v0.1.0 BETA</p>
          </div>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-6xl xl:text-7xl font-black text-white tracking-tighter leading-[0.95] mb-8">
            Welcome<br />
            back to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
              the chaos.
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Your feed hasn't moved an inch. No algorithm decided what you missed. Just the people you actually care about.
          </p>
          <div className="space-y-5 mt-12">
            {[
              "A feed that respects your time",
              "Post anonymously when you need to",
              "Zero ads. Zero algorithm games.",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-4 text-[15px] text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-500 to-blue-500"></div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span>12,847 already inside · Join the chaos</span>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form — this is the fix */}
      <div className="flex-1 relative z-10 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-12 min-h-[100dvh]">
        <div className="w-full max-w-md mx-auto">
          
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-[0_0_25px_-5px_rgba(236,72,153,0.6)]">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter">
              ZUCK<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500"> SLAYER</span>
            </h1>
          </Link>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/10 via-transparent to-blue-500/10 pointer-events-none" />

            <div className="relative z-10">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Welcome back</h2>
                <p className="text-sm text-gray-500">Your feed is waiting for you.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all duration-300"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[10px] text-pink-400 hover:text-pink-300 font-bold uppercase tracking-widest transition">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all duration-300"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-400 transition"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                          <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-400 mt-0.5 shrink-0">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-xs text-red-400">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold tracking-wide shadow-[0_0_30px_-10px_rgba(236,72,153,0.6)] hover:shadow-[0_0_45px_-10px_rgba(236,72,153,0.9)] transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Entering...
                    </>
                  ) : (
                    "Enter the Feed"
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-[10px] text-gray-600 font-mono tracking-widest">OR</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <Link
                to="/signup"
                className="block w-full text-center py-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] text-white font-bold tracking-wide transition-all duration-300"
              >
                New around here? Join the chaos
              </Link>
            </div>
          </motion.div>

          <p className="text-center text-xs text-gray-600 mt-5 font-mono">
            By continuing, you accept our{" "}
            <Link to="/legal" className="text-pink-400 hover:text-pink-300 underline underline-offset-2">
              Terms & Privacy Policy
            </Link>
            . We keep them short. Unlike Zuck's.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;