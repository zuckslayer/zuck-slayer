import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs, startAfter } from "firebase/firestore";
import { Link } from "react-router-dom";
import Post from "../components/Post";

function SkeletonPost() {
  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-lg mb-6 animate-pulse break-inside-avoid">
      <div className="bg-gray-800 h-64 w-full rounded-xl mb-4"></div>
      <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-800 rounded w-1/3"></div>
    </div>
  );
}

const FILTERS = [
  { id: "latest", label: "Latest", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
  { id: "trending", label: "Trending", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
  { id: "following", label: "Following", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )},
];

function Feed() {
  const [posts, setPosts] = useState([]);
  const [lastPost, setLastPost] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("latest");

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
      const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    <div className="w-full">
      {/* 🔥 Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">The Chaos Feed</h2>
          <p className="text-sm text-gray-500 mt-1">Everything the algorithm didn't want you to see.</p>
        </div>

        <Link
          to="/upload"
          className="self-start md:self-auto bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold text-sm py-2.5 px-5 rounded-xl shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          New Post
        </Link>
      </div>

      {/* 🔥 Filter Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${
              activeFilter === filter.id
                ? "bg-gradient-to-r from-pink-500/20 to-blue-500/10 text-pink-400 border-pink-500/30"
                : "bg-white/[0.02] text-gray-400 border-white/5 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {/* 🔥 Posts Grid */}
      {posts.length === 0 && !loading ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">The feed is silent.</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Be the first to break the silence. Post a meme, start a rebellion.
          </p>
          <Link
            to="/upload"
            className="inline-block bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            Upload First Post
          </Link>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid">
              <Post postId={post.id} {...post} url={post.url || ""} />
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 mt-6">
          {[...Array(3)].map((_, i) => <SkeletonPost key={i} />)}
        </div>
      )}

      {!loading && hasMore && posts.length > 0 && (
        <div className="flex justify-center my-8">
          <button
            onClick={fetchPosts}
            className="bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            Load More
          </button>
        </div>
      )}

      {!hasMore && !loading && posts.length > 0 && (
        <p className="text-center text-gray-600 mt-10 font-mono text-sm">
          You've reached the end of the internet.
        </p>
      )}
    </div>
  );
}

export default Feed;