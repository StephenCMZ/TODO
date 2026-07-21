import crypto from "crypto"

const ALGO = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16

let secretKey: Buffer | null = null

export function initEncryption(password: string) {
  // Derive a 256-bit key from the password using PBKDF2
  const salt = crypto.randomBytes(16)
  // Store salt in env or derive deterministically from password
  // For simplicity, use a fixed salt derived from a hash of the password
  const key = crypto.pbkdf2Sync(password, "todo-app-salt-" + password.slice(0, 4), 100000, 32, "sha256")
  secretKey = key
}

export function isEncryptionEnabled(): boolean {
  return secretKey !== null
}

export function encrypt(plaintext: string): string {
  if (!secretKey) return plaintext
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, secretKey, iv)
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return iv.toString("hex") + ":" + tag + ":" + encrypted
}

export function decrypt(ciphertext: string): string {
  if (!secretKey) return ciphertext
  const parts = ciphertext.split(":")
  if (parts.length !== 3) return ciphertext
  const iv = Buffer.from(parts[0], "hex")
  const tag = Buffer.from(parts[1], "hex")
  const encrypted = parts[2]
  const decipher = crypto.createDecipheriv(ALGO, secretKey, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
