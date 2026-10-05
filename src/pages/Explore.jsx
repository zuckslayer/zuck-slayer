import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Explore() {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // 🔥 Trending posts (by likeCount, fallback to recent)
        const postsRef = collection(db, "posts");
        const postsQ = query(
          postsRef,
          orderBy("createdAt", "desc"),
          limit(30)
        );
        const postsSnap = await getDocs(postsQ);
        const postsData = postsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
          .slice(0, 24);
        setPosts(postsData);

        // 🔥 Suggested users (exclude yourself + already-following)
        const usersRef = collection(db, "users");
        const usersQ = query(usersRef, limit(50));
        const usersSnap = await getDocs(usersQ);
        const following = userProfile?.following || [];
        const suggestions = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== currentUser?.uid)
          .filter((u) => !following.includes(u.id))
          .sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
          .slice(0, 6);
        setSuggestedUsers(suggestions);
      } catch (err) {
        console.warn("Explore load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser, userProfile]);

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          Explore
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Discover what's happening right now.
        </p>
      </div>

      {/* Suggested Users */}
      {!loading && suggestedUsers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Suggested for you
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {suggestedUsers.map((u) => (
              <Link
                key={u.id}
                to={`/u/${u.username}`}
                className="shrink-0 w-36 p-4 rounded-2xl bg-[#111111] border border-white/5 hover:border-pink-500/30 transition-all text-center group"
              >
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-black text-white">
                      {getInitials(u.username)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-white truncate group-hover:text-pink-400 transition-colors">
                  @{u.username}
                </p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                  {u.followers?.length || 0} followers
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending Posts Grid */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
          Trending now
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
            <p className="text-gray-500 text-sm">Nothing to explore yet. Be the first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/reels"
                className="relative group aspect-square bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all"
                >
                {p.url ? (
                  p.url.includes(".mp4") || p.url.includes("video") ? (
                    <video src={p.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">
                    NO MEDIA
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <p className="text-white text-xs line-clamp-2">{p.caption || "No caption"}</p>
                </div>
                {/* Like badge */}
                {p.likeCount > 0 && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur border border-white/15 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg viewBox="0 0 24 24" fill="#ec4899" className="w-3 h-3">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-[10px] text-white font-bold">{p.likeCount}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Explore;