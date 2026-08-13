import express from "express"
import cors from "cors"
import path from "path"
import { initEncryption, isEncryptionEnabled } from "./encryption"
import { getDb, closeDb } from "./db"
import routes from "./routes"
import authRoutes from "./routes-auth"
import adminRoutes from "./routes-admin"

const app = express()
const PORT = parseInt(process.env.PORT || "3001", 10)

// When deployed behind a reverse proxy (nginx/caddy), set TRUST_PROXY=1 (or true)
// so req.ip resolves the real client IP from X-Forwarded-For.
const trustProxy = process.env.TRUST_PROXY
if (trustProxy) {
  app.set("trust proxy", trustProxy === "true" ? true : Number(trustProxy) || 1)
}

// Middleware
app.use(cors())
app.use(express.json())

// Serve frontend static files in production
const distPath = path.resolve(process.cwd(), "dist")
app.use(express.static(distPath))

// API routes
app.use("/api", routes)
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)

// Fallback to index.html for SPA routing (Express 5 catch-all)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.join(distPath, "index.html"))
  } else {
    next()
  }
})

// Initialize
const password = process.env.DB_PASSWORD
if (password) {
  initEncryption(password)
  console.log("🔐 Database encryption enabled")
}

// Initialize DB
getDb()
console.log(isEncryptionEnabled() ? "📀 SQLite (encrypted) at: " + (process.env.DB_PATH || "./data/todo.db") : "📀 SQLite at: " + (process.env.DB_PATH || "./data/todo.db"))

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

// Graceful shutdown
process.on("SIGINT", () => {
  closeDb()
  process.exit(0)
})
process.on("SIGTERM", () => {
  closeDb()
  process.exit(0)
})
