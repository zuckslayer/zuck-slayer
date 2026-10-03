import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

function Chats() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  // Real-time listener for conversations
  useEffect(() => {
    if (!currentUser) return;

    const convRef = collection(db, "conversations");
    const q = query(
      convRef,
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort by lastMessageAt desc client-side (avoids composite index)
      data.sort((a, b) => {
        const aTime = a.lastMessageAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.lastMessageAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setConversations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getOtherUser = (conv) => {
    const otherId = conv.participants.find((p) => p !== currentUser.uid);
    return conv.participantProfiles?.[otherId] || { username: "user", photoURL: "" };
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
            Messages
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            End-to-end encrypted. We can't read them either.
          </p>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No conversations yet</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Start a chat with someone. It'll be encrypted on your end before it leaves your device.
          </p>
          <button
            onClick={() => setShowNewChat(true)}
            className="inline-block bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            Start a Chat
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = getOtherUser(conv);
            return (
              <Link
                key={conv.id}
                to={`/chats/${conv.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-pink-500/30 hover:bg-white/[0.04] transition-all group"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                  {other.photoURL ? (
                    <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-white">
                      {other.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-white truncate">
                      @{other.username || "user"}
                    </p>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0 ml-2">
                      {formatTime(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Encrypted · Tap to open
                  </p>
                </div>

                {/* Chevron */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all shrink-0">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// NEW CHAT MODAL
// ═══════════════════════════════════════════════
function NewChatModal({ onClose, currentUser }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Live search as user types
  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(query(usersRef, limit(50)));
        const filtered = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (u) =>
              u.id !== currentUser.uid &&
              u.username?.toLowerCase().includes(trimmed)
          )
          .slice(0, 10);
        setResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  const startChat = async (otherUser) => {
    setError("");
    try {
      // Check if a conversation already exists
      const convRef = collection(db, "conversations");
      const q = query(convRef, where("participants", "array-contains", currentUser.uid));
      const snap = await getDocs(q);
      const existing = snap.docs.find((d) => {
        const parts = d.data().participants || [];
        return parts.includes(otherUser.id);
      });

      if (existing) {
        onClose();
        window.location.href = `/chats/${existing.id}`;
        return;
      }

      // Create new conversation
      const newDoc = await addDoc(convRef, {
        participants: [currentUser.uid, otherUser.id],
        participantProfiles: {
          [currentUser.uid]: {
            username: "you", // will be updated by listener
            photoURL: "",
          },
          [otherUser.id]: {
            username: otherUser.username || "user",
            photoURL: otherUser.photoURL || "",
          },
        },
        lastMessage: "",
        lastMessageSenderId: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      onClose();
      window.location.href = `/chats/${newDoc.id}`;
    } catch (err) {
      console.error(err);
      setError("Failed to start chat. Try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">New Message</h3>
            <p className="text-xs text-gray-500 mt-1">Search by username</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="p-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search @username..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto px-4 pb-4">
          {searching && (
            <p className="text-center text-xs text-gray-500 py-8 font-mono">Searching...</p>
          )}
          {!searching && searchTerm.length >= 2 && results.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-8 font-mono">
              No user found with "@{searchTerm}"
            </p>
          )}
          {!searching && searchTerm.length < 2 && (
            <p className="text-center text-xs text-gray-600 py-8 font-mono">
              Type at least 2 characters
            </p>
          )}
          {!searching && results.map((user) => (
            <button
              key={user.id}
              onClick={() => startChat(user)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-white">
                    {user.username?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">@{user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.bio || "On Zuck Slayer"}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-600 shrink-0">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          {error && (
            <p className="text-center text-xs text-red-400 py-3">{error}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Chats;