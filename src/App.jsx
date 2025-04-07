import './App.css';
import { motion } from 'framer-motion';

function App() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1600051854520-0fefb2f45a70?auto=format&fit=crop&w=1740&q=80')",
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
          href="https://www.instagram.com/yourusername"
          target="_blank"
          className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-md transition-all"
        >
          Follow the Chaos
        </a>
      </motion.div>
    </div>
  );
}

export default App;
