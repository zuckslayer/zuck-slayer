import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Saved() {
  const { currentUser } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    let unsub = () => {};
    try {
      const ref = collection(db, "users", currentUser.uid, "saved");
      unsub = onSnapshot(
        ref,
        (snap) => {
          const data = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.savedAtMs || 0) - (a.savedAtMs || 0));
          setSaved(data);
          setLoading(false);
        },
        (error) => {
          console.warn("Saved listener error:", error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("Saved setup failed:", err);
      setLoading(false);
    }

    return () => unsub();
  }, [currentUser]);

  const handleUnsave = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "saved", postId));
    } catch (err) {
      console.error("Unsave failed:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          Saved
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Your private collection. Only you can see this.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="bg-[#111111] border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Nothing saved yet</h3>
          <p className="text-gray-500 text-sm mb-6">
            Tap the bookmark icon on any post to save it here.
          </p>
          <Link
            to={`/p/${item.postId}`}
            className="relative group block aspect-square bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all"
            >
            Browse the Feed
          </Link>           
        </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {saved.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Link
                to={`/p/${item.postId}`}
                className="relative group block aspect-square bg-[#111111] border border-white/5 rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all"
              >
                {item.postUrl ? (
                  item.postUrl.includes(".mp4") || item.postUrl.includes("video") ? (
                    <video src={item.postUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img
                      src={item.postUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">
                    NO MEDIA
                  </div>
                )}

                {/* Hover overlay with caption + unsave */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => handleUnsave(e, item.postId)}
                      className="w-8 h-8 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:text-red-400 hover:border-red-500/50 transition-all"
                      title="Remove from saved"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                  <div>
                    <p className="text-white text-xs line-clamp-3 mb-1">
                      {item.postCaption || "No caption"}
                    </p>
                    {item.postOwnerUsername && (
                      <p className="text-[10px] text-pink-400 font-bold">
                        @{item.postOwnerUsername}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Saved;