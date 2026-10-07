import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const FILTER_CSS = {
  original: "none",
  vivid: "saturate(1.5) contrast(1.1)",
  punch: "saturate(2) contrast(1.3)",
  mono: "grayscale(1)",
  noir: "grayscale(1) contrast(1.5) brightness(0.9)",
  sepia: "sepia(0.8)",
  vintage: "sepia(0.4) saturate(1.2) contrast(0.9) brightness(1.1)",
  cool: "hue-rotate(180deg) saturate(1.2)",
  warm: "hue-rotate(-20deg) saturate(1.3)",
  fade: "contrast(0.85) brightness(1.15) saturate(0.9)",
  pop: "saturate(1.8) brightness(1.05)",
  dream: "blur(0.5px) brightness(1.1) saturate(1.3)",
};

function StoryViewer() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");

  const [author, setAuthor] = useState(null);
  const [stories, setStories] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const viewerMarked = useRef(new Set());

  useEffect(() => {
    if (!currentUser || !groupId) { navigate("/"); return; }

    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", groupId));
        if (userSnap.exists()) setAuthor({ id: groupId, ...userSnap.data() });

        const storiesRef = collection(db, "stories");
        const q = query(storiesRef, where("userId", "==", groupId), where("expiresAtMs", ">", Date.now()));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        setStories(list);
      } catch (err) {
        console.warn("StoryViewer load failed:", err);
      } finally { setLoading(false); }
    };
    load();
  }, [groupId, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser || !stories[current]) return;
    const story = stories[current];
    if (viewerMarked.current.has(story.id)) return;
    if (story.userId === currentUser.uid) return;
    viewerMarked.current.add(story.id);
    updateDoc(doc(db, "stories", story.id), { viewers: arrayUnion(currentUser.uid) }).catch(() => {});
  }, [current, stories, currentUser]);

  useEffect(() => {
    if (loading || stories.length === 0) return;
    const story = stories[current];
    if (!story) return;
    setProgress(0);

    const isVideo = story.mediaType === "video" || (story.url || "").includes(".mp4") || (story.url || "").includes("video");
    if (isVideo) return;

    const duration = 5000;
    const tick = 50;
    let elapsed = 0;
    if (timerRef.current) clearInterval(timerRef.current);

    if (!paused) {
      timerRef.current = setInterval(() => {
        elapsed += tick;
        setProgress(Math.min(100, (elapsed / duration) * 100));
        if (elapsed >= duration) { clearInterval(timerRef.current); goNext(); }
      }, tick);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, stories, loading, paused]);

  const goNext = () => { if (current < stories.length - 1) setCurrent((c) => c + 1); else navigate("/"); };
  const goPrev = () => { if (current > 0) setCurrent((c) => c - 1); };

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > (rect.width * 2) / 3) goNext();
    else setPaused((p) => !p);
  };

  const pressTimer = useRef(null);
  const handlePressStart = () => { pressTimer.current = setTimeout(() => setPaused(true), 300); };
  const handlePressEnd = () => { if (pressTimer.current) clearTimeout(pressTimer.current); if (paused) setPaused(false); };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-pink-500 font-mono text-sm animate-pulse">Loading story...</div>
      </div>
    );
  }

  if (stories.length === 0 || !author) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
        <p className="text-gray-400 text-sm mb-4">Story unavailable.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl"
        >
          Back Home
        </button>
      </div>
    );
  }

  const story = stories[current];
  const mediaUrl = story.url || (story.mediaUrls && story.mediaUrls[0]) || "";
  const isVideo = story.mediaType === "video" || mediaUrl.includes(".mp4") || mediaUrl.includes("video");
  const mediaFilter = FILTER_CSS[story.filter] || "none";
  const isMyStory = story.userId === currentUser.uid;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div
        className="relative w-full max-w-md h-full max-h-[100dvh] bg-black overflow-hidden"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
      >
        <div className="absolute top-3 left-3 right-3 z-40 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: i < current ? "100%" : i === current ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>

        <div className="absolute top-8 left-3 right-3 z-40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
            {author.photoURL ? (
              <img src={author.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-black text-white">{author.username?.charAt(0).toUpperCase() || "?"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white drop-shadow-lg truncate">@{author.username}</p>
            <p className="text-[10px] text-white/70 drop-shadow-lg font-mono">
              {story.createdAtMs ? Math.round((Date.now() - story.createdAtMs) / 60000) + "m ago" : ""}
            </p>
          </div>
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center" onClick={handleTap}>
          {isVideo ? (
            <video ref={videoRef} src={mediaUrl} autoPlay playsInline
              onTimeUpdate={(e) => { const v = e.target; if (v.duration) setProgress((v.currentTime / v.duration) * 100); }}
              onEnded={goNext}
              className="w-full h-full object-contain" style={{ filter: mediaFilter }} />
          ) : (
            <img src={mediaUrl} alt="" className="w-full h-full object-contain" style={{ filter: mediaFilter }} draggable={false} />
          )}

          {story.textOverlays?.map((t, i) => (
            <div key={i} className="absolute pointer-events-none"
              style={{
                color: t.color,
                fontSize: t.size === "small" ? "1.2rem" : t.size === "large" ? "2.5rem" : "1.8rem",
                fontWeight: 900,
                textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                top: `${20 + i * 12}%`, left: "50%", transform: "translateX(-50%)",
                whiteSpace: "nowrap", maxWidth: "90%",
              }}>
              {t.text}
            </div>
          ))}

          {story.caption && (
            <div className="absolute bottom-24 left-4 right-4 z-30">
              <p className="text-white text-sm text-center drop-shadow-lg bg-black/40 backdrop-blur rounded-xl px-4 py-2">{story.caption}</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {paused && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isMyStory && (
          <div className="absolute bottom-4 left-4 right-4 z-40 flex items-center gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={`Reply to @${author.username}...`}
              className="flex-1 px-4 py-2.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-white text-sm placeholder-white/60 focus:outline-none focus:border-pink-500/50"
            />
            <button
              onClick={() => { if (reply.trim()) navigate(`/u/${author.username}`); setReply(""); }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryViewer;