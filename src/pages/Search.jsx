import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Search() {
  const { currentUser } = useAuth();
  const [term, setTerm] = useState("");
  const [tab, setTab] = useState("users"); // "users" | "posts"
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Debounced search
  useEffect(() => {
    const trimmed = term.trim().toLowerCase();
    if (trimmed.length === 0) {
      setUserResults([]);
      setPostResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        // 🔥 USERS — prefix search on username
        const usersRef = collection(db, "users");
        const usersQ = query(
          usersRef,
          where("username", ">=", trimmed),
          where("username", "<=", trimmed + "\uf8ff"),
          limit(15)
        );
        const usersSnap = await getDocs(usersQ);
        const users = usersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== currentUser?.uid);
        setUserResults(users);

        // 🔥 POSTS — prefix search on caption
        const postsRef = collection(db, "posts");
        const postsQ = query(
          postsRef,
          where("caption", ">=", trimmed),
          where("caption", "<=", trimmed + "\uf8ff"),
          limit(15)
        );
        const postsSnap = await getDocs(postsQ);
        const posts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPostResults(posts);
      } catch (err) {
        console.warn("Search failed:", err);
        // Fail silently — index might be needed, or no results
        setError("Search temporarily unavailable. Try again.");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [term, currentUser]);

  const hasResults = userResults.length > 0 || postResults.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          Search
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Find people, posts, and content.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <input
          type="text"
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search @username or caption..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#111111] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)] transition-all"
        />
        {term && (
          <button
            onClick={() => setTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      {term.trim().length > 0 && (
        <div className="flex gap-2 mb-6">
          {[
            { id: "users", label: "People", count: userResults.length },
            { id: "posts", label: "Posts", count: postResults.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                tab === t.id
                  ? "bg-gradient-to-r from-pink-500/20 to-blue-500/10 text-pink-400 border-pink-500/30"
                  : "bg-white/[0.02] text-gray-400 border-white/5 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md font-mono">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {term.trim().length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Start typing</h3>
          <p className="text-gray-500 text-sm">
            Search for people by @username or posts by caption.
          </p>
        </div>
      ) : searching ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !hasResults ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <h3 className="text-xl font-bold text-white mb-2">No results</h3>
          <p className="text-gray-500 text-sm">
            Nothing found for "{term}". Try a different search.
          </p>
        </div>
      ) : (
        <div>
          {/* Users Tab */}
          {tab === "users" && (
            <div className="space-y-1">
              {userResults.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8 font-mono">
                  No users found
                </p>
              ) : (
                userResults.map((u) => (
                  <Link
                    key={u.id}
                    to={`/u/${u.username}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-pink-500/30 hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-white">
                          {u.username?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">@{u.username}</p>
                      <p className="text-xs text-gray-500 truncate">{u.bio || "On Zuck Slayer"}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all shrink-0">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Posts Tab */}
          {tab === "posts" && (
            <div>
              {postResults.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8 font-mono">
                  No posts found
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {postResults.map((p) => (
                    <Link
                      key={p.id}
                      to="/feed"
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
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3">
                        <p className="text-white text-xs text-center line-clamp-3">
                          {p.caption || "No caption"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Search;