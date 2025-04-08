import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
    };

    fetchPosts();
  }, []);

  return (
    <div>
      {/* 🔥 Hero Section */}
      <div
        className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600051854520-0fefb2f45a70?auto=format&fit=crop&w=1740&q=80')",
        }}
      >
        <motion.div
          className="bg-black/60 p-8 rounded-2xl shadow-xl text-center max-w-xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-pink-500 drop-shadow-lg">
            ZUCK SLAYER
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6">
            Meme warfare. No mercy. Join the rebellion on Instagram.
          </p>
          <a
            href="https://www.instagram.com/tusharpatel6285"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-md transition-all"
          >
            Follow the Chaos
          </a>
        </motion.div>
      </div>

      {/* 🧠 Posts Section */}
      <div className="p-6 max-w-3xl mx-auto space-y-8 bg-gray-950">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-gray-800 p-4 rounded-lg shadow-md text-white"
          >
            {post.url.includes('.mp4') || post.url.includes('video') ? (
              <video src={post.url} controls className="w-full rounded-lg" />
            ) : (
              <img src={post.url} alt="Post" className="w-full rounded-lg" />
            )}
            <p className="mt-2 text-pink-300">{post.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
