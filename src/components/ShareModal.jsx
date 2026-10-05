import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  limit,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { encryptMessage, deriveConversationKey } from "../utils/crypto";

function ShareModal({ post, onClose }) {
  const { currentUser, userProfile } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [liveProfiles, setLiveProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [sending, setSending] = useState(null); // id currently sending
  const [sent, setSent] = useState(null);       // id just sent

  // ─────────────────────────────────────
  // LOAD RECENT CONVERSATIONS
  // ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      try {
        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("participants", "array-contains", currentUser.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
        setConversations(data);

        const profiles = {};
        for (const conv of data) {
          const otherId = conv.participants.find((p) => p !== currentUser.uid);
          if (!otherId || profiles[otherId]) continue;
          try {
            const userSnap = await getDoc(doc(db, "users", otherId));
            if (userSnap.exists()) profiles[otherId] = userSnap.data();
          } catch (_) {}
        }
        setLiveProfiles(profiles);
      } catch (err) {
        console.warn("Share modal load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  // ─────────────────────────────────────
  // SEARCH ALL USERS
  // ─────────────────────────────────────
  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (trimmed.length === 0) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const filtered = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== currentUser.uid)
          .filter((u) => {
            const name = (u.username || "").toLowerCase();
            return name.includes(trimmed);
          })
          .slice(0, 20);
        setSearchResults(filtered);
      } catch (err) {
        console.warn("User search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  // ─────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────
  const getOtherUser = (conv) => {
    const otherId = conv.participants.find((p) => p !== currentUser.uid);
    const live = liveProfiles[otherId];
    const stored = conv.participantProfiles?.[otherId] || {};
    return {
      id: otherId,
      username: live?.username || stored.username || "user",
      photoURL: live?.photoURL || stored.photoURL || "",
    };
  };

  // Find an existing conversation with a user, or create a new one
  const findOrCreateConversation = async (otherUserId) => {
    const existing = conversations.find((conv) =>
      conv.participants.includes(otherUserId)
    );
    if (existing) return existing.id;

    const otherUserSnap = await getDoc(doc(db, "users", otherUserId));
    const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};

    const newRef = await addDoc(collection(db, "conversations"), {
      participants: [currentUser.uid, otherUserId],
      participantProfiles: {
        [currentUser.uid]: {
          username: userProfile?.username || "user",
          photoURL: userProfile?.photoURL || "",
        },
        [otherUserId]: {
          username: otherUserData.username || "user",
          photoURL: otherUserData.photoURL || "",
        },
      },
      lastMessage: "",
      lastMessageSenderId: "",
      lastMessageAt: serverTimestamp(),
      lastMessageAtMs: Date.now(),
      createdAt: serverTimestamp(),
    });

    return newRef.id;
  };

  // ─────────────────────────────────────
  // SEND SHARE
  // ─────────────────────────────────────
  const handleSend = async (otherUserId) => {
    if (!currentUser || sending || sent) return;
    setSending(otherUserId);

    try {
      const convId = await findOrCreateConversation(otherUserId);
      const convKey = await deriveConversationKey(currentUser.uid, otherUserId);

      const mediaUrl = post.url || (post.mediaUrls && post.mediaUrls[0]) || "";
      const sharedPost = {
        postId: post.postId,
        postUrl: mediaUrl,
        postCaption: (post.caption || "").slice(0, 200),
        postOwnerUsername: post.authorUsername || "user",
      };

      const encryptedText = await encryptMessage("Check this out", convKey);
      const now = Date.now();

      await addDoc(collection(db, "conversations", convId, "messages"), {
        senderId: currentUser.uid,
        text: encryptedText,
        sharedPost,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });

      await updateDoc(doc(db, "conversations", convId), {
        lastMessage: encryptedText,
        lastMessageSenderId: currentUser.uid,
        lastMessageAt: serverTimestamp(),
        lastMessageAtMs: now,
      });

      setSent(otherUserId);
      setTimeout(() => onClose(), 900);
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSending(null);
    }
  };

  // ─────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────
  const previewUrl = post.url || (post.mediaUrls && post.mediaUrls[0]) || "";
  const isVideo = previewUrl.includes(".mp4") || previewUrl.includes("video");

  const recentUsers = conversations.slice(0, 12).map(getOtherUser);
  const isSearching = searchTerm.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#111111] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* ── HEADER ── */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-white">Send to</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 flex items-center justify-center transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── POST PREVIEW STRIP ── */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 bg-white/[0.02] shrink-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
            {previewUrl ? (
              isVideo ? (
                <video src={previewUrl} className="w-full h-full object-cover" />
              ) : (
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">
                NO MEDIA
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-pink-400 font-bold truncate">
              @{post.authorUsername || "user"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {post.caption || "No caption"}
            </p>
          </div>
        </div>

        {/* ── SEARCH ── */}
        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search @username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/50 transition-all"
            />
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isSearching ? (
            // ── SEARCH RESULTS ──
            <div className="px-3 pb-3">
              {searching ? (
                <p className="text-center text-xs text-gray-500 font-mono py-6">
                  Searching...
                </p>
              ) : searchResults.length === 0 ? (
                <p className="text-center text-xs text-gray-500 font-mono py-6">
                  No user found with "{searchTerm}"
                </p>
              ) : (
                searchResults.map((u) => {
                  const isSending = sending === u.id;
                  const isSent = sent === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSend(u.id)}
                      disabled={!!sending || !!sent}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSent
                          ? "bg-green-500/10 border border-green-500/30"
                          : "hover:bg-white/[0.05] border border-transparent"
                      } disabled:cursor-not-allowed`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-white">
                            {u.username?.charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          @{u.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {u.bio || "On Zuck Slayer"}
                        </p>
                      </div>
                      {isSending ? (
                        <svg className="animate-spin w-5 h-5 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : isSent ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-green-400">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600">
                          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // ── RECENT + CONVERSATIONS ──
            <div className="pb-4">
              {/* Recent horizontal avatars */}
              {recentUsers.length > 0 && (
                <div className="px-5 pt-2 pb-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Recent
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {recentUsers.map((u) => {
                      const isSending = sending === u.id;
                      const isSent = sent === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSend(u.id)}
                          disabled={!!sending || !!sent}
                          className="shrink-0 flex flex-col items-center gap-1.5 w-16 disabled:cursor-not-allowed group"
                        >
                          <div className="relative">
                            <div
                              className={`w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden border-2 transition-all ${
                                isSent
                                  ? "border-green-500"
                                  : "border-transparent group-hover:border-pink-500"
                              }`}
                            >
                              {u.photoURL ? (
                                <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg font-black text-white">
                                  {u.username?.charAt(0).toUpperCase() || "?"}
                                </span>
                              )}
                            </div>
                            {/* Sending / sent overlay */}
                            {isSending && (
                              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                <svg className="animate-spin w-5 h-5 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            )}
                            {isSent && (
                              <div className="absolute inset-0 rounded-full bg-green-500/30 backdrop-blur-sm flex items-center justify-center">
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-6 h-6">
                                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 truncate w-full text-center">
                            @{u.username}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {recentUsers.length > 0 && conversations.length > 0 && (
                <div className="h-px bg-white/5 mx-5 my-1" />
              )}

              {/* Full conversation list */}
              <div className="px-3 pt-3">
                <p className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Messages
                </p>
                {conversations.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 font-mono py-6">
                    Search for a user to send your first share.
                  </p>
                ) : (
                  conversations.map((conv) => {
                    const u = getOtherUser(conv);
                    const isSending = sending === u.id;
                    const isSent = sent === u.id;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSend(u.id)}
                        disabled={!!sending || !!sent}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          isSent
                            ? "bg-green-500/10 border border-green-500/30"
                            : "hover:bg-white/[0.05] border border-transparent"
                        } disabled:cursor-not-allowed`}
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-black text-white">
                              {u.username?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            @{u.username}
                          </p>
                        </div>
                        {isSending ? (
                          <svg className="animate-spin w-5 h-5 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : isSent ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-green-400">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600">
                            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ShareModal;