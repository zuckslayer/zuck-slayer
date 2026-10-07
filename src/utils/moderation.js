import { db } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Block a user. Adds a doc under users/{me}/blocked/{them}.
 */
export const blockUser = async (myUid, theirUid) => {
  if (!myUid || !theirUid) return;
  await setDoc(doc(db, "users", myUid, "blocked", theirUid), {
    blockedUid: theirUid,
    blockedAt: serverTimestamp(),
    blockedAtMs: Date.now(),
  });
};

/**
 * Unblock a user.
 */
export const unblockUser = async (myUid, theirUid) => {
  if (!myUid || !theirUid) return;
  await deleteDoc(doc(db, "users", myUid, "blocked", theirUid));
};

/**
 * Check if I have blocked someone.
 */
export const haveIBlocked = async (myUid, theirUid) => {
  if (!myUid || !theirUid) return false;
  const snap = await getDoc(doc(db, "users", myUid, "blocked", theirUid));
  return snap.exists();
};

/**
 * Get a Set of UIDs I've blocked. Used to filter feeds, search, stories, DMs.
 */
export const getBlockedIds = async (myUid) => {
  if (!myUid) return new Set();
  try {
    const snap = await getDocs(collection(db, "users", myUid, "blocked"));
    return new Set(snap.docs.map((d) => d.id));
  } catch (err) {
    console.error("Failed to fetch blocked IDs:", err);
    return new Set();
  }
};

/**
 * Report content.
 */
export const reportContent = async ({
  reporterId,
  contentType, // "post" | "comment" | "user" | "message" | "story"
  contentId,
  reportedUserId,
  reason,
  details = "",
}) => {
  if (!reporterId) return;
  await addDoc(collection(db, "reports"), {
    reporterId,
    contentType,
    contentId,
    reportedUserId: reportedUserId || "",
    reason,
    details: details.slice(0, 500),
    status: "pending",
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
};