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
import { decryptMessage } from "../utils/crypto";

// Same filters map as Upload.jsx — needs to match
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

function Post({ postId, caption, url, userId, filter, mediaUrls, mediaType, textOverlays, location, taggedUsers, hideLikes, disableComments }) {
  const { currentUser, encryptionKey } = useAuth();
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const [authorUsername, setAuthorUsername] = useState("");

  // Encryption state
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedCaption, setDecryptedCaption] = useState("");
  const [decryptedLocation, setDecryptedLocation] = useState("");
  const [showComments, setShowComments] = useState(false);

  // Carousel state
  const [currentMedia, setCurrentMedia] = useState(0);
  const allMedia = mediaUrls && mediaUrls.length > 0 ? mediaUrls : (url ? [url] : []);
  const mediaFilter = FILTER_CSS[filter] || "none";
  const isCarousel = allMedia.length > 1;

  const isAuthenticated = currentUser !== null;
  const hasValidMedia = allMedia.length > 0;

  // Fetch author username
  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "users", userId)).then((snap) => {
      if (snap.exists()) setAuthorUsername(snap.data().username || "user");
    });
  }, [userId]);

  // Realtime likes + comments
  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const commentsRef = collection(db, "posts", postId, "comments");

    const unsubLikes = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const safeLikes = Array.isArray(data.likes) ? data.likes : [];
        setLikes(safeLikes);
        setLikeCount(data.likeCount || safeLikes.length);
      }
    });

    const unsubComments = onSnapshot(commentsRef, async (snapshot) => {
      const commentDocs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const commentData = docSnap.data();
          const userDoc = await getDoc(doc(db, "users", commentData.userId));
          return {
            id: docSnap.id,
            ...commentData,
            username: userDoc.exists() ? userDoc.data().username : "Anonymous",
          };
        })
      );
      const sorted = commentDocs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setComments(sorted);
    });

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [postId]);

  const handleDecrypt = async () => {
    if (!encryptionKey) return;
    if (caption) {
      const decrypted = await decryptMessage(caption, encryptionKey);
      setDecryptedCaption(decrypted);
    }
    if (location) {
      const decLoc = await decryptMessage(location, encryptionKey);
      setDecryptedLocation(decLoc);
    }
    setIsDecrypted(true);
  };

  const handleLike = async () => {
    if (!isAuthenticated) return alert("You must be logged in to like this post.");
    const postRef = doc(db, "posts", postId);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post doesn't exist";

        const postData = postDoc.data();
        const currentLikes = Array.isArray(postData.likes) ? postData.likes : [];
        const isLiked = currentLikes.includes(currentUser.uid);

        const newLikes = isLiked
          ? currentLikes.filter((id) => id !== currentUser.uid)
          : [...currentLikes, currentUser.uid];

        transaction.update(postRef, {
          likes: newLikes,
          likeCount: newLikes.length,
        });
      });
    } catch (err) {
      console.error("Like transaction failed", err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (disableComments) return;
    if (!commentInput.trim() || !isAuthenticated) return alert("You must be logged in to comment.");

    const commentsRef = collection(db, "posts", postId, "comments");
    await addDoc(commentsRef, {
      text: commentInput,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    setCommentInput("");
  };

  const handleDeleteComment = async (commentId) => {
    const commentRef = doc(db, "posts", postId, "comments", commentId);
    await deleteDoc(commentRef);
  };

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden w-full break-inside-avoid mb-6 hover:border-white/10 transition-all">

      {/* ═══ Header: Author ═══ */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
          <span className="text-xs font-black text-white">
            {authorUsername.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">@{authorUsername || "user"}</p>
          {isDecrypted && decryptedLocation && (
            <p className="text-[10px] text-gray-500 font-mono truncate">📍 {decryptedLocation}</p>
          )}
        </div>
      </div>

      {/* ═══ Media with Filter + Text Overlays ═══ */}
      {hasValidMedia ? (
        <div className="relative bg-black">
          <div className="aspect-square flex items-center justify-center relative overflow-hidden">
            {(() => {
              const currentUrl = allMedia[currentMedia];
              const isVideo = currentUrl.includes(".mp4") || currentUrl.includes("video") || mediaType === "video";
              return isVideo ? (
                <video
                  src={currentUrl}
                  controls
                  className="w-full h-full object-contain"
                  style={{ filter: mediaFilter }}
                />
              ) : (
                <img
                  src={currentUrl}
                  alt="Post"
                  className="w-full h-full object-contain"
                  style={{ filter: mediaFilter }}
                />
              );
            })()}

            {/* Text Overlays */}
            {textOverlays && textOverlays.map((t, i) => (
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

            {/* Carousel Arrows */}
            {isCarousel && (
              <>
                <button
                  onClick={() => setCurrentMedia((p) => (p - 1 + allMedia.length) % allMedia.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-black/80 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button
                  onClick={() => setCurrentMedia((p) => (p + 1) % allMedia.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-black/80 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allMedia.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentMedia ? "bg-white w-4" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] aspect-square flex items-center justify-center">
          <p className="text-gray-600 text-xs font-mono">NO MEDIA</p>
        </div>
      )}

      {/* ═══ Action Bar ═══ */}
      <div className="flex items-center gap-1 px-3 py-3">
        <button
          onClick={handleLike}
          disabled={!isAuthenticated}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            !isAuthenticated
              ? "text-gray-600 cursor-not-allowed"
              : likes.includes(currentUser?.uid)
              ? "text-pink-500"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill={likes.includes(currentUser?.uid) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!hideLikes && <span>{likeCount}</span>}
        </button>

        <button
          onClick={() => !disableComments && setShowComments(!showComments)}
          disabled={disableComments}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            disableComments ? "text-gray-700 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{comments.length}</span>
        </button>

        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all ml-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ═══ Caption & Metadata ═══ */}
      <div className="px-4 pb-4 space-y-2">
        {/* Caption */}
        <div className="min-h-[24px]">
          {isDecrypted ? (
            <p className="text-sm text-gray-200 leading-relaxed">
              <span className="font-bold text-white mr-2">@{authorUsername}</span>
              {decryptedCaption || <span className="text-gray-500 italic">No caption</span>}
            </p>
          ) : (
            <button
              onClick={handleDecrypt}
              className="flex items-center gap-2 bg-white/[0.03] border border-white/10 hover:border-pink-500/50 px-3 py-1.5 rounded-full text-xs text-pink-400 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tap to decrypt caption
            </button>
          )}
        </div>

        {/* Tagged Users */}
        {taggedUsers && taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {taggedUsers.map((u, i) => (
              <span key={i} className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                @{u}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Comments ═══ */}
      {showComments && !disableComments && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <form onSubmit={handleComment} className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              className="flex-grow px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
              disabled={!isAuthenticated}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 px-4 py-2 rounded-lg text-white text-sm font-bold transition-all"
              disabled={!isAuthenticated}
            >
              Send
            </button>
          </form>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4 font-mono">No comments yet. Break the silence.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="flex justify-between items-start text-xs gap-2">
                <p className="flex-1 text-gray-300">
                  <span className="font-bold text-pink-400 mr-1.5">@{comment.username || "anon"}</span>
                  {comment.text}
                </p>
                {currentUser?.uid === comment.userId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500 hover:text-red-400 shrink-0 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Post;