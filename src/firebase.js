import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyTvV3fSBkMRBw4L_kDq8Y--bf_lN3L2o",
  authDomain: "zuckslayer-4df1c.firebaseapp.com",
  projectId: "zuckslayer-4df1c",
  storageBucket: "zuckslayer-4df1c.firebasestorage.app",
  messagingSenderId: "518889334248",
  appId: "1:518889334248:web:d0cd8aa21d2fdc8ac7f05dID"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;

export { auth, db };