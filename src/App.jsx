import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import Login from "./pages/login";
import Signup from "./pages/signup";
import PrivateRoute from "./components/PrivateRoute";
import Feed from "./pages/Feed";
import Legal from "./pages/Legal";
import ForgotPassword from "./pages/ForgotPassword"; // 🔥 Import new page
import IntroLoader from "./components/IntroLoader";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";


function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* 🔥 New Route */}
        <Route path="/legal" element={<Legal />} />

        <Route element={<Layout />}>
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><Upload /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        </Route>
      </Routes>

      <AnimatePresence>
        {showIntro && (
          <IntroLoader 
            key="intro-loader"
            onComplete={() => setShowIntro(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;