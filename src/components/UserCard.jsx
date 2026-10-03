import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth"; // make sure you have a way to get current user

function UserCard({ user }) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const data = snap.data();
      setIsFollowing(data?.following?.includes(user.uid));
    });

    return () => unsub();
  }, [currentUser, user.uid]);

  const handleFollow = async () => {
    const currentRef = doc(db, "users", currentUser.uid);
    const targetRef = doc(db, "users", user.uid);

    if (isFollowing) {
      // Unfollow
      await updateDoc(currentRef, {
        following: arrayRemove(user.uid),
      });
      await updateDoc(targetRef, {
        followers: arrayRemove(currentUser.uid),
      });
    } else {
      // Follow
      await updateDoc(currentRef, {
        following: arrayUnion(user.uid),
      });
      await updateDoc(targetRef, {
        followers: arrayUnion(currentUser.uid),
      });
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl text-white flex justify-between items-center mb-4">
      <div>
        <p className="text-lg font-semibold">@{user.username}</p>
        <p className="text-sm text-gray-400">{user.email}</p>
      </div>
      {currentUser.uid !== user.uid && (
        <button
          onClick={handleFollow}
          className={`px-4 py-1 rounded-full font-medium ${
            isFollowing ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
      )}
    </div>
  );
}

export default UserCard;
