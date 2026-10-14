import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { generateEncryptionKey } from "../utils/crypto";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const failsafe = setTimeout(() => {
      console.log("Auth Failsafe triggered - forcing render");
      setLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);

        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const newProfile = {
              email: user.email,
              username: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL || "",
              bio: "New to the rebellion.",
              followers: [],
              following: [],
              isPrivate: false,
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          } else {
            const data = userSnap.data();
            setUserProfile(data);
            // 🔥 No auto-reactivate. User must click "Cancel Deletion" in the banner.
          }

          let storedKey = localStorage.getItem(`zuck_key_${user.uid}`);
          if (!storedKey) {
            storedKey = await generateEncryptionKey();
            localStorage.setItem(`zuck_key_${user.uid}`, storedKey);
          }
          setEncryptionKey(storedKey);
        } else {
          setUserProfile(null);
          setEncryptionKey(null);
        }
      } catch (error) {
        console.error("🔥 AuthContext Error:", error);
      } finally {
        clearTimeout(failsafe);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, encryptionKey, loading }}>
      {loading ? (
        <div className="bg-gray-950 min-h-screen text-pink-500 flex flex-col items-center justify-center font-mono">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mb-4"></div>
          <p>Establishing Secure Connection...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);