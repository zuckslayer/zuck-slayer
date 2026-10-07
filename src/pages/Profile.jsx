import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

function Profile() {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      console.error("Error deleting post: ", error);
      alert("Failed to delete the post.");
    }
  };

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  if (loading && !userProfile) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-pink-500 font-mono animate-pulse">
        Loading profile...
      </div>
    );
  }

  const username = userProfile?.username || "user";
  const email = userProfile?.email || currentUser?.email;
  const followersCount = userProfile?.followers?.length || 0;
  const followingCount = userProfile?.following?.length || 0;
  const bio = userProfile?.bio || "Just landed on Zuck Slayer.";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white">
      
      {/* 🔥 Profile Header Card */}
      <div className="relative bg-[#111111] border border-white/5 rounded-3xl overflow-hidden mb-10">
        
        {/* Cover Banner */}
        <div className="h-40 w-full bg-gradient-to-r from-pink-600/40 via-purple-600/30 to-purple-700/40 relative">
          <div className="absolute inset-0 opacity-20" 
               style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        </div>

        {/* Avatar & Actions */}
        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 mb-6 gap-4">
            
            {/* Avatar */}
<div className="relative">
  <div className="w-28 h-28 rounded-2xl border-4 border-[#111111] bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)] overflow-hidden">
    {userProfile?.photoURL ? (
      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
    ) : (
      <span className="text-4xl font-black text-white">{getInitials(username)}</span>
    )}
  </div>
</div>

            {/* Action Buttons */}
              <div className="flex gap-3">
              <Link
                to="/edit-profile"
                className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] text-sm font-bold tracking-wide transition-all duration-300"
              >
                Edit Profile
              </Link>
              <Link
                to="/settings"
                className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.05] flex items-center justify-center transition-all duration-300"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-400">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        </div>

          {/* User Info */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">@{username}</h1>
            <p className="text-gray-400 text-sm">{bio}</p>
            <p className="text-gray-500 text-xs font-mono">{email}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6 pt-6 border-t border-white/5">
            <div>
              <p className="text-2xl font-bold text-white">{posts.length}</p>
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
      </div>

      {/* 🔥 Uploads Grid */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Your Uploads</h2>
        <Link to="/upload" className="text-xs font-bold text-pink-400 hover:text-pink-300 uppercase tracking-widest transition">
          + New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-12 text-center">
          <p className="text-gray-500 font-mono text-sm mb-4">No uploads yet. Go slay some memes!</p>
          <Link to="/upload" className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all">
            Upload First Post
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="relative group aspect-square bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
              
              {/* Media */}
              {post.url ? (
                post.url.includes(".mp4") || post.url.includes("video") ? (
                  <video src={post.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.url} alt="Uploaded" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">
                  NO MEDIA
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-4 p-4">
                <p className="text-white text-xs text-center line-clamp-3">{post.caption || "No caption"}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold px-4 py-2 rounded-lg border border-red-500/30 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
export default Profile;