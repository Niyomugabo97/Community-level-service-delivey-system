const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function streamUpload(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function cloudinaryUpload(req, res, next) {
  if (!req.file) return next();
  try {
    const result = await streamUpload(req.file.buffer, {
      folder: "leader_profiles",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }]
    });
    req.file.path     = result.secure_url;
    req.file.filename = result.public_id;
    next();
  } catch (err) {
    next(err);
  }
}

upload.cloudinary = (fieldName) => [upload.single(fieldName), cloudinaryUpload];

module.exports = upload;
