const path = require("path");
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config({ path: path.join(process.argv[2], ".env") });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log("database:", db.databaseName, "| collection: issues");
  const rows = await db.collection("issues").find({}).sort({ createdAt: 1 }).toArray();
  console.log("total issue documents:", rows.length, "\n");
  for (const r of rows) {
    console.log("id            :", r.id);
    console.log("title         :", r.title);
    console.log("location      :", JSON.stringify(r.location));
    console.log("area/city/state:", JSON.stringify([r.area ?? null, r.city ?? null, r.state ?? null]));
    console.log("lat/lon       :", r.latitude, "/", r.longitude);
    console.log("locationSource:", JSON.stringify(r.locationSource ?? null));
    console.log("reporter      :", JSON.stringify(r.reporter ?? null), "| reportedBy:", r.reportedBy);
    console.log("image         :", r.image);
    console.log("createdAt     :", r.createdAt);
    console.log("---");
  }
  const hit = await db.collection("issues").countDocuments({ location: /test nagar/i });
  console.log('documents matching /test nagar/i in "location":', hit);
  const anyField = await db.collection("issues").find({ $or: [
    { location: /test nagar/i }, { area: /test nagar/i }, { title: /test nagar/i },
    { description: /test nagar/i }, { city: /test nagar/i },
  ]}).project({ id:1, location:1, title:1 }).toArray();
  console.log("matches across title/location/area/city/description:", JSON.stringify(anyField, null, 2));
  await mongoose.disconnect();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
