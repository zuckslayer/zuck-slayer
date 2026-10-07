import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { unblockUser } from "../utils/moderation";
import { useToast } from "../components/Toast";

function BlockedUsers() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(collection(db, "users", currentUser.uid, "blocked"));
      const rows = await Promise.all(
        snap.docs.map(async (d) => {
          const userSnap = await getDoc(doc(db, "users", d.id));
          return {
            uid: d.id,
            ...d.data(),
            profile: userSnap.exists() ? userSnap.data() : null,
          };
        })
      );
      setUsers(rows);
    } catch (err) {
      console.warn("Failed to load blocked users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentUser]);

  const handleUnblock = async (uid, username) => {
    try {
      await unblockUser(currentUser.uid, uid);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      showToast(`Unblocked @${username}`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to unblock. Try again.", "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-white">
      <div className="mb-8">
        <Link to="/settings" className="text-xs font-mono text-gray-500 hover:text-pink-400 transition tracking-widest uppercase mb-4 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-4xl font-black tracking-tighter">
          Blocked <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Accounts</span>
        </h1>
        <p className="text-gray-500 text-sm mt-2">People you've blocked. They can't see you or message you.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nobody's blocked</h3>
          <p className="text-gray-500 text-sm">When you block someone, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const username = u.profile?.username || "user";
            return (
              <motion.div
                key={u.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shrink-0">
                  {u.profile?.photoURL ? (
                    <img src={u.profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-white">{username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">@{username}</p>
                  <p className="text-xs text-gray-500 truncate">{u.profile?.bio || "On Zuck Slayer"}</p>
                </div>
                <button
                  onClick={() => handleUnblock(u.uid, username)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-green-500/40 hover:bg-green-500/10 text-green-400 text-xs font-bold transition-all"
                >
                  Unblock
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BlockedUsers;