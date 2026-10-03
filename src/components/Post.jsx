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

function Post({ postId, caption, url, userId }) {
  const { currentUser, encryptionKey } = useAuth();
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedCaption, setDecryptedCaption] = useState("");
  const [showComments, setShowComments] = useState(false);

  const isAuthenticated = currentUser !== null;
  
  // 🔥 BULLETPROOF CHECK: Only true if 'url' is a non-empty string
  const hasValidUrl = typeof url === "string" && url.trim().length > 0;

  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const commentsRef = collection(db, "posts", postId, "comments");

    const unsubscribeLikes = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const safeLikes = Array.isArray(data.likes) ? data.likes : [];
        setLikes(safeLikes);
        setLikeCount(data.likeCount || safeLikes.length);
      }
    });

    const unsubscribeComments = onSnapshot(commentsRef, async (snapshot) => {
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

      const sorted = commentDocs.sort(
        (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
      );
      setComments(sorted);
    });

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [postId]);

  const handleDecrypt = async () => {
    if (!encryptionKey || !caption) return;
    const decrypted = await decryptMessage(caption, encryptionKey);
    setDecryptedCaption(decrypted);
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
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-lg hover:border-gray-700 transition duration-300 w-full break-inside-avoid mb-6">
      
      <div className="relative overflow-hidden rounded-xl bg-gray-800 min-h-[200px] flex items-center justify-center">
        {hasValidUrl ? (
          url.includes("video") ? (
            <video src={url} controls className="w-full h-auto object-cover" />
          ) : (
            <img src={url} alt="Post" className="w-full h-auto object-cover" />
          )
        ) : (
          <div className="text-gray-500 flex flex-col items-center gap-2 p-8">
            <span className="text-3xl">🖼️</span>
            <span className="text-xs uppercase tracking-widest">No Media Attached</span>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-[40px] flex items-center">
        {isDecrypted ? (
          <p className="text-gray-200 text-sm">{decryptedCaption}</p>
        ) : (
          <button
            onClick={handleDecrypt}
            className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full text-xs text-pink-400 hover:border-pink-500 transition"
          >
            🔒 Tap to Decrypt Caption
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 border-t border-gray-800 pt-3">
        <button
          onClick={handleLike}
          disabled={!isAuthenticated}
          className={`text-sm px-3 py-1 rounded-full transition flex items-center gap-1 ${
            !isAuthenticated
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-gray-800 hover:bg-pink-600 text-white"
          }`}
        >
          ❤️ {likeCount}
        </button>
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className="text-sm px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
        >
          💬 {comments.length}
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <form onSubmit={handleComment} className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              className="flex-grow px-3 py-2 text-sm rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-pink-500"
              disabled={!isAuthenticated}
            />
            <button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700 px-3 py-2 rounded-lg text-white text-sm font-semibold transition"
              disabled={!isAuthenticated}
            >
              Send
            </button>
          </form>

          <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {comments.map((comment) => (
              <div key={comment.id} className="flex justify-between items-start text-xs text-gray-300">
                <p className="flex-1">
                  <span className="font-semibold text-pink-400 mr-1">
                    {comment.username || "Anonymous"}:
                  </span>
                  {comment.text}
                </p>
                {currentUser?.uid === comment.userId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-red-500 hover:text-red-400 ml-2"
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