import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Check if username is already taken
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const existingUsers = await getDocs(usernameQuery);

      if (!existingUsers.empty) {
        setError("Username already taken. Try another one.");
        return;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Add user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        username,
        followers: [],
        following: [],
      });

      alert("Signup successful!");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto text-white">
      <h2 className="text-3xl mb-4 font-bold">Signup</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 rounded text-black"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 rounded text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-400">{error}</p>}
        <button type="submit" className="bg-pink-600 px-4 py-2 rounded">
          Sign Up
        </button>
      </form>

      {/* Terms notice */}
      <p className="text-sm text-gray-400 mt-4">
        By signing up, you agree to our{" "}
        <Link to="/legal" className="underline text-pink-400 hover:text-pink-300">
          Terms & Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default Signup;


