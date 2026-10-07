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
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createNotification } from "../utils/notifications";
import UserActionsMenu from "../components/UserActionsMenu";

function UserProfile() {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");
  const [burst, setBurst] = useState(false);
  const [myUsername, setMyUsername] = useState("");

  // Fetch current user's username
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid)).then((snap) => {
      if (snap.exists()) setMyUsername(snap.data().username || "user");
    });
  }, [currentUser]);

  // Load profile by username
  useEffect(() => {
    if (!username) return;

    const loadProfile = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("This user doesn't exist.");
          setLoading(false);
          return;
        }

        const userDoc = snap.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() };
        setProfileUser(userData);

        const currentUserSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (currentUserSnap.exists()) {
          const followingList = currentUserSnap.data().following || [];
          setFollowing(followingList.includes(userData.id));
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile.");
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser]);

  // Real-time posts
  useEffect(() => {
    if (!profileUser) return;

    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("userId", "==", profileUser.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(data);
    });

    return () => unsubscribe();
  }, [profileUser]);

  // Follow / Unfollow
  const handleFollow = async () => {
    if (!currentUser || !profileUser || followLoading) return;
    setFollowLoading(true);

    const wasFollowing = following;

    if (!wasFollowing) {
      setBurst(true);
      setTimeout(() => setBurst(false), 1800);
    }

    setFollowing(!wasFollowing);

    try {
      const myRef = doc(db, "users", currentUser.uid);
      const theirRef = doc(db, "users", profileUser.id);

      if (wasFollowing) {
        await updateDoc(myRef, { following: arrayRemove(profileUser.id) });
        await updateDoc(theirRef, { followers: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(myRef, { following: arrayUnion(profileUser.id) });
        await updateDoc(theirRef, { followers: arrayUnion(currentUser.uid) });

        createNotification({
          recipientId: profileUser.id,
          actorId: currentUser.uid,
          actorUsername: myUsername,
          actorPhoto: "",
          type: "follow",
        });
      }
    } catch (err) {
      console.error("Follow action failed:", err);
      setFollowing(wasFollowing);
      setError("Follow failed. Try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  // Message — open or create chat
  const handleMessage = async () => {
    if (!currentUser || !profileUser) return;
    try {
      const convRef = collection(db, "conversations");
      const q = query(convRef, where("participants", "array-contains", currentUser.uid));
      const snap = await getDocs(q);

      const existing = snap.docs.find((d) => {
        const parts = d.data().participants || [];
        return parts.includes(profileUser.id);
      });

      if (existing) {
        navigate(`/chats/${existing.id}`);
      } else {
        const newDoc = await addDoc(convRef, {
          participants: [currentUser.uid, profileUser.id],
          participantProfiles: {
            [currentUser.uid]: { username: myUsername || "user", photoURL: "" },
            [profileUser.id]: {
              username: profileUser.username,
              photoURL: profileUser.photoURL || "",
            },
          },
          lastMessage: "",
          lastMessageSenderId: "",
          lastMessageAt: serverTimestamp(),
          lastMessageAtMs: Date.now(),
          createdAt: serverTimestamp(),
        });
        navigate(`/chats/${newDoc.id}`);
      }
    } catch (err) {
      console.error("Failed to open chat:", err);
    }
  };

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-pink-500 font-mono animate-pulse">
        Loading profile...
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-red-400">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
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

  const isOwnProfile = currentUser?.uid === profileUser.id;
  const followersCount = profileUser.followers?.length || 0;
  const followingCount = profileUser.following?.length || 0;
  const canSeePosts = !profileUser.isPrivate || isOwnProfile || following;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white relative">
      {/* Follow burst overlay */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key="follow-burst"
            className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center"
            style={{
              transform: "translateZ(0)",
              willChange: "transform, opacity",
              contain: "layout paint style",
              isolation: "isolate",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 240,
                height: 240,
                background: "radial-gradient(circle, rgba(236,72,153,0.8) 0%, rgba(168,85,247,0.4) 40%, transparent 70%)",
                transform: "translateZ(0)",
                willChange: "transform, opacity",
              }}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 12, opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
            <motion.div
              className="absolute rounded-full border-2 border-pink-400/70"
              style={{ width: 220, height: 220, transform: "translateZ(0)", willChange: "transform, opacity" }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 7, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.08 }}
            />
            {[...Array(8)].map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const distance = 150 + (i % 3) * 50;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ transform: "translateZ(0)", willChange: "transform, opacity" }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{ x: [0, x * 0.6, x], y: [0, y * 0.6, y], scale: [0, 1, 0.5], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: i * 0.02 }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#ec4899">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </motion.div>
              );
            })}
            <motion.div
              className="absolute"
              style={{ transform: "translateZ(0)", willChange: "transform, opacity" }}
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: [0.5, 1.15, 1], opacity: [0, 1, 0], y: [10, 0, -20] }}
              transition={{ duration: 1.3, times: [0, 0.3, 1], ease: "easeOut" }}
            >
              <p className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500">
                FOLLOWED
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-[#111111] border border-white/5 rounded-3xl overflow-hidden mb-10"
      >
        <div className="h-40 w-full bg-gradient-to-r from-pink-600/40 via-purple-600/30 to-purple-700/40 relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="px-6 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-6 gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl border-4 border-[#111111] bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)]">
                {profileUser.photoURL ? (
                  <img src={profileUser.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-white">
                    {getInitials(profileUser.username)}
                  </span>
                )}
              </div>
              {profileUser.isPrivate && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-[#111111] border-2 border-[#111111] flex items-center justify-center">
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {isOwnProfile ? (
                <>
                  <Link
                    to="/edit-profile"
                    className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] text-sm font-bold transition-all"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] flex items-center justify-center transition-all"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-400">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <motion.button
                    onClick={handleFollow}
                    disabled={followLoading}
                    whileTap={{ scale: 0.92 }}
                    className={`relative px-6 py-2.5 rounded-xl font-bold text-sm transition-all overflow-hidden min-w-[110px] ${
                      following
                        ? "bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-white hover:text-red-400"
                        : "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)]"
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <AnimatePresence mode="wait">
                        {following ? (
                          <motion.span
                            key="following"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="flex items-center gap-2"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Following
                          </motion.span>
                        ) : (
                          <motion.span key="follow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                            Follow
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </motion.button>

                  <button
                    onClick={handleMessage}
                    className="px-6 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] text-sm font-bold transition-all"
                  >
                    Message
                  </button>

                  {/* 🔥 Menu */}
                  <UserActionsMenu
                    targetUserId={profileUser.id}
                    targetUsername={profileUser.username}
                    contentType="user"
                    contentId={profileUser.id}
                  />
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
              @{profileUser.username}
              {profileUser.isPrivate && (
                <span className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-1 rounded-md uppercase tracking-widest">
                  Private
                </span>
              )}
            </h1>
            {profileUser.bio && <p className="text-gray-400 text-sm">{profileUser.bio}</p>}
          </div>

          <div className="flex gap-8 mt-6 pt-6 border-t border-white/5">
            <div>
              <p className="text-2xl font-bold text-white">{canSeePosts ? posts.length : "—"}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Posts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{followersCount}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{followingCount}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Following</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Posts section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {isOwnProfile ? "Your Posts" : `Posts by @${profileUser.username}`}
        </h2>
      </div>

      {!canSeePosts ? (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">This Account is Private</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Follow @{profileUser.username} to see their posts.
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-16 text-center">
          <p className="text-gray-500 font-mono text-sm">
            {isOwnProfile ? "You haven't posted anything yet." : `@${profileUser.username} hasn't posted anything yet.`}
          </p>
          {isOwnProfile && (
            <Link
              to="/upload"
              className="inline-block mt-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
            >
              Upload First Post
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/p/${post.id}`}
              className="relative group aspect-square bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all"
            >
              {post.url ? (
                post.url.includes(".mp4") || post.url.includes("video") ? (
                  <video src={post.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">NO MEDIA</div>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <p className="text-white text-xs text-center line-clamp-3 px-4">{post.caption || "No caption"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserProfile;