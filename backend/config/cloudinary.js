const cloudinary = require("cloudinary").v2;
require("dotenv").config();

if (process.env.CLOUDINARY_URL) {
  // Parse cloudinary://api_key:api_secret@cloud_name
  const m = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (m) {
    cloudinary.config({ api_key: m[1], api_secret: m[2], cloud_name: m[3] });
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
  });
}

module.exports = cloudinary;