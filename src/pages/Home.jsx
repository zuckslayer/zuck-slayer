import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import StoryRow from '../components/StoryRow';

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
    <div className="w-full space-y-10">

      {/* 🔥 Stories Row */}
      <StoryRow />

      {/* 🔥 Hero Section */}
      <section className="relative rounded-2xl md:rounded-3xl overflow-hidden min-h-[60vh] md:min-h-[70vh] flex items-center justify-center border border-white/10 shadow-2xl">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 20% 20%, rgba(236,72,153,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.25) 0%, transparent 50%), linear-gradient(180deg, #0a0a0a 0%, #111111 100%)"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

        <div className="relative z-10 text-center max-w-2xl px-6 flex flex-col items-center">

          <motion.h1
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] tracking-tighter"
          >
            ZUCK SLAYER
          </motion.h1>

          <motion.p
            className="text-lg md:text-2xl text-gray-300 mb-10 font-mono tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            Meme warfare. No mercy. Join the rebellion.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            {/* 🔥 No more Instagram — internal link only */}
            <Link
              to="/explore"
              className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] transition-all duration-300 transform hover:scale-105"
            >
              Explore the Chaos
            </Link>
            <Link
              to="/reels"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-8 rounded-full backdrop-blur-md transition-all duration-300"
            >
              Watch Reels
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 🧠 Latest Posts Preview */}
      {posts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">Latest Drops</h2>
            <Link to="/explore" className="text-sm text-pink-400 hover:text-pink-300 transition">View All →</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((post) => (
              <Link
                key={post.id}
                to={`/p/${post.id}`}
                className="bg-[#111111] border border-white/5 p-4 rounded-2xl shadow-lg hover:border-pink-500/30 transition-all group overflow-hidden block"
              >
                <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center">
                  {post.url ? (
                    post.url.includes('.mp4') || post.url.includes('video') ? (
                      <video src={post.url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={post.url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )
                  ) : (
                    <div className="text-gray-600 text-xs font-mono">NO MEDIA</div>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-300 truncate">{post.caption}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;