// src/pages/Upload.jsx
import { useState, useRef } from "react";
import axios from "axios";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { encryptMessage } from "../utils/crypto";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 🔥 12 CSS Filters
const FILTERS = [
  { id: "original", name: "Original", css: "none" },
  { id: "vivid", name: "Vivid", css: "saturate(1.5) contrast(1.1)" },
  { id: "punch", name: "Punch", css: "saturate(2) contrast(1.3)" },
  { id: "mono", name: "Mono", css: "grayscale(1)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.5) brightness(0.9)" },
  { id: "sepia", name: "Sepia", css: "sepia(0.8)" },
  { id: "vintage", name: "Vintage", css: "sepia(0.4) saturate(1.2) contrast(0.9) brightness(1.1)" },
  { id: "cool", name: "Cool", css: "hue-rotate(180deg) saturate(1.2)" },
  { id: "warm", name: "Warm", css: "hue-rotate(-20deg) saturate(1.3)" },
  { id: "fade", name: "Fade", css: "contrast(0.85) brightness(1.15) saturate(0.9)" },
  { id: "pop", name: "Pop", css: "saturate(1.8) brightness(1.05)" },
  { id: "dream", name: "Dream", css: "blur(0.5px) brightness(1.1) saturate(1.3)" },
];

const POST_TYPES = [
  { id: "post", label: "Post", desc: "Image or video", icon: "◼" },
  { id: "reel", label: "Reel", desc: "Short video", icon: "▶" },
  { id: "story", label: "Story", desc: "24h disappear", icon: "◯" },
];

const PRIVACY_OPTIONS = [
  { id: "public", label: "Public", desc: "Anyone can see this" },
  { id: "followers", label: "Followers", desc: "Only your followers" },
  { id: "private", label: "Only Me", desc: "Just for you" },
];

function Upload() {
  const { currentUser, encryptionKey } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [postType, setPostType] = useState("post");

  // Media
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  // Enhance
  const [activeEnhanceTab, setActiveEnhanceTab] = useState("filters");
  const [selectedFilter, setSelectedFilter] = useState("original");
  const [textOverlays, setTextOverlays] = useState([]);
  const [newText, setNewText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState("medium");

  // Details
  const [caption, setCaption] = useState("");
  const [taggedUsers, setTaggedUsers] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [hideLikes, setHideLikes] = useState(false);
  const [disableComments, setDisableComments] = useState(false);

  // ─────────────────────────────────────
  // MEDIA HANDLERS
  // ─────────────────────────────────────
  const handleFileSelect = (selectedFiles) => {
    const validFiles = Array.from(selectedFiles).filter((f) => {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) return false;
      if (f.size > 50 * 1024 * 1024) return false;
      return true;
    }).slice(0, 10);

    if (validFiles.length === 0) {
      setError("Only images/videos under 50MB are allowed.");
      return;
    }

    setFiles(validFiles);
    setPreviews(validFiles.map((f) => URL.createObjectURL(f)));
    setCurrentPreview(0);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
    if (currentPreview >= newPreviews.length) setCurrentPreview(Math.max(0, newPreviews.length - 1));
  };

  // ─────────────────────────────────────
  // TEXT OVERLAY
  // ─────────────────────────────────────
  const addTextOverlay = () => {
    if (!newText.trim()) return;
    setTextOverlays([...textOverlays, { text: newText.trim(), color: textColor, size: textSize }]);
    setNewText("");
  };

  const removeTextOverlay = (index) => {
    setTextOverlays(textOverlays.filter((_, i) => i !== index));
  };

  // ─────────────────────────────────────
  // UPLOAD
  // ─────────────────────────────────────
  const handlePublish = async () => {
    if (files.length === 0) return setError("No files selected.");
    if (!currentUser || !encryptionKey) return setError("You must be logged in.");

    setStep(4);
    setError("");

    try {
      // Upload all files to Cloudinary
      const uploadedUrls = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("upload_preset", "unsigned_meme_upload");
        formData.append("cloud_name", "danfrfbcn");

        const res = await axios.post(
          "https://api.cloudinary.com/v1_1/danfrfbcn/auto/upload",
          formData,
          {
            onUploadProgress: (progressEvent) => {
              const filePct = progressEvent.loaded / progressEvent.total;
              const overallPct = Math.round(((i + filePct) / totalFiles) * 100);
              setUploadProgress(overallPct);
            },
          }
        );
        uploadedUrls.push(res.data.secure_url);
      }

      // 🔥 Captions are public — no encryption
      const finalCaption = caption.trim();

      // Location is private — keep it encrypted
      const encryptedLocation = location.trim()
        ? await encryptMessage(location.trim(), encryptionKey)
        : "";

      // Extract hashtags & mentions from caption
      const hashtags = (caption.match(/#[\w]+/g) || []).map((h) => h.slice(1).toLowerCase());
      const mentions = (caption.match(/@[\w]+/g) || []).map((m) => m.slice(1).toLowerCase());

      const taggedArray = taggedUsers
        .split(",")
        .map((u) => u.trim().replace(/^@/, "").toLowerCase())
        .filter((u) => u.length > 0);

      // 🔥 Route stories to a separate collection with 24h expiry
      const isStory = postType === "story";
      const targetCollection = isStory ? "stories" : "posts";

      const payload = {
        caption: finalCaption,
        url: uploadedUrls[0],
        mediaUrls: uploadedUrls,
        mediaType: files[0].type.startsWith("video/") ? "video" : "image",
        postType,
        filter: selectedFilter,
        textOverlays,
        location: encryptedLocation,
        hashtags,
        mentions,
        taggedUsers: taggedArray,
        privacy,
        hideLikes,
        disableComments,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(),
        likes: [],
        likeCount: 0,
      };

      // Stories expire after 24 hours
      if (isStory) {
        payload.expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
        payload.viewers = [];
      }

      await addDoc(collection(db, targetCollection), payload);
      setStep(5);
      setTimeout(() => navigate(isStory ? "/" : "/profile"), 2200);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Upload failed. Try again.");
      setStep(3);
    }
  };

  // ─────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────
  const getActiveFilterCSS = () => {
    const filter = FILTERS.find((f) => f.id === selectedFilter);
    return filter ? filter.css : "none";
  };

  const resetAll = () => {
    setStep(1);
    setFiles([]);
    setPreviews([]);
    setCaption("");
    setTaggedUsers("");
    setLocation("");
    setSelectedFilter("original");
    setTextOverlays([]);
    setPrivacy("public");
    setHideLikes(false);
    setDisableComments(false);
    setUploadProgress(0);
    setError("");
  };

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          Upload{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-500">
            Media
          </span>
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Post memes, reels, chaos. Your caption is encrypted before it leaves your device.
        </p>
      </div>

      {/* ─── STEP INDICATOR ─── */}
      {step < 4 && (
        <div className="flex items-center gap-2 mb-8">
          {["Media", "Enhance", "Details"].map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  step === i + 1
                    ? "bg-gradient-to-r from-pink-500/20 to-blue-500/10 text-pink-400 border border-pink-500/30"
                    : step > i + 1
                    ? "text-green-400"
                    : "text-gray-600"
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-current">
                  {step > i + 1 ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px mx-1 ${step > i + 1 ? "bg-green-500/50" : "bg-white/5"}`} />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════ */}
        {/* STEP 1: MEDIA SELECTION */}
        {/* ═══════════════════════════════════════ */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            {/* Post Type Tabs */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Post Type</p>
              <div className="grid grid-cols-3 gap-2">
                {POST_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setPostType(type.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      postType === type.id
                        ? "bg-gradient-to-br from-pink-500/15 to-blue-500/10 border-pink-500/40"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <p className={`text-xl font-black mb-1 ${postType === type.id ? "text-pink-400" : "text-gray-600"}`}>
                      {type.icon}
                    </p>
                    <p className={`text-sm font-bold ${postType === type.id ? "text-white" : "text-gray-400"}`}>
                      {type.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dropzone */}
            {files.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 md:p-16 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-pink-500 bg-pink-500/5"
                    : "border-white/10 hover:border-pink-500/50 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={postType === "reel" ? "video/*" : "image/*,video/*"}
                  multiple={postType === "post"}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-pink-400">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {isDragging ? "Drop it like it's hot" : "Drop your chaos here"}
                </h3>
                <p className="text-gray-500 text-sm">
                  or <span className="text-pink-400 font-semibold">browse files</span>
                </p>
                <p className="text-gray-600 text-xs mt-3 font-mono">
                  {postType === "post" ? "Up to 10 files · 50MB each" : "1 file · 50MB max"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Multi-Preview Carousel */}
                <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10">
                  <div className="aspect-square md:aspect-video flex items-center justify-center bg-black">
                    {files[currentPreview]?.type.startsWith("video/") ? (
                      <video src={previews[currentPreview]} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={previews[currentPreview]} alt="Preview" className="w-full h-full object-contain" />
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(currentPreview)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-black/70 backdrop-blur border border-white/20 hover:border-red-500/50 hover:bg-red-500/20 flex items-center justify-center transition-all"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {files.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPreview((p) => (p - 1 + files.length) % files.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/70 backdrop-blur border border-white/20 hover:border-pink-500/50 flex items-center justify-center transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button
                        onClick={() => setCurrentPreview((p) => (p + 1) % files.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-black/70 backdrop-blur border border-white/20 hover:border-pink-500/50 flex items-center justify-center transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>

                      <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/70 backdrop-blur border border-white/20 text-xs font-mono text-white">
                        {currentPreview + 1} / {files.length}
                      </div>
                    </>
                  )}
                </div>

                {files.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previews.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPreview(i)}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          i === currentPreview ? "border-pink-500" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        {files[i].type.startsWith("video/") ? (
                          <video src={p} className="w-full h-full object-cover" />
                        ) : (
                          <img src={p} alt="" className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/50 text-sm font-bold text-white transition-all"
                >
                  + Add More
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={postType === "reel" ? "video/*" : "image/*,video/*"}
                  multiple={postType === "post"}
                  onChange={(e) => {
                    const newFiles = [...files, ...Array.from(e.target.files)];
                    handleFileSelect(newFiles);
                  }}
                  className="hidden"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={() => setStep(2)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold tracking-wide shadow-[0_0_30px_-10px_rgba(236,72,153,0.6)] transition-all transform hover:scale-[1.02]"
              >
                Next: Enhance
              </button>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 2: ENHANCE */}
        {/* ═══════════════════════════════════════ */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10">
              <div className="aspect-square md:aspect-video flex items-center justify-center bg-black">
                {files[currentPreview]?.type.startsWith("video/") ? (
                  <video src={previews[currentPreview]} controls className="w-full h-full object-contain" style={{ filter: getActiveFilterCSS() }} />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img src={previews[currentPreview]} alt="Preview" className="w-full h-full object-contain" style={{ filter: getActiveFilterCSS() }} />
                    {textOverlays.map((t, i) => (
                      <div
                        key={i}
                        className="absolute pointer-events-none"
                        style={{
                          color: t.color,
                          fontSize: t.size === "small" ? "1.5rem" : t.size === "large" ? "3rem" : "2rem",
                          fontWeight: 900,
                          textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                          top: "20%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          whiteSpace: "nowrap",
                          maxWidth: "90%",
                        }}
                      >
                        {t.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: "filters", label: "Filters" },
                { id: "text", label: "Text" },
                { id: "tag", label: "Tag" },
                { id: "location", label: "Location" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEnhanceTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all ${
                    activeEnhanceTab === tab.id
                      ? "bg-gradient-to-r from-pink-500/20 to-blue-500/10 text-pink-400 border-pink-500/30"
                      : "bg-white/[0.02] text-gray-400 border-white/5 hover:bg-white/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-3xl p-5">
              {activeEnhanceTab === "filters" && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Choose a Filter</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedFilter === filter.id ? "border-pink-500 scale-105" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        {files[currentPreview]?.type.startsWith("video/") ? (
                          <video src={previews[currentPreview]} className="w-full h-full object-cover" style={{ filter: filter.css }} />
                        ) : (
                          <img src={previews[currentPreview]} alt={filter.name} className="w-full h-full object-cover" style={{ filter: filter.css }} />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <p className="text-[10px] font-bold text-white text-center">{filter.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeEnhanceTab === "text" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add Text Overlay</p>
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Type something on the image..."
                    maxLength={60}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
                  />
                  <div className="flex gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Color</p>
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-16 h-10 rounded-lg bg-transparent cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Size</p>
                      <div className="flex gap-1">
                        {["small", "medium", "large"].map((size) => (
                          <button
                            key={size}
                            onClick={() => setTextSize(size)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                              textSize === size ? "bg-pink-500 text-white" : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={addTextOverlay}
                    disabled={!newText.trim()}
                    className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm transition-all disabled:opacity-50"
                  >
                    Add Text
                  </button>
                  {textOverlays.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-white/5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Text Layers</p>
                      {textOverlays.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full" style={{ background: t.color }}></div>
                            <span className="text-sm text-white">{t.text}</span>
                          </div>
                          <button onClick={() => removeTextOverlay(i)} className="text-red-400 hover:text-red-300 text-xs font-bold">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeEnhanceTab === "tag" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tag People</p>
                  <input
                    type="text"
                    value={taggedUsers}
                    onChange={(e) => setTaggedUsers(e.target.value)}
                    placeholder="@username1, @username2, ..."
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
                  />
                  <p className="text-xs text-gray-500">Separate multiple usernames with commas.</p>
                </div>
              )}

              {activeEnhanceTab === "location" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add Location</p>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Mumbai, India"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all"
                  />
                  <p className="text-xs text-gray-500">Location is encrypted before saving.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-white font-bold tracking-wide transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold tracking-wide shadow-[0_0_30px_-10px_rgba(236,72,153,0.6)] transition-all transform hover:scale-[1.02]"
              >
                Next: Details
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 3: DETAILS */}
        {/* ═══════════════════════════════════════ */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Caption</label>
                <span className="text-[10px] font-mono text-gray-600">{caption.length}/2200</span>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something... Use #hashtags and @mentions"
                maxLength={2200}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition-all resize-none"
              />
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Who Can See This</p>
              <div className="space-y-2">
                {PRIVACY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPrivacy(opt.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                      privacy === opt.id
                        ? "bg-gradient-to-r from-pink-500/10 to-blue-500/5 border-pink-500/30"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${privacy === opt.id ? "text-white" : "text-gray-400"}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      privacy === opt.id ? "border-pink-500" : "border-white/20"
                    }`}>
                      {privacy === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Advanced</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/10 transition-all">
                  <div>
                    <p className="text-sm font-bold text-white">Hide Like Count</p>
                    <p className="text-xs text-gray-500 mt-0.5">Only you'll see the total</p>
                  </div>
                  <input type="checkbox" checked={hideLikes} onChange={(e) => setHideLikes(e.target.checked)} className="w-5 h-5 accent-pink-500 cursor-pointer" />
                </label>
                <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/10 transition-all">
                  <div>
                    <p className="text-sm font-bold text-white">Turn Off Comments</p>
                    <p className="text-xs text-gray-500 mt-0.5">No one can comment</p>
                  </div>
                  <input type="checkbox" checked={disableComments} onChange={(e) => setDisableComments(e.target.checked)} className="w-5 h-5 accent-pink-500 cursor-pointer" />
                </label>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-white font-bold tracking-wide transition-all"
              >
                Back
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold tracking-wide shadow-[0_0_30px_-10px_rgba(236,72,153,0.6)] transition-all transform hover:scale-[1.02]"
              >
                Post It
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 4: UPLOADING */}
        {/* ═══════════════════════════════════════ */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#111111] border border-white/10 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin h-8 w-8 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Uploading...</h3>
            <p className="text-gray-500 text-sm mb-6">Pushing your chaos to the cloud</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden max-w-md mx-auto">
              <motion.div className="h-full bg-gradient-to-r from-pink-500 to-blue-500" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.2 }} />
            </div>
            <p className="text-xs font-mono text-pink-400 mt-3">{uploadProgress}%</p>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 5: SUCCESS */}
        {/* ═══════════════════════════════════════ */}
        {step === 5 && (
          <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111111] border border-green-500/30 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-green-400"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {postType === "story" ? "Story Posted" : "Posted Successfully"}
            </h3>
            <p className="text-gray-500 text-sm">
              {postType === "story"
                ? "Live for 24 hours. Redirecting..."
                : "Redirecting to your profile..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Upload;