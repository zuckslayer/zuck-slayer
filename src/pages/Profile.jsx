import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, deleteDoc } from "firebase/firestore";

function Profile() {
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDataAndPosts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch user info
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }

      // Fetch user posts with real-time updates using onSnapshot
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("userId", "==", user.uid),  // Ensure we're filtering by the correct userId
        orderBy("createdAt", "desc")      // Order by createdAt field
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
        setLoading(false);
      });

      // Cleanup the listener when the component unmounts
      return () => unsubscribe();
    };

    fetchUserDataAndPosts();
  }, []);

  const handleDeletePost = async (postId) => {
    try {
      const postRef = doc(db, "posts", postId);
      await deleteDoc(postRef);
      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post: ", error);
      alert("Failed to delete the post.");
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 mt-10">Loading profile...</div>;
  }

  if (!userData) {
    return <div className="text-center text-gray-400 mt-10">No user data found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-white">
      <h2 className="text-3xl font-bold mb-4">Your Profile</h2>
      <div className="bg-gray-800 p-4 rounded-xl shadow mb-10 space-y-2">
        <p><strong>Username:</strong> {userData.username}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Followers:</strong> {userData.followers?.length || 0}</p>
        <p><strong>Following:</strong> {userData.following?.length || 0}</p>
      </div>

      <h3 className="text-2xl font-bold mb-4">Your Uploads</h3>
      {posts.length === 0 ? (
        <p>No uploads yet. Go slay some memes!</p>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-800 p-4 rounded-xl shadow-md">
              <p className="mb-2 text-pink-400 font-medium">{post.caption}</p>
              {post.url.includes(".mp4") || post.url.includes("video") ? (
                <video src={post.url} controls className="w-full rounded" />
              ) : (
                <img src={post.url} alt="Uploaded" className="w-full rounded" />
              )}
              <p className="text-sm text-gray-400 mt-2">
                Uploaded on {post.createdAt?.toDate().toLocaleString() || "N/A"}
              </p>
              {/* Delete button for the post */}
              <button
                onClick={() => handleDeletePost(post.id)}
                className="text-red-500 hover:text-red-700 mt-3"
              >
                Delete Post
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;



