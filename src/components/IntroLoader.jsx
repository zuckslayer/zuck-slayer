import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

function IntroLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0); // 0=Load, 1=Windup, 2=Cut, 3=Exit
  const onCompleteRef = useRef(onComplete);

  // Keep the ref updated so the timer doesn't reset on re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 1. Smooth, predictable progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(prev + 4, 100);
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // 2. Bulletproof timeline - ONLY depends on progress
  useEffect(() => {
    if (progress >= 100 && stage === 0) {
      const timers = [
        setTimeout(() => setStage(1), 200),   // Windup
        setTimeout(() => setStage(2), 800),   // The Slash
        setTimeout(() => setStage(3), 1600),  // Wash out
        setTimeout(() => {
          if (onCompleteRef.current) onCompleteRef.current();
        }, 2400)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [progress, stage]);

  const isCut = stage === 2 || stage === 3;
  const isExit = stage === 3;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden font-sans select-none"
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      {/* Cyberpunk Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={
          stage === 1 ? { scale: 0.96, transition: { duration: 0.6, ease: "easeIn" } }
          : isCut ? { scale: 1.05, x: [0, -5, 5, -2, 0], transition: { duration: 0.4 } }
          : { scale: 1 }
        }
      >
        <div className="relative">
          {/* 🔥 Vice City Pink (FF007F) → Violet (8A2BE2) → Facebook Blue (1877F2) */}
          <h1 
            className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,127,0.6)]"
            style={{
              background: "linear-gradient(90deg, #FF007F 0%, #8A2BE2 50%, #1877F2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ZUCK SLAYER
          </h1>

          <AnimatePresence>
            {isCut && (
              <>
                <motion.h1 className="absolute inset-0 text-6xl md:text-8xl font-black tracking-tighter text-[#FF007F] mix-blend-screen"
                  initial={{ x: -10, opacity: 0 }} animate={{ x: [-10, -15, -8, 0], opacity: [0, 0.8, 0.4, 0] }} transition={{ duration: 0.6 }}>ZUCK SLAYER</motion.h1>
                <motion.h1 className="absolute inset-0 text-6xl md:text-8xl font-black tracking-tighter text-[#1877F2] mix-blend-screen"
                  initial={{ x: 10, opacity: 0 }} animate={{ x: [10, 15, 8, 0], opacity: [0, 0.8, 0.4, 0] }} transition={{ duration: 0.6 }}>ZUCK SLAYER</motion.h1>
              </>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[#FF007F] font-mono text-sm mt-4 tracking-[0.3em] uppercase transition-colors duration-300">
          {isCut ? "ACCESS GRANTED" : "Establishing Secure Connection"}
        </p>
      </motion.div>

      <AnimatePresence>
        {stage === 0 && (
          <motion.div className="relative z-10 flex flex-col items-center" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <div className="w-64 md:w-96 h-1 bg-white/10 rounded-full mt-12 overflow-hidden">
              <motion.div className="h-full" style={{ background: "linear-gradient(90deg, #FF007F, #1877F2)", boxShadow: "0 0 15px rgba(255,0,127,0.8)" }}
                initial={{ width: "0%" }} animate={{ width: `${progress}%` }} transition={{ ease: "easeOut", duration: 0.2 }} />
            </div>
            <motion.p className="text-gray-500 font-mono text-xs mt-3" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>{progress}%</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 2 && (
          <>
            <motion.div className="absolute z-50 w-[200vw] h-[2px] bg-white/90 shadow-[0_0_30px_5px_rgba(255,255,255,0.9)] rotate-[-12deg]" style={{ top: "45%" }} initial={{ x: "-150vw", opacity: 0 }} animate={{ x: "150vw", opacity: [0, 1, 1, 0] }} transition={{ duration: 0.25 }} />
            <motion.div className="absolute z-50 w-[200vw] h-[2px] bg-[#FF007F] shadow-[0_0_30px_5px_rgba(255,0,127,0.8)] rotate-[8deg]" style={{ top: "55%" }} initial={{ x: "150vw", opacity: 0 }} animate={{ x: "-150vw", opacity: [0, 1, 1, 0] }} transition={{ duration: 0.25, delay: 0.1 }} />
            <motion.div className="absolute z-50 w-[200vw] h-[3px] bg-[#1877F2] shadow-[0_0_40px_8px_rgba(24,119,242,0.9)] rotate-[-4deg]" style={{ top: "50%" }} initial={{ x: "-150vw", opacity: 0 }} animate={{ x: "150vw", opacity: [0, 1, 1, 0] }} transition={{ duration: 0.35, delay: 0.2 }} />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCut && (
          <motion.div className="absolute z-40 rounded-full border-2 border-[#FF007F]/60 pointer-events-none" style={{ width: 200, height: 200 }} initial={{ scale: 0, opacity: 1 }} animate={{ scale: 15, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExit && (
          <motion.div className="absolute inset-0 z-[60] pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(255,0,127,0.3) 0%, rgba(24,119,242,0.15) 40%, rgba(10,10,10,1) 80%)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-[55] pointer-events-none shadow-[inset_0_0_200px_50px_rgba(0,0,0,0.8)]" />
    </motion.div>
  );
}

export default IntroLoader;