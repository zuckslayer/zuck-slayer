import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function StoryRow() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    let unsub = () => {};
    try {
      const storiesRef = collection(db, "stories");
      const q = query(storiesRef, where("expiresAtMs", ">", Date.now()));

      unsub = onSnapshot(
        q,
        async (snap) => {
          const stories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          // Group by userId
          const grouped = {};
          for (const story of stories) {
            if (!grouped[story.userId]) grouped[story.userId] = [];
            grouped[story.userId].push(story);
          }

          // Fetch user info for each group
          const groups = [];
          for (const userId of Object.keys(grouped)) {
            try {
              const userSnap = await getDoc(doc(db, "users", userId));
              if (userSnap.exists()) {
                const userData = userSnap.data();
                groups.push({
                  userId,
                  username: userData.username || "user",
                  photoURL: userData.photoURL || "",
                  stories: grouped[userId].sort(
                    (a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0)
                  ),
                });
              }
            } catch (_) {}
          }

          // Sort: own stories first, then most recent
          groups.sort((a, b) => {
            if (a.userId === currentUser.uid) return -1;
            if (b.userId === currentUser.uid) return 1;
            const aLatest = a.stories[a.stories.length - 1]?.createdAtMs || 0;
            const bLatest = b.stories[b.stories.length - 1]?.createdAtMs || 0;
            return bLatest - aLatest;
          });

          setStoryGroups(groups);
          setLoading(false);
        },
        (error) => {
          console.warn("StoryRow listener error:", error);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn("StoryRow setup failed:", err);
      setLoading(false);
    }

    return () => unsub();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex gap-3 py-4 overflow-x-auto no-scrollbar">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="shrink-0 flex flex-col items-center gap-2 w-16">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/5 animate-pulse" />
            <div className="w-12 h-2 bg-white/[0.03] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const myGroup = storyGroups.find((g) => g.userId === currentUser.uid);
  const hasMyStory = !!myGroup;

  const openStory = (groupId) => {
    navigate(`/stories?group=${groupId}`);
  };

  return (
    <div className="py-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {/* Your Story */}
        <button
          onClick={() => {
            if (hasMyStory) openStory(currentUser.uid);
            else navigate("/upload");
          }}
          className="shrink-0 flex flex-col items-center gap-2 w-16 group"
        >
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-full p-[2px] ${
                hasMyStory
                  ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-pink-500"
                  : "bg-white/10"
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#0a0a0a] p-[2px]">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden">
                  <span className="text-lg font-black text-white">+</span>
                </div>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center group-hover:text-white transition-colors">
            Your story
          </span>
        </button>

        {/* Other users' stories */}
        {storyGroups
          .filter((g) => g.userId !== currentUser.uid)
          .map((group) => (
            <button
              key={group.userId}
              onClick={() => openStory(group.userId)}
              className="shrink-0 flex flex-col items-center gap-2 w-16 group"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-purple-500 to-pink-500">
                <div className="w-full h-full rounded-full bg-[#0a0a0a] p-[2px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600 flex items-center justify-center overflow-hidden">
                    {group.photoURL ? (
                      <img
                        src={group.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-white">
                        {group.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 truncate w-full text-center group-hover:text-white transition-colors">
                @{group.username}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

export default StoryRow;