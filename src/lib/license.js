// /src/lib/license.js
// Sistema de activación simple por navegador (localStorage) con WebCrypto.
// No expone el serial en claro. Genera un token cifrado verificable.

const STORAGE_KEY = "fp_license_token";
const SERIAL_PLAIN = "Mn232323Mn"; // tu serial
const SECRET = "horacio.dev.sol@gmail.com::vanguardia"; // sal secreta

// Deriva una clave desde SECRET para usar en AES-GCM (no guardamos la clave en claro)
async function deriveKey() {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("FerrePOS-LP"),
      iterations: 120000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSerial(serialText) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(serialText));
  // token = base64(iv|cipher)
  const tokenBytes = new Uint8Array(iv.length + new Uint8Array(cipher).length);
  tokenBytes.set(iv, 0);
  tokenBytes.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...tokenBytes));
}

async function decryptToken(token) {
  try {
    const key = await deriveKey();
    const raw = Uint8Array.from(atob(token), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

export async function isActivated() {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return false;
  const plain = await decryptToken(token);
  return plain === SERIAL_PLAIN;
}

export async function tryActivate(inputSerial) {
  if ((inputSerial || "").trim() !== SERIAL_PLAIN) return false;
  const token = await encryptSerial(SERIAL_PLAIN);
  localStorage.setItem(STORAGE_KEY, token);
  return true;
}

export function clearActivation() {
  localStorage.removeItem(STORAGE_KEY);
}
