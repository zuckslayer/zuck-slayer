import { useState } from "react";
import axios from "axios";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";


function Upload() {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_meme_upload");
    formData.append("cloud_name", "danfrfbcn");

    try {
      const res = await axios.post(
        "https://api.cloudinary.com/v1_1/danfrfbcn/auto/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(pct);
          },
        }
      );

      const imageUrl = res.data.secure_url;
      setUrl(imageUrl);
      alert("Upload successful!");

      await addDoc(collection(db, "posts"), {
        caption: caption,
        url: imageUrl,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      alert("Upload successful!");
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 text-center text-white">
      <h2 className="text-3xl font-bold mb-6">Upload Meme or Reel</h2>

      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full"
        />

        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          className="p-2 rounded text-black w-full"
        />

        {progress > 0 && <p>Uploading: {progress}%</p>}

        <button
          type="submit"
          className="bg-pink-600 hover:bg-pink-700 px-6 py-2 rounded font-semibold"
        >
          Upload
        </button>
      </form>

      {url && (
        <div className="mt-6">
          <p className="mb-2 font-medium">Preview:</p>
          {file.type.startsWith("video") ? (
            <video src={url} controls className="max-w-full rounded" />
          ) : (
            <img src={url} alt="Uploaded" className="max-w-full rounded" />
          )}
        </div>
      )}
    </div>
  );
}

export default Upload;
