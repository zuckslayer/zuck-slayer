import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";

function Post({ postId, caption, url, userId }) {
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const currentUser = auth.currentUser;  // Get the current user
  const isDev = window.location.hostname === "localhost"; // Dev check for disabling button
  const isAuthenticated = currentUser !== null;  // Check if the user is authenticated

  useEffect(() => {
    const postRef = doc(db, "posts", postId);
    const commentsRef = collection(db, "posts", postId, "comments");

    const unsubscribeLikes = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLikes(data.likes || []);
        setLikeCount(data.likeCount || 0); // Use likeCount from the database
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

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("You must be logged in to like this post.");
      return;  // Prevent the like action if the user is not authenticated
    }

    if (!currentUser) return;
    const postRef = doc(db, "posts", postId);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post doesn't exist";

        const postData = postDoc.data();
        const currentLikes = postData.likes || [];
        const isLiked = currentLikes.includes(currentUser.uid);

        const newLikes = isLiked
          ? currentLikes.filter((id) => id !== currentUser.uid)
          : [...currentLikes, currentUser.uid];

        transaction.update(postRef, {
          likes: newLikes,
          likeCount: newLikes.length, // Keep this updated
        });
      });
    } catch (err) {
      console.error("Like transaction failed", err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !isAuthenticated) {
      alert("You must be logged in to comment.");
      return;  // Prevent submitting the comment if the user is not authenticated
    }

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
    <div className="bg-gray-800 p-4 rounded-2xl shadow mb-6 text-white">
      {url.includes("video") ? (
        <video src={url} controls className="w-full rounded-xl" />
      ) : (
        <img src={url} alt="Post" className="w-full rounded-xl" />
      )}

      <p className="mt-3 text-pink-400 font-semibold">{caption}</p>

      {/* Like Button */}
      <div className="flex items-center space-x-4 mt-3">
        <button
          onClick={handleLike}
          disabled={!isAuthenticated}  // Disable button if user is not authenticated
          className={`text-sm px-3 py-1 rounded-full transition ${
            !isAuthenticated
              ? "bg-pink-600 opacity-50 cursor-not-allowed"
              : "bg-pink-600 hover:bg-pink-700"
          }`}
        >
          ❤️ {likeCount} {likeCount === 1 ? "Like" : "Likes"}
        </button>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleComment} className="mt-4 flex gap-2">
        <input
          type="text"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder="Write a comment..."
          className="flex-grow px-3 py-2 rounded text-black"
          disabled={!isAuthenticated}  // Disable input field if user is not authenticated
        />
        <button
          type="submit"
          className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded text-white font-semibold"
          disabled={!isAuthenticated}  // Disable button if user is not authenticated
        >
          Send
        </button>
      </form>

      {/* Comments List */}
      <div className="mt-4 space-y-2 text-sm text-gray-300">
        {comments.map((comment) => (
          <div key={comment.id} className="flex justify-between items-center">
            <p>
              <span className="font-semibold text-pink-400">
                {comment.username || "Anonymous"}:
              </span>{" "}
              {comment.text}
            </p>
            {currentUser?.uid === comment.userId && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-red-500 text-xs ml-2"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Post;





