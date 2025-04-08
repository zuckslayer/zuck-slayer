import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

function PrivateRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (user === undefined) return null; // loading...

  return user ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
