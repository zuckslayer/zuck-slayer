import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Create a notification for another user.
 * Skips if the actor and recipient are the same person.
 */
export const createNotification = async ({
  recipientId,
  actorId,
  actorUsername,
  actorPhoto,
  type,
  postId = "",
  postPreviewUrl = "",
  text = "",
}) => {
  // Don't notify yourself
  if (!recipientId || !actorId || recipientId === actorId) return;

  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      actorId,
      actorUsername: actorUsername || "user",
      actorPhoto: actorPhoto || "",
      type, // "like" | "comment" | "follow" | "mention"
      postId,
      postPreviewUrl,
      text,
      read: false,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};