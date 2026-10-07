import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { encryptMessage, decryptMessage, deriveConversationKey } from "../utils/crypto";
import UserActionsMenu from "../components/UserActionsMenu";

const REACTIONS = ["❤️", "😂", "🔥", "😮", "😢", "👍"];

function ChatThread() {
  const { conversationId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const [otherUser, setOtherUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [convKey, setConvKey] = useState(null);
  const [decryptedCache, setDecryptedCache] = useState({});
  const [otherTyping, setOtherTyping] = useState(false);
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

  // ─────────────────────────────────────
  // LOAD CONVERSATION + KEY + MARK READ
  // ─────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !conversationId) return;
    let cancelled = false;

    const failsafe = setTimeout(() => { if (!cancelled) setLoading(false); }, 4000);

    const loadConversation = async () => {
      try {
        const convRef = doc(db, "conversations", conversationId);
        const snap = await getDoc(convRef);
        if (cancelled) return;
        if (!snap.exists()) {
          setError("Conversation not found.");
          setLoading(false); clearTimeout(failsafe); return;
        }
        const data = { id: snap.id, ...snap.data() };
        if (!data.participants?.includes(currentUser.uid)) {
          setError("You're not part of this conversation.");
          setLoading(false); clearTimeout(failsafe); return;
        }
        setConversation(data);

        const otherId = data.participants.find((p) => p !== currentUser.uid);
        const fallback = data.participantProfiles?.[otherId] || {};
        setOtherUser({
          id: otherId,
          username: fallback.username || "user",
          photoURL: fallback.photoURL || "",
        });

        const key = await deriveConversationKey(currentUser.uid, otherId);
        if (cancelled) return;
        setConvKey(key);
        setLoading(false);
        clearTimeout(failsafe);

        getDoc(doc(db, "users", otherId)).then((userSnap) => {
          if (!cancelled && userSnap.exists()) {
            const live = userSnap.data();
            setOtherUser({
              id: otherId,
              username: live.username || fallback.username || "user",
              photoURL: live.photoURL || fallback.photoURL || "",
            });
          }
        }).catch(() => {});

        updateDoc(convRef, {
          [`lastReadAt.${currentUser.uid}`]: serverTimestamp(),
          [`lastReadAtMs.${currentUser.uid}`]: Date.now(),
        }).catch(() => {});
      } catch (err) {
        console.error("Load conversation failed:", err);
        if (!cancelled) { setError("Failed to load conversation."); setLoading(false); }
        clearTimeout(failsafe);
      }
    };

    loadConversation();
    return () => { cancelled = true; clearTimeout(failsafe); };
  }, [conversationId, currentUser]);

  // ─────────────────────────────────────
  // CONVERSATION LISTENER (typing + read status)
  // ─────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !currentUser) return;
    const convRef = doc(db, "conversations", conversationId);
    const unsub = onSnapshot(convRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setConversation({ id: snap.id, ...data });

      const otherId = data.participants.find((p) => p !== currentUser.uid);
      const otherTypingAt = data.typing?.[otherId] || 0;
      setOtherTyping(Date.now() - otherTypingAt < 4000);
    });
    return () => unsub();
  }, [conversationId, currentUser]);

  // ─────────────────────────────────────
  // REALTIME MESSAGES LISTENER
  // ─────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Auto-mark as read
  useEffect(() => {
    if (!currentUser || !conversationId || messages.length === 0) return;
    const convRef = doc(db, "conversations", conversationId);
    updateDoc(convRef, {
      [`lastReadAt.${currentUser.uid}`]: serverTimestamp(),
      [`lastReadAtMs.${currentUser.uid}`]: Date.now(),
    }).catch(() => {});
  }, [messages.length, conversationId, currentUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  // ─────────────────────────────────────
  // DECRYPT MESSAGES
  // ─────────────────────────────────────
  useEffect(() => {
    if (!convKey || messages.length === 0) return;
    const decryptAll = async () => {
      const newCache = { ...decryptedCache };
      let changed = false;
      for (const msg of messages) {
        if (newCache[msg.id] !== undefined) continue;
        if (!msg.text) { newCache[msg.id] = ""; changed = true; continue; }
        try {
          newCache[msg.id] = await decryptMessage(msg.text, convKey);
        } catch {
          newCache[msg.id] = "[Unable to decrypt]";
        }
        changed = true;
      }
      if (changed) setDecryptedCache(newCache);
    };
    decryptAll();
  }, [convKey, messages]);

  // ─────────────────────────────────────
  // TYPING INDICATOR
  // ─────────────────────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!conversationId || !currentUser) return;

    const convRef = doc(db, "conversations", conversationId);
    updateDoc(convRef, {
      [`typing.${currentUser.uid}`]: Date.now(),
    }).catch(() => {});

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      updateDoc(convRef, {
        [`typing.${currentUser.uid}`]: 0,
      }).catch(() => {});
    }, 3000);
  };

  // ─────────────────────────────────────
  // SEND
  // ─────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending || !convKey) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      const encrypted = await encryptMessage(text, convKey);
      const now = Date.now();

      const batch = writeBatch(db);
      const msgRef = doc(collection(db, "conversations", conversationId, "messages"));
      const convRef = doc(db, "conversations", conversationId);

      batch.set(msgRef, {
        senderId: currentUser.uid,
        text: encrypted,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });

      batch.update(convRef, {
        lastMessage: encrypted,
        lastMessageSenderId: currentUser.uid,
        lastMessageAt: serverTimestamp(),
        lastMessageAtMs: now,
        [`typing.${currentUser.uid}`]: 0,
      });

      await batch.commit();
    } catch (err) {
      console.error("Send failed:", err);
      setError("Message failed to send.");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────
  // REACTION
  // ─────────────────────────────────────
  const toggleReaction = async (messageId, emoji) => {
    if (!currentUser) return;
    setReactionPickerFor(null);
    const msgRef = doc(db, "conversations", conversationId, "messages", messageId);
    const msg = messages.find((m) => m.id === messageId);
    const reactions = msg?.reactions || {};
    const iAmIn = reactions[currentUser.uid] === emoji;

    try {
      if (iAmIn) {
        await updateDoc(msgRef, { [`reactions.${currentUser.uid}`]: deleteField() });
      } else {
        await updateDoc(msgRef, { [`reactions.${currentUser.uid}`]: emoji });
      }
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  // ─────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const formatDateHeader = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const shouldShowDateHeader = (cur, prev) => {
    if (!prev) return true;
    const a = cur.createdAt?.toDate?.();
    const b = prev.createdAt?.toDate?.();
    if (!a || !b) return false;
    return a.toDateString() !== b.toDateString();
  };

  const isSeenByOther = (msg) => {
    if (!conversation || !otherUser) return false;
    if (msg.senderId !== currentUser.uid) return false;
    const otherLastRead = conversation.lastReadAtMs?.[otherUser.id] || 0;
    return otherLastRead >= (msg.createdAtMs || 0);
  };

  // ─────────────────────────────────────
  // LOADING / ERROR
  // ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-pink-500 font-mono animate-pulse">
        Decrypting conversation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-3">{error}</h2>
        <Link to="/chats" className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl">
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-104px)] md:h-[calc(100dvh-96px)]">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <button
          onClick={() => navigate("/chats")}
          className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 flex items-center justify-center transition-all shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <Link
          to={`/u/${otherUser?.username || ""}`}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-black text-white">
                {otherUser?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate group-hover:text-pink-400 transition-colors">
              @{otherUser?.username || "user"}
            </p>
            <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              End-to-end encrypted
            </p>
          </div>
        </Link>

        {/* 🔥 Menu — must be OUTSIDE the Link */}
        <UserActionsMenu
          targetUserId={otherUser?.id}
          targetUsername={otherUser?.username}
          contentType="user"
          contentId={conversationId}
        />
      </div>

      {/* ═══ Messages ═══ */}
      <div className="flex-1 overflow-y-auto py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-pink-400">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 mb-1">This channel is encrypted.</p>
            <p className="text-xs text-gray-600 font-mono">Say something. Only they will see it.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            const isMe = msg.senderId === currentUser.uid;
            const showHeader = shouldShowDateHeader(msg, prev);
            const text = decryptedCache[msg.id];
            const seen = isSeenByOther(msg);
            const reactions = msg.reactions || {};
            const reactionCounts = {};
            Object.values(reactions).forEach((emoji) => {
              reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            });

            return (
              <div key={msg.id}>
                {showHeader && (
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>
                )}

                <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1.5 group/msg`}>
                  <div className="relative max-w-[75%] md:max-w-[65%]">
                    <div className={`px-4 py-2.5 rounded-2xl relative ${
                      isMe
                        ? "bg-gradient-to-br from-pink-600/90 to-purple-600/90 rounded-br-sm"
                        : "bg-white/[0.06] border border-white/10 rounded-bl-sm"
                    }`}>
                      {msg.sharedPost && (
                        <a
                          href={`/u/${msg.sharedPost.postOwnerUsername}`}
                          className="block mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:border-pink-500/50 transition-all"
                          style={{ minWidth: 220, maxWidth: 260 }}
                        >
                          {msg.sharedPost.postUrl && (
                            <div className="aspect-square bg-black">
                              {msg.sharedPost.postUrl.includes(".mp4") || msg.sharedPost.postUrl.includes("video") ? (
                                <video src={msg.sharedPost.postUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={msg.sharedPost.postUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          )}
                          <div className="p-2.5">
                            <p className="text-[10px] text-pink-400 font-bold truncate">@{msg.sharedPost.postOwnerUsername}</p>
                            {msg.sharedPost.postCaption && (
                              <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5">{msg.sharedPost.postCaption}</p>
                            )}
                          </div>
                        </a>
                      )}

                      <p className="text-sm text-white break-words whitespace-pre-wrap leading-relaxed">
                        {text === undefined ? (
                          <span className="inline-flex items-center gap-1.5 opacity-60">
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            decrypting...
                          </span>
                        ) : text}
                      </p>
                      <div className={`flex items-center gap-2 text-[10px] mt-1 font-mono ${
                        isMe ? "text-white/80 justify-end" : "text-gray-500"
                      }`}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && seen && <span className="text-pink-300">Seen</span>}
                      </div>
                    </div>

                    {Object.keys(reactionCounts).length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-[11px] bg-black/40 backdrop-blur border flex items-center gap-1 ${
                              reactions[currentUser.uid] === emoji ? "border-pink-500/60" : "border-white/15"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-white/80 font-mono">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setReactionPickerFor(reactionPickerFor === msg.id ? null : msg.id)}
                      className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 backdrop-blur border border-white/20 items-center justify-center text-white text-xs opacity-0 group-hover/msg:opacity-100 transition-opacity hidden md:flex ${
                        isMe ? "-left-8" : "-right-8"
                      }`}
                    >
                      +
                    </button>

                    <AnimatePresence>
                      {reactionPickerFor === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.9 }}
                          className={`absolute z-50 -top-12 flex gap-1 p-1.5 rounded-full bg-[#1a1a1a] border border-white/15 shadow-xl ${
                            isMe ? "right-0" : "left-0"
                          }`}
                        >
                          {REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <AnimatePresence>
          {otherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ═══ Input ═══ */}
      <form onSubmit={handleSend} className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type an encrypted message..."
              autoComplete="off"
              className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_-5px_rgba(236,72,153,0.4)] transition-all duration-300 pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 flex items-center justify-center text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
          >
            {sending ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mt-2 px-1">{error}</p>}
      </form>
    </div>
  );
}

export default ChatThread;