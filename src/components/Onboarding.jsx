// src/components/Onboarding.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-white">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Private by default",
    body: "Your DMs are AES-256 encrypted. Keys live on your device — never on our servers.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-white">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Reels, posts, stories",
    body: "Vertical reels. Long posts. 24-hour stories. All in one app. No ads. No algorithm.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-white">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "You own your feed",
    body: "Chronological by default. Choose what you see. Turn off comments anytime. Block anyone.",
  },
];

function Onboarding() {
  const { currentUser } = useAuth();

  // 🔥 Internal visibility state — component controls its own mount
  const [visible, setVisible] = useState(() => {
    if (!currentUser) return false;
    const key = `zs_onboarded_${currentUser.uid}`;
    return !localStorage.getItem(key);
  });
  const [step, setStep] = useState(0);

  if (!currentUser || !visible) return null;

  const finish = () => {
    localStorage.setItem(`zs_onboarded_${currentUser.uid}`, "true");
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="w-full max-w-sm bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
      >
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_40px_-10px_rgba(236,72,153,0.8)]">
          {current.icon}
        </div>

        <h2 className="text-2xl font-black tracking-tighter text-white mb-3">
          {current.title}
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          {current.body}
        </p>

        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-gradient-to-r from-pink-500 to-purple-500"
                  : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-white text-sm font-bold transition-all"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-bold shadow-[0_0_25px_-8px_rgba(236,72,153,0.7)] transition-all active:scale-95"
          >
            {step < STEPS.length - 1 ? "Next" : "Let's go"}
          </button>
        </div>

        <button
          type="button"
          onClick={finish}
          className="mt-4 text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          Skip intro
        </button>
      </motion.div>
    </motion.div>
  );
}

export default Onboarding;