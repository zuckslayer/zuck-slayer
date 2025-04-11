import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav className="bg-gray-900 py-4 px-6 flex justify-between items-center shadow-md">
      <Link to="/" className="text-pink-500 font-bold text-2xl">
        Zuck Slayer
      </Link>

      <div className="space-x-4 text-white flex items-center">
        <Link to="/feed">Feed</Link>
        <Link to="/">Home</Link>
        {user && <Link to="/upload">Upload</Link>}
        {user && <Link to="/profile">Profile</Link>}

        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-300">Hi, {user.email}</span>
            <button
              onClick={handleLogout}
              className="ml-2 text-red-400 hover:underline"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

