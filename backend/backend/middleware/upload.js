const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// Store file in memory so we can stream it to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload a buffer directly to Cloudinary and return the result
function streamUpload(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

// Middleware: after multer stores file in req.file.buffer,
// push it to Cloudinary and attach result to req.file
async function cloudinaryUpload(req, res, next) {
  if (!req.file) return next();
  try {
    const result = await streamUpload(req.file.buffer, {
      folder: "home_updates",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"]
    });
    // Mirror the properties that routes already use
    req.file.path     = result.secure_url;   // Cloudinary HTTPS URL
    req.file.filename = result.public_id;    // Cloudinary public_id
    next();
  } catch (err) {
    next(err);
  }
}

// Combined: first multer stores to memory, then we push to Cloudinary
upload.cloudinary = (fieldName) => [upload.single(fieldName), cloudinaryUpload];

module.exports = upload;
