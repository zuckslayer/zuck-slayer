import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

function FollowList() {
  const { username } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Determine which list to show from URL
  const mode = location.pathname.endsWith("/followers") ? "followers" : "following";
  const tabTitle = mode === "followers" ? "Followers" : "Following";

  const [profileUser, setProfileUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followingIds, setFollowingIds] = useState([]); // who I follow (to show "Follow"/"Following" buttons)

  // Fetch profile user + their list
  useEffect(() => {
    if (!username || !currentUser) return;

    const load = async () => {
      try {
        // 1. Find the profile owner
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("This user doesn't exist.");
          setLoading(false);
          return;
        }

        const profileDoc = snap.docs[0];
        const profileData = { id: profileDoc.id, ...profileDoc.data() };
        setProfileUser(profileData);

        // 2. Get the IDs from the requested array
        const ids =
          mode === "followers"
            ? profileData.followers || []
            : profileData.following || [];

        if (ids.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        // 3. Fetch each user's profile
        const userDocs = await Promise.all(
          ids.map(async (uid) => {
            try {
              const userSnap = await getDoc(doc(db, "users", uid));
              return userSnap.exists() ? { id: uid, ...userSnap.data() } : null;
            } catch {
              return null;
            }
          })
        );
        setUsers(userDocs.filter(Boolean));

        // 4. Fetch MY following list (so buttons render correctly)
        const meSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (meSnap.exists()) {
          setFollowingIds(meSnap.data().following || []);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load follow list:", err);
        setError("Failed to load. Try again.");
        setLoading(false);
      }
    };

    load();
  }, [username, mode, currentUser]);

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[50vh] text-pink-500 font-mono animate-pulse">
          Loading {tabTitle.toLowerCase()}...
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h2 className="text-2xl font-bold text-white mb-3">{error || "User not found."}</h2>
        <button
          onClick={() => navigate(-1)}
          className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-white">
      {/* Back + header */}
      <button
        onClick={() => navigate(`/u/${profileUser.username}`)}
        className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-pink-400 transition tracking-widest uppercase mb-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to @{profileUser.username}
      </button>

      <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-6">
        {tabTitle}
        <span className="text-gray-500 text-lg font-mono font-normal ml-3">
          {users.length}
        </span>
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          to={`/u/${profileUser.username}/followers`}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            mode === "followers"
              ? "bg-gradient-to-r from-pink-500/20 to-purple-500/10 text-pink-400 border-pink-500/30"
              : "bg-white/[0.02] text-gray-400 border-white/5 hover:bg-white/[0.05]"
          }`}
        >
          Followers
        </Link>
        <Link
          to={`/u/${profileUser.username}/following`}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            mode === "following"
              ? "bg-gradient-to-r from-pink-500/20 to-purple-500/10 text-pink-400 border-pink-500/30"
              : "bg-white/[0.02] text-gray-400 border-white/5 hover:bg-white/[0.05]"
          }`}
        >
          Following
        </Link>
      </div>

      {/* Empty state */}
      {users.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {mode === "followers"
              ? `@${profileUser.username} has no followers yet`
              : `@${profileUser.username} isn't following anyone`}
          </h3>
          <p className="text-gray-500 text-sm">
            {mode === "followers"
              ? "Be the first to follow."
              : "They keep to themselves."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {users.map((u) => {
            const iFollowThem = followingIds.includes(u.id);
            const isMe = u.id === currentUser.uid;

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-pink-500/30 hover:bg-white/[0.04] transition-all group"
              >
                <Link
                  to={`/u/${u.username}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shrink-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-white">
                        {getInitials(u.username)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate group-hover:text-pink-400 transition-colors">
                      @{u.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {u.bio || "On Zuck Slayer"}
                    </p>
                  </div>
                </Link>

                {/* Action button — hidden for yourself */}
                {!isMe && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      const myRef = doc(db, "users", currentUser.uid);
                      const theirRef = doc(db, "users", u.id);

                      try {
                        // We'll do a lightweight toggle here — full following logic lives elsewhere
                        const meSnap = await getDoc(myRef);
                        const meFollowing = meSnap.exists() ? meSnap.data().following || [] : [];
                        const currentlyFollowing = meFollowing.includes(u.id);

                        if (currentlyFollowing) {
                          await updateDoc(myRef, { following: arrayRemove(u.id) });
                          await updateDoc(theirRef, { followers: arrayRemove(currentUser.uid) });
                          setFollowingIds((prev) => prev.filter((id) => id !== u.id));
                        } else {
                          await updateDoc(myRef, { following: arrayUnion(u.id) });
                          await updateDoc(theirRef, { followers: arrayUnion(currentUser.uid) });
                          setFollowingIds((prev) => [...prev, u.id]);
                        }
                      } catch (err) {
                        console.error("Follow toggle failed:", err);
                      }
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      iFollowThem
                        ? "bg-white/[0.03] border-white/10 text-white hover:border-red-500/40 hover:text-red-400"
                        : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border-transparent"
                    }`}
                  >
                    {iFollowThem ? "Following" : "Follow"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FollowList;