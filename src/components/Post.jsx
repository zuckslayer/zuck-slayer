import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
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

function Post({
  postId,
  caption,
  url,
  userId,
  filter,
  mediaUrls,
  mediaType,
  textOverlays,
  location,
  taggedUsers,
  hideLikes,
  disableComments,
  postType,
}) {
  const { currentUser } = useAuth();
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const [authorUsername, setAuthorUsername] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(0);
  const [burst, setBurst] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const allMedia = mediaUrls && mediaUrls.length > 0 ? mediaUrls : url ? [url] : [];
  const mediaFilter = FILTER_CSS[filter] || "none";
  const isCarousel = allMedia.length > 1;
  const isAuthenticated = currentUser !== null;
  const hasValidMedia = allMedia.length > 0;
  const isLiked = currentUser && likes.includes(currentUser.uid);
  const isLongCaption = caption && caption.length > 120;

  // Fetch author info
  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId)).then((snap) => {
      if (snap.exists()) {
        setAuthorUsername(snap.data().username || "user");
        setAuthorPhoto(snap.data().photoURL || "");
      }
    });
  }, [userId]);

  // Realtime likes + comments
  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const commentsRef = collection(db, "posts", postId, "comments");

    const unsubLikes = onSnapshot(postRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const safeLikes = Array.isArray(data.likes) ? data.likes : [];
        setLikes(safeLikes);
        setLikeCount(data.likeCount || safeLikes.length);
      }
    });

    const unsubComments = onSnapshot(commentsRef, async (snapshot) => {
      const docs = await Promise.all(
        snapshot.docs.map(async (d) => {
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

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [postId]);

  const doLike = async () => {
    if (!isAuthenticated) return;
    const postRef = doc(db, "posts", postId);

    if (!isLiked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
    }

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post missing";
        const postData = postDoc.data();
        const currentLikes = Array.isArray(postData.likes) ? postData.likes : [];
        const alreadyLiked = currentLikes.includes(currentUser.uid);
        const newLikes = alreadyLiked
          ? currentLikes.filter((id) => id !== currentUser.uid)
          : [...currentLikes, currentUser.uid];

        transaction.update(postRef, {
          likes: newLikes,
          likeCount: newLikes.length,
        });
      });
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // 🔥 Double tap detected
      if (!isLiked && isAuthenticated) {
        doLike();
      }
      setHeartPop(true);
      setTimeout(() => setHeartPop(false), 1000);
    }
    setLastTap(now);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (disableComments) return;
    if (!commentInput.trim() || !isAuthenticated) return;
    const commentsRef = collection(db, "posts", postId, "comments");
    await addDoc(commentsRef, {
      text: commentInput,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    setCommentInput("");
  };

  const handleDeleteComment = async (commentId) => {
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
  };

  return (
    <article className="w-full max-w-2xl mx-auto mb-12 group">
      {/* ═══════════════════════════════════════ */}
      {/* MEDIA STAGE                               */}
      {/* ═══════════════════════════════════════ */}
      <div className="relative bg-black rounded-3xl overflow-hidden border border-white/5">
        {/* Media with 4:5 aspect */}
        {hasValidMedia ? (
          <div
            className="relative aspect-[4/5] flex items-center justify-center overflow-hidden cursor-pointer select-none"
            onClick={handleMediaTap}
          >
            {(() => {
              const currentUrl = allMedia[currentMedia];
              const isVideo =
                currentUrl.includes(".mp4") ||
                currentUrl.includes("video") ||
                mediaType === "video";
              return isVideo ? (
                <video
                  src={currentUrl}
                  controls
                  className="w-full h-full object-cover"
                  style={{ filter: mediaFilter }}
                />
              ) : (
                <img
                  src={currentUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: mediaFilter }}
                  draggable={false}
                />
              );
            })()}

            {/* Text overlays */}
            {textOverlays?.map((t, i) => (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  color: t.color,
                  fontSize:
                    t.size === "small"
                      ? "1.2rem"
                      : t.size === "large"
                      ? "2.5rem"
                      : "1.8rem",
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

            {/* 🔥 Corner viewfinder accents */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-pink-500/70 rounded-tl-md pointer-events-none" />
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-pink-500/70 rounded-tr-md pointer-events-none" />

            {/* 🔥 Double-tap heart pop */}
            <AnimatePresence>
              {heartPop && (
                <motion.div
                  key="heart-pop"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -15, opacity: 0 }}
                    animate={{
                      scale: [0, 1.4, 1.2],
                      rotate: [-15, 0, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 1, times: [0, 0.3, 1] }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="url(#heart-gradient-post)"
                      className="w-40 h-40"
                      style={{
                        filter:
                          "drop-shadow(0 0 40px rgba(236,72,153,1)) drop-shadow(0 0 80px rgba(236,72,153,0.6))",
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="heart-gradient-post"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
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

            {/* ═══ Floating Author Pill (top-left) ═══ */}
            <Link
              to={`/u/${authorUsername}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-14 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 hover:border-pink-500/50 transition-all group/author"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                {authorPhoto ? (
                  <img src={authorPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-white">
                    {authorUsername.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-white group-hover/author:text-pink-300 transition-colors">
                @{authorUsername || "user"}
              </span>
            </Link>

            {/* ═══ Post Type Badge (top-right) ═══ */}
            {postType && postType !== "post" && (
              <div className="absolute top-4 right-14 z-20 px-2.5 py-1 rounded-full bg-pink-500/30 backdrop-blur-xl border border-pink-500/50">
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  {postType}
                </span>
              </div>
            )}

            {/* ═══ Carousel Navigation ═══ */}
            {isCarousel && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMedia((p) => (p - 1 + allMedia.length) % allMedia.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-lg border border-white/20 flex items-center justify-center hover:bg-black/80 hover:border-pink-500/50 transition-all z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMedia((p) => (p + 1) % allMedia.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-lg border border-white/20 flex items-center justify-center hover:bg-black/80 hover:border-pink-500/50 transition-all z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Dots indicator */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15">
                  {allMedia.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all ${
                        i === currentMedia
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 w-4 h-1.5"
                          : "bg-white/40 w-1.5 h-1.5"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* 🔥 Floating Action Bar (bottom) */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-2">
              {/* Left cluster: Like + Comment */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    doLike();
                  }}
                  disabled={!isAuthenticated}
                  whileTap={{ scale: 0.85 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors relative ${
                    !isAuthenticated
                      ? "text-gray-500 cursor-not-allowed"
                      : isLiked
                      ? "text-pink-400"
                      : "text-white hover:text-pink-400"
                  }`}
                >
                  <div className="relative">
                    <motion.svg
                      key={isLiked ? "liked" : "unliked"}
                      initial={isLiked ? { scale: 0.5 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      viewBox="0 0 24 24"
                      fill={isLiked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4"
                    >
                      <path
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
                          <motion.div
                            initial={{ scale: 0, opacity: 0.6 }}
                            animate={{ scale: 4, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.9, delay: 0.1 }}
                            className="absolute inset-0 rounded-full border border-pink-400"
                          />
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  {!hideLikes && <span>{likeCount}</span>}
                </motion.button>

                <div className="w-px h-4 bg-white/20" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disableComments) setShowComments(!showComments);
                  }}
                  disabled={disableComments}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    disableComments
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-white hover:text-pink-400"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{comments.length}</span>
                </button>
              </div>

              {/* Right cluster: Share */}
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white hover:text-pink-400 hover:border-pink-500/50 transition-all"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Location badge */}
            {location && (
              <div className="absolute top-14 left-14 z-20 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/15">
                <span className="text-[10px] font-mono text-white/90 flex items-center gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3 h-3"
                  >
                    <path
                      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {location}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[4/5] flex items-center justify-center bg-[#0a0a0a]">
            <p className="text-gray-600 text-xs font-mono tracking-widest">NO MEDIA</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* CAPTION PANEL                             */}
      {/* ═══════════════════════════════════════ */}
      {caption && (
        <div className="px-2 pt-4 pb-2">
          <p
            className={`text-sm text-gray-200 leading-relaxed ${
              !captionExpanded && isLongCaption ? "line-clamp-2" : ""
            }`}
          >
            <Link
              to={`/u/${authorUsername}`}
              className="font-bold text-white hover:text-pink-400 mr-2 transition-colors"
            >
              @{authorUsername}
            </Link>
            {caption}
          </p>
          {isLongCaption && (
            <button
              onClick={() => setCaptionExpanded(!captionExpanded)}
              className="text-xs font-bold text-pink-400 hover:text-pink-300 mt-1 transition-colors"
            >
              {captionExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Tagged users */}
      {taggedUsers && taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2 pt-2">
          {taggedUsers.map((u, i) => (
            <Link
              key={i}
              to={`/u/${u}`}
              className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-colors"
            >
              @{u}
            </Link>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* COMMENTS PANEL                            */}
      {/* ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showComments && !disableComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-2 pt-4">
              <form onSubmit={handleComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-grow px-4 py-2.5 text-sm rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                  disabled={!isAuthenticated}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                  disabled={!isAuthenticated}
                >
                  Send
                </button>
              </form>

              <div className="space-y-3 max-h-72 overflow-y-auto pb-4">
                {comments.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-4 font-mono">
                    No comments yet. Break the silence.
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex justify-between items-start text-xs gap-3 group/comment">
                    <div className="flex-1 flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-white">
                          {c.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">
                        <Link
                          to={`/u/${c.username}`}
                          className="font-bold text-pink-400 mr-1.5 hover:text-pink-300 transition-colors"
                        >
                          @{c.username}
                        </Link>
                        {c.text}
                      </p>
                    </div>
                    {currentUser?.uid === c.userId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-red-500 hover:text-red-400 shrink-0 font-bold opacity-0 group-hover/comment:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export default Post;