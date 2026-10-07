import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const notifRef = collection(db, "notifications");
    const q = query(notifRef, where("recipientId", "==", currentUser.uid));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            (b.createdAtMs || 0) - (a.createdAtMs || 0)
        );
      setNotifications(data);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // 🔥 Mark all as read when the page is opened
  useEffect(() => {
    if (!currentUser || notifications.length === 0) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    batch.commit().catch(() => {});
  }, [notifications, currentUser]);

  const getIcon = (type) => {
    if (type === "like")
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      );
    if (type === "comment")
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    if (type === "follow")
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-4 h-4">
            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    return null;
  };

  const getText = (n) => {
    if (n.type === "like") return "liked your post";
    if (n.type === "comment") return `commented: "${n.text}"`;
    if (n.type === "follow") return "started following you";
    return "did something";
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          Notifications
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Everything happening with your account.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">All caught up</h3>
          <p className="text-gray-500 text-sm">When someone likes, comments, or follows you, it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                n.read
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-gradient-to-r from-pink-500/[0.06] to-blue-500/[0.03] border-pink-500/20"
              }`}
            >
              {getIcon(n.type)}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">
                  <Link
                    to={`/u/${n.actorUsername}`}
                    className="font-bold text-white hover:text-pink-400 mr-1 transition-colors"
                  >
                    @{n.actorUsername}
                  </Link>
                  {getText(n)}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {formatTime(n.createdAt)}
                </p>
              </div>

              {/* Post preview thumbnail */}
              {n.postPreviewUrl && (
                <Link
                  to={`/p/${n.postId}`}
                  className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 hover:border-pink-500/50 transition-all"
                >
                  <img
                    src={n.postPreviewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;