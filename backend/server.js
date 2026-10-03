const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
require("dotenv").config({ path: path.join(__dirname, ".env") });

if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
  if (servers.length) {
    try {
      dns.setServers(servers);
      console.log(`DNS servers set to: ${JSON.stringify(servers)}`);
    } catch (error) {
      console.error(`Invalid DNS_SERVERS "${process.env.DNS_SERVERS}": ${error.message}`);
    }
  }
}

const issueRoutes = require("./routes/issueRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "https://civiclens-rho.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error("Origin is not allowed by CivicLens CORS."));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api", issueRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ service: "CivicLens API", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ success: false, error: "Request body must be valid JSON." });
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, error: "Image size must be 5MB or less." });
  }
  if (error.message?.startsWith("Upload a JPG")) {
    return res.status(400).json({ success: false, error: error.message });
  }
  console.error("CivicLens request failed:", error.message);
  res.status(500).json({ success: false, error: "The server could not complete the request." });
});

const server = app.listen(PORT, { exclusive: true }, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other CivicLens backend process, then start this one.`);
  } else {
    console.error(`Server failed to start: ${error.message}`);
  }
  process.exit(1);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. API requests will return 503 until the connection recovers.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});

async function connectMongo() {
  if (!mongoUri) {
    console.error("MongoDB connection failed: MONGODB_URI is not configured.");
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 7000 });
    console.log("MongoDB connected");
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message.replace(mongoUri, "[redacted]")}`);
    const retry = setTimeout(connectMongo, 10000);
    retry.unref();
  }
}

connectMongo();