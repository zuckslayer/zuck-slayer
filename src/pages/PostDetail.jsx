import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
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

function PostDetail() {
  const { postId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [likes, setLikes] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [burst, setBurst] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const likeInFlight = useRef(false);

  // Fetch post
  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, "posts", postId);
    const unsub = onSnapshot(
      postRef,
      async (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        setPost(data);

        // Fetch author
        if (data.userId) {
          try {
            const authorSnap = await getDoc(doc(db, "users", data.userId));
            if (authorSnap.exists()) setAuthor(authorSnap.data());
          } catch (_) {}
        }

        const safeLikes = Array.isArray(data.likes) ? data.likes : [];
        if (!likeInFlight.current) {
          setLikes(safeLikes);
          setLikeCount(data.likeCount || safeLikes.length);
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Post detail error:", error);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [postId]);

  // Fetch my username
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists()) setMyUsername(snap.data().username || "user");
    });
  }, [currentUser]);

  // Comments listener
  useEffect(() => {
    if (!postId) return;
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
            photoURL: userDoc.exists() ? userDoc.data().photoURL : "",
          };
        })
      );
      docs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setComments(docs);
    });
    return () => unsub();
  }, [postId]);

  // Save state
  useEffect(() => {
    if (!currentUser || !postId) return;
    const saveRef = doc(db, "users", currentUser.uid, "saved", postId);
    const unsub = onSnapshot(
      saveRef,
      (snap) => setIsSaved(snap.exists()),
      () => setIsSaved(false)
    );
    return () => unsub();
  }, [currentUser, postId]);

  const isAuthenticated = !!currentUser;
  const isLiked = currentUser && likes.includes(currentUser.uid);

  const doLike = async () => {
    if (!isAuthenticated || likeInFlight.current) return;
    likeInFlight.current = true;
    const wasLiked = isLiked;
    const prevLikes = [...likes];
    const prevCount = likeCount;

    if (wasLiked) {
      setLikes(prevLikes.filter((id) => id !== currentUser.uid));
      setLikeCount(Math.max(0, prevCount - 1));
    } else {
      setLikes([...prevLikes, currentUser.uid]);
      setLikeCount(prevCount + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }

    try {
      await updateDoc(doc(db, "posts", postId), {
        likes: wasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likeCount: increment(wasLiked ? -1 : 1),
      });
      if (!wasLiked && post.userId) {
        createNotification({
          recipientId: post.userId,
          actorId: currentUser.uid,
          actorUsername: myUsername,
          actorPhoto: "",
          type: "like",
          postId,
          postPreviewUrl: post.url || "",
        });
      }
      setTimeout(() => { likeInFlight.current = false; }, 400);
    } catch (err) {
      console.error("Like failed:", err);
      setLikes(prevLikes);
      setLikeCount(prevCount);
      likeInFlight.current = false;
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    const saveRef = doc(db, "users", currentUser.uid, "saved", postId);
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, {
          postId,
          savedAt: serverTimestamp(),
          savedAtMs: Date.now(),
          postUrl: post.url || "",
          postCaption: post.caption || "",
          postOwnerId: post.userId,
          postOwnerUsername: author?.username || "user",
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      setIsSaved(wasSaved);
    }
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked && isAuthenticated) doLike();
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 1000);
    }
    setLastTap(now);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !isAuthenticated) return;
    const text = commentInput.trim();
    setCommentInput("");
    const ref = collection(db, "posts", postId, "comments");
    await addDoc(ref, {
      text,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    if (post.userId) {
      createNotification({
        recipientId: post.userId,
        actorId: currentUser.uid,
        actorUsername: myUsername,
        actorPhoto: "",
        type: "comment",
        postId,
        postPreviewUrl: post.url || "",
        text: text.slice(0, 100),
      });
    }
  };

  const handleDeleteComment = async (commentId) => {
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-pink-500 font-mono animate-pulse">
        Loading post...
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-red-400">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Post unavailable</h2>
        <p className="text-gray-500 text-sm mb-6">It may have been deleted or the link is broken.</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const allMedia = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : post.url ? [post.url] : [];
  const isCarousel = allMedia.length > 1;
  const mediaUrl = allMedia[currentMedia] || "";
  const isVideo =
    mediaUrl.includes(".mp4") || mediaUrl.includes("video") || post.mediaType === "video";
  const mediaFilter = FILTER_CSS[post.filter] || "none";
  const isOwner = currentUser?.uid === post.userId;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-pink-400 transition tracking-widest uppercase mb-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#111111] border border-white/5 rounded-3xl overflow-hidden">
        {/* ═══ MEDIA SIDE ═══ */}
        <div className="relative bg-black">
          <div
            className="relative aspect-square flex items-center justify-center overflow-hidden cursor-pointer select-none"
            onClick={handleMediaTap}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                controls
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

            {/* Text overlays */}
            {post.textOverlays?.map((t, i) => (
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

            {/* Corner accents */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-pink-500/70 rounded-tl-md pointer-events-none" />
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-pink-500/70 rounded-tr-md pointer-events-none" />

            {/* Double-tap heart */}
            <AnimatePresence>
              {heartPop && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -15, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 1.2], rotate: [-15, 0, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 1, times: [0, 0.3, 1] }}
                  >
                    <svg viewBox="0 0 24 24" fill="url(#pd-heart)" className="w-32 h-32" style={{ filter: "drop-shadow(0 0 40px rgba(236,72,153,1))" }}>
                      <defs>
                        <linearGradient id="pd-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Carousel nav */}
            {isCarousel && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMedia((p) => (p - 1 + allMedia.length) % allMedia.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center hover:border-pink-500/50 transition-all z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentMedia((p) => (p + 1) % allMedia.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center hover:border-pink-500/50 transition-all z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur border border-white/15">
                  {allMedia.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === currentMedia ? "bg-gradient-to-r from-pink-500 to-purple-500 w-4 h-1.5" : "bg-white/40 w-1.5 h-1.5"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ INFO SIDE ═══ */}
        <div className="flex flex-col max-h-[80vh] md:max-h-[700px]">
          {/* Author header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/5">
            <Link to={`/u/${author?.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shrink-0">
                {author?.photoURL ? (
                  <img src={author.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white">
                    {author?.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate group-hover:text-pink-400 transition-colors">
                  @{author?.username || "user"}
                </p>
                {post.location && (
                  <p className="text-[10px] text-gray-500 font-mono truncate">{post.location}</p>
                )}
              </div>
            </Link>
            {isOwner && (
              <button
                onClick={async () => {
                  if (!window.confirm("Delete this post permanently?")) return;
                  await deleteDoc(doc(db, "posts", postId));
                  navigate(-1);
                }}
                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-400">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Caption + comments scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {post.caption && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">
                    {author?.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed pt-1">
                  <Link to={`/u/${author?.username}`} className="font-bold text-white hover:text-pink-400 mr-2">
                    @{author?.username}
                  </Link>
                  {post.caption}
                </p>
              </div>
            )}

            {post.taggedUsers && post.taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.taggedUsers.map((u, i) => (
                  <Link key={i} to={`/u/${u}`} className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-colors">
                    @{u}
                  </Link>
                ))}
              </div>
            )}

            <div className="h-px bg-white/5" />

            {comments.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6 font-mono">
                No comments yet. Break the silence.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex justify-between items-start text-xs gap-3 group/c">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.photoURL ? (
                        <img src={c.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-white">{c.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-gray-300 leading-relaxed pt-0.5">
                      <Link to={`/u/${c.username}`} className="font-bold text-pink-400 mr-1.5 hover:text-pink-300">
                        @{c.username}
                      </Link>
                      {c.text}
                      <span className="text-gray-600 text-[10px] ml-2 font-mono">{formatTime(c.createdAt)}</span>
                    </p>
                  </div>
                  {currentUser?.uid === c.userId && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-red-500 hover:text-red-400 shrink-0 font-bold opacity-0 group-hover/c:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action bar */}
          <div className="border-t border-white/5 p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={doLike}
                disabled={!isAuthenticated}
                whileTap={{ scale: 0.85 }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors relative ${
                  !isAuthenticated
                    ? "text-gray-500 cursor-not-allowed"
                    : isLiked
                    ? "text-pink-400"
                    : "text-white hover:text-pink-400"
                }`}
              >
                <div className="relative">
                  <motion.svg
                    key={isLiked ? "l" : "u"}
                    initial={isLiked ? { scale: 0.5 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    viewBox="0 0 24 24"
                    fill={isLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                  <AnimatePresence>
                    {burst && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={{ scale: 3, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="absolute inset-0 rounded-full border-2 border-pink-500"
                      />
                    )}
                  </AnimatePresence>
                </div>
                <span>{likeCount}</span>
              </motion.button>

              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{comments.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={handleSave}
                whileTap={{ scale: 0.85 }}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                  isSaved
                    ? "border-pink-500/60 text-pink-400"
                    : "border-white/10 text-white hover:text-pink-400 hover:border-pink-500/50"
                }`}
              >
                <motion.svg
                  key={isSaved ? "s" : "u"}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  viewBox="0 0 24 24"
                  fill={isSaved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              </motion.button>

              <button
                onClick={() => setShowShare(true)}
                className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white hover:text-pink-400 hover:border-pink-500/50 transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Comment input */}
          <form onSubmit={handleComment} className="border-t border-white/5 p-3 flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={isAuthenticated ? "Add a comment..." : "Log in to comment"}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
              disabled={!isAuthenticated || post.disableComments}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
              disabled={!isAuthenticated || post.disableComments}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {showShare && (
          <ShareModal
            post={{
              postId,
              url: post.url,
              caption: post.caption,
              mediaUrls: post.mediaUrls,
              authorUsername: author?.username,
            }}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PostDetail;