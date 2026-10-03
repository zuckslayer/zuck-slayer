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
    <div className="bg-gray-800 p-4 rounded-2xl shadow mb-6 animate-pulse break-inside-avoid">
      <div className="bg-gray-700 h-64 w-full rounded-xl mb-4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
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

      const mergedPosts = [...posts, ...newPosts];
      const uniquePosts = [...new Map(mergedPosts.map((post) => [post.id, post])).values()];

      setPosts(uniquePosts);
      setLastPost(snapshot.docs[snapshot.docs.length - 1]);

      if (snapshot.docs.length < 5) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto"> {/* 🔥 Changed to max-w-7xl */}
      <h2 className="text-3xl font-bold mb-6 text-white tracking-tight">🔥 The Chaos Feed</h2>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="break-inside-avoid">
            <Post 
              postId={post.id} 
              {...post} 
              url={post.url || ""} 
            />
          </div>
        ))}
      </div>

      {loading && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 mt-6">
          {[...Array(3)].map((_, i) => <SkeletonPost key={i} />)}
        </div>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center my-8">
          <button onClick={fetchPosts} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition">
            Load More
          </button>
        </div>
      )}

      {!hasMore && !loading && (
        <p className="text-center text-gray-500 mt-10 font-mono">You've reached the end 💤</p>
      )}
    </div>
  );
}

export default Feed;