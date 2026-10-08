import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import Login from "./pages/login";
import Signup from "./pages/signup";
import PrivateRoute from "./components/PrivateRoute";
import Legal from "./pages/Legal";
import ForgotPassword from "./pages/ForgotPassword";
import IntroLoader from "./components/IntroLoader";
import Notifications from "./pages/Notifications";
import Search from "./pages/Search";
import Explore from "./pages/Explore";
import Saved from "./pages/Saved";
import Reels from "./pages/Reels";
import StoryViewer from "./components/StoryViewer";
import UserProfile from "./pages/UserProfile";
import Chats from "./pages/Chats";
import ChatThread from "./pages/ChatThread";
import PostDetail from "./pages/PostDetail";
import BlockedUsers from "./pages/BlockedUsers";
import FollowList from "./pages/FollowList";
import Onboarding from "./components/Onboarding";
import FeedbackButton from "./components/FeedbackButton";

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem("zs_intro_played");
  });

  useEffect(() => {
    if (!showIntro) return;
    sessionStorage.setItem("zs_intro_played", "true");
    const timer = setTimeout(() => setShowIntro(false), 3500);
    return () => clearTimeout(timer);
  }, [showIntro]);

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/legal" element={<Legal />} />

        <Route element={<Layout />}>
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
          <Route path="/explore" element={<PrivateRoute><Explore /></PrivateRoute>} />
          <Route path="/saved" element={<PrivateRoute><Saved /></PrivateRoute>} />
          <Route path="/reels" element={<PrivateRoute><Reels /></PrivateRoute>} />
          <Route path="/stories" element={<PrivateRoute><StoryViewer /></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><Upload /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/u/:username" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          <Route path="/chats" element={<PrivateRoute><Chats /></PrivateRoute>} />
          <Route path="/chats/:conversationId" element={<PrivateRoute><ChatThread /></PrivateRoute>} />
          <Route path="/p/:postId" element={<PrivateRoute><PostDetail /></PrivateRoute>} />
          <Route path="/blocked" element={<PrivateRoute><BlockedUsers /></PrivateRoute>} />
          <Route path="/u/:username/followers" element={<PrivateRoute><FollowList /></PrivateRoute>} />
          <Route path="/u/:username/following" element={<PrivateRoute><FollowList /></PrivateRoute>} />

          {/* 🔥 Old /feed route now redirects to Reels */}
          <Route path="/feed" element={<Navigate to="/reels" replace />} />
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

      <Onboarding />
      <FeedbackButton />
    </div>
  );
}

export default App;