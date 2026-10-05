import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createNotification } from "../utils/notifications";
import ShareModal from "../components/ShareModal";

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

function Reels() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("trending");
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists()) setFollowedIds(snap.data().following || []);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      setLoading(true);
      try {
        const postsRef = collection(db, "posts");
        let data = [];

        if (tab === "trending") {
          const q = query(postsRef, orderBy("createdAt", "desc"), limit(50));
          const snap = await getDocs(q);
          data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        } else {
          const following = followedIds.slice(0, 10);
          if (following.length === 0) {
            setReels([]);
            setLoading(false);
            return;
          }
          const q = query(postsRef, where("userId", "in", following), limit(50));
          const snap = await getDocs(q);
          data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }

        setReels(data);
      } catch (err) {
        console.warn("Reels fetch failed:", err);
        setReels([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tab, currentUser, followedIds]);

  return (
    <div className="h-[calc(100dvh-60px)] md:h-[100dvh] flex flex-col overflow-hidden bg-black relative">
      <div className="shrink-0 h-14 flex items-center justify-center gap-2 z-30 bg-gradient-to-b from-black via-black/90 to-transparent">
        {[
          { id: "trending", label: "Trending" },
          { id: "following", label: "Following" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
              tab === t.id
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.7)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-pink-500 font-mono text-sm animate-pulse">
            Loading the chaos...
          </div>
        </div>
      ) : reels.length === 0 ? (
        <EmptyState tab={tab} followedCount={followedIds.length} />
      ) : (
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar">
          {reels.map((reel) => (
            <ReelItem key={reel.id} reel={reel} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ tab, followedCount }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-pink-400">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-2xl font-black tracking-tighter text-white mb-2">
          {tab === "following" && followedCount === 0
            ? "Follow some people first"
            : "Nothing here yet"}
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {tab === "following" && followedCount === 0
            ? "Follow creators to see their reels here."
            : "Be the first to post."}
        </p>
        <Link
          to="/upload"
          className="inline-block bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-[0_0_30px_-10px_rgba(236,72,153,0.6)] transition-all"
        >
          Upload a Reel
        </Link>
      </div>
    </div>
  );
}

function ReelItem({ reel, currentUser }) {
  const {
    id: postId,
    caption,
    url,
    userId,
    filter,
    mediaUrls,
    mediaType,
    textOverlays,
    taggedUsers,
    hideLikes,
    disableComments,
  } = reel;

  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const [inView, setInView] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likeCount || 0);
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [authorUsername, setAuthorUsername] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState("");
  const [myUsername, setMyUsername] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const likeInFlight = useRef(false);
  const [showShare, setShowShare] = useState(false); // 🔥 NEW

  const allMedia = mediaUrls && mediaUrls.length > 0 ? mediaUrls : url ? [url] : [];
  const mediaUrl = allMedia[0] || "";
  const isVideo =
    mediaUrl.includes(".mp4") ||
    mediaUrl.includes("video") ||
    mediaType === "video";
  const mediaFilter = FILTER_CSS[filter] || "none";

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId)).then((snap) => {
      if (snap.exists()) {
        setAuthorUsername(snap.data().username || "user");
        setAuthorPhoto(snap.data().photoURL || "");
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists()) setMyUsername(snap.data().username || "user");
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const postRef = doc(db, "posts", postId);
    const unsubLikes = onSnapshot(postRef, (snap) => {
      if (snap.exists() && !likeInFlight.current) {
        const data = snap.data();
        const safeLikes = Array.isArray(data.likes) ? data.likes : [];
        setLiked(safeLikes.includes(currentUser.uid));
        setLikeCount(data.likeCount || safeLikes.length);
      }
    });

    const saveRef = doc(db, "users", currentUser.uid, "saved", postId);
    const unsubSave = onSnapshot(
      saveRef,
      (snap) => setSaved(snap.exists()),
      () => setSaved(false)
    );

    return () => {
      unsubLikes();
      unsubSave();
    };
  }, [postId, currentUser]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    if (inView && !userPaused) {
      video.play().catch(() => {});
    } else {
      video.pause();
      if (!inView) setUserPaused(false);
    }
  }, [inView, isVideo, userPaused]);

  const toggleLike = async () => {
    if (!currentUser || likeInFlight.current) return;
    likeInFlight.current = true;

    const wasLiked = liked;
    const prevCount = likeCount;

    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    if (!wasLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        likes: wasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likeCount: increment(wasLiked ? -1 : 1),
      });
      if (!wasLiked) {
        createNotification({
          recipientId: userId,
          actorId: currentUser.uid,
          actorUsername: myUsername,
          actorPhoto: "",
          type: "like",
          postId,
          postPreviewUrl: mediaUrl,
        });
      }
      setTimeout(() => { likeInFlight.current = false; }, 400);
    } catch (err) {
      console.error("Like failed:", err);
      setLiked(wasLiked);
      setLikeCount(prevCount);
      likeInFlight.current = false;
    }
  };

  const toggleSave = async () => {
    if (!currentUser) return;
    const saveRef = doc(db, "users", currentUser.uid, "saved", postId);
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, {
          postId,
          savedAt: serverTimestamp(),
          savedAtMs: Date.now(),
          postUrl: mediaUrl,
          postCaption: caption || "",
          postOwnerId: userId,
          postOwnerUsername: authorUsername,
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      setSaved(wasSaved);
    }
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked && currentUser) toggleLike();
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 1000);
    } else {
      if (isVideo) setUserPaused((p) => !p);
    }
    setLastTap(now);
  };

  useEffect(() => {
    if (!showComments || !postId) return;
    const ref = collection(db, "posts", postId, "comments");
    const unsub = onSnapshot(ref, async (snap) => {
      const docs = await Promise.all(
        snap.docs.map(async (d) => {
          const cd = d.data();
          const userDoc = await getDoc(doc(db, "users", cd.userId));
          return {
            id: d.id,
            ...cd,
            username: userDoc.exists() ? userDoc.data().username : "anon",
          };
        })
      );
      docs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setComments(docs);
    });
    return () => unsub();
  }, [showComments, postId]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (disableComments) return;
    if (!commentInput.trim() || !currentUser) return;
    const text = commentInput.trim();
    setCommentInput("");
    const ref = collection(db, "posts", postId, "comments");
    await addDoc(ref, {
      text,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    createNotification({
      recipientId: userId,
      actorId: currentUser.uid,
      actorUsername: myUsername,
      actorPhoto: "",
      type: "comment",
      postId,
      postPreviewUrl: mediaUrl,
      text: text.slice(0, 100),
    });
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full snap-start relative bg-black flex items-center justify-center overflow-hidden"
    >
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer select-none"
        onClick={handleMediaTap}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
            playsInline
            className="w-full h-full object-contain"
            style={{ filter: mediaFilter }}
          />
        ) : (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: mediaFilter }}
            draggable={false}
          />
        )}

        {textOverlays?.map((t, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              color: t.color,
              fontSize: t.size === "small" ? "1.2rem" : t.size === "large" ? "2.5rem" : "1.8rem",
              fontWeight: 900,
              textShadow: "0 2px 10px rgba(0,0,0,0.9)",
              top: `${20 + i * 12}%`,
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              maxWidth: "90%",
            }}
          >
            {t.text}
          </div>
        ))}

        <AnimatePresence>
          {isVideo && userPaused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {heartPop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
            >
              <motion.div
                initial={{ scale: 0, rotate: -15, opacity: 0 }}
                animate={{ scale: [0, 1.4, 1.2], rotate: [-15, 0, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1, times: [0, 0.3, 1] }}
              >
                <svg viewBox="0 0 24 24" fill="url(#reel-heart)" className="w-40 h-40" style={{ filter: "drop-shadow(0 0 40px rgba(236,72,153,1))" }}>
                  <defs>
                    <linearGradient id="reel-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* RIGHT ACTION RAIL */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-5">
        <Link
          to={`/u/${authorUsername}`}
          className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/90 hover:border-pink-500 transition-all"
        >
          {authorPhoto ? (
            <img src={authorPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center">
              <span className="text-sm font-black text-white">
                {authorUsername.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
          )}
        </Link>

        <motion.button onClick={toggleLike} whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-1 relative">
          <div className="relative">
            <motion.svg
              key={liked ? "liked" : "unliked"}
              initial={liked ? { scale: 0.5 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              viewBox="0 0 24 24"
              fill={liked ? "#ec4899" : "none"}
              stroke="white"
              strokeWidth="2"
              className="w-8 h-8 drop-shadow-lg"
            >
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            <AnimatePresence>
              {burst && (
                <>
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 rounded-full border-2 border-pink-500"
                  />
                </>
              )}
            </AnimatePresence>
          </div>
          {!hideLikes && (
            <span className="text-xs font-bold text-white drop-shadow-lg">{likeCount}</span>
          )}
        </motion.button>

        <button
          onClick={() => !disableComments && setShowComments(true)}
          disabled={disableComments}
          className="flex flex-col items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className={`w-8 h-8 drop-shadow-lg ${disableComments ? "opacity-40" : ""}`}>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-bold text-white drop-shadow-lg">{comments.length || reel.commentCount || 0}</span>
        </button>

        <motion.button onClick={toggleSave} whileTap={{ scale: 0.85 }} className="flex flex-col items-center gap-1">
          <motion.svg
            key={saved ? "saved" : "unsaved"}
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            viewBox="0 0 24 24"
            fill={saved ? "#ec4899" : "none"}
            stroke="white"
            strokeWidth="2"
            className="w-7 h-7 drop-shadow-lg"
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.button>

        {/* 🔥 Share (wired) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowShare(true);
          }}
          className="flex flex-col items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7 drop-shadow-lg">
            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* BOTTOM INFO */}
      <div className="absolute left-4 right-20 bottom-6 z-20 text-white">
        <Link to={`/u/${authorUsername}`} className="inline-flex items-center gap-2 mb-2 group">
          <span className="text-sm font-bold group-hover:text-pink-400 transition-colors">@{authorUsername}</span>
        </Link>
        {caption && (
          <p className="text-sm text-white/95 leading-relaxed line-clamp-3 mb-2">{caption}</p>
        )}
        {taggedUsers && taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {taggedUsers.map((u, i) => (
              <Link key={i} to={`/u/${u}`} className="text-[11px] text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-full hover:bg-blue-500/30 transition-colors">
                @{u}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* COMMENTS DRAWER */}
      <AnimatePresence>
        {showComments && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 right-0 bottom-0 z-50 bg-[#111111] border-t border-white/10 rounded-t-3xl max-h-[70%] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h3 className="text-base font-bold text-white">
                  Comments <span className="text-gray-500">({comments.length})</span>
                </h3>
                <button
                  onClick={() => setShowComments(false)}
                  className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-gray-600 font-mono py-8">
                    No comments yet. Break the silence.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 text-xs">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-white">
                          {c.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 leading-relaxed flex-1">
                        <Link to={`/u/${c.username}`} className="font-bold text-pink-400 mr-1.5 hover:text-pink-300">
                          @{c.username}
                        </Link>
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleComment} className="p-4 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-grow px-4 py-2.5 text-sm rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
                >
                  Send
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🔥 SHARE MODAL */}
      <AnimatePresence>
        {showShare && (
          <ShareModal
            post={{
              postId,
              url: mediaUrl,
              caption,
              mediaUrls: allMedia,
              authorUsername,
            }}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Reels;