// src/utils/crypto.js

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Helper to convert Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} text - The plaintext to encrypt
 * @param {string} keyString - The base64 encoded encryption key
 * @returns {Promise<string>} - Base64 encoded string containing IV + Ciphertext
 */
export const encryptMessage = async (text, keyString) => {
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  // 1. Import the raw key
  const rawKey = base64ToBuffer(keyString);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // 2. Generate a random Initialization Vector (IV) - NEVER reuse this!
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt the message
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encodedText
  );

  // 4. Combine IV and Ciphertext into a single payload for storage/transit
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bufferToBase64(combined);
};

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param {string} encryptedBase64 - The base64 encoded IV + Ciphertext
 * @param {string} keyString - The base64 encoded encryption key
 * @returns {Promise<string>} - The decrypted plaintext
 */
export const decryptMessage = async (encryptedBase64, keyString) => {
  const combined = base64ToBuffer(encryptedBase64);
  
  // Extract IV (first 12 bytes) and Ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // 1. Import the key
  const rawKey = base64ToBuffer(keyString);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 2. Decrypt the message
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed. The message may have been tampered with.", error);
    return "[Encrypted Message - Unable to decrypt]";
  }
};

/**
 * Generates a new random 256-bit AES key
 * @returns {Promise<string>} Base64 encoded key
 */
export const generateEncryptionKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return bufferToBase64(exported);
};