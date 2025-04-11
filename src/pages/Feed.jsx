import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import Post from "../components/Post";

function SkeletonPost() {
  return (
    <div className="bg-gray-800 p-4 rounded-2xl shadow mb-6 animate-pulse">
      <div className="bg-gray-700 h-64 w-full rounded-xl mb-4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/4 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-1/3 mb-2"></div>
    </div>
  );
}

function Feed() {
  const [posts, setPosts] = useState([]);
  const [lastPost, setLastPost] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);

    let q;
    const postsRef = collection(db, "posts");

    if (lastPost) {
      q = query(postsRef, orderBy("createdAt", "desc"), startAfter(lastPost), limit(5));
    } else {
      q = query(postsRef, orderBy("createdAt", "desc"), limit(5));
    }

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔥 Filter duplicates using Map (post.id as key)
      const mergedPosts = [...posts, ...newPosts];
      const uniquePosts = [...new Map(mergedPosts.map((post) => [post.id, post])).values()];

      setPosts(uniquePosts);
      setLastPost(snapshot.docs[snapshot.docs.length - 1]);

      if (snapshot.docs.length < 5) {
        setHasMore(false);
      }
    } else {
      setHasMore(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPosts(); // Load initial posts
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-white">🔥 Global Feed</h2>

      {posts.map((post) => (
        <Post key={post.id} postId={post.id} {...post} />
      ))}

      {loading && (
        <div>
          {[...Array(3)].map((_, i) => (
            <SkeletonPost key={i} />
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center my-6">
          <button
            onClick={fetchPosts}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full shadow"
          >
            Load More
          </button>
        </div>
      )}

      {!hasMore && !loading && (
        <p className="text-center text-gray-400 mt-6">You've reached the end 💤</p>
      )}
    </div>
  );
}

export default Feed;


