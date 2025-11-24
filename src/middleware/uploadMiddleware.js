const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Define storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "../public/files"; // default fallback

    if (file.mimetype.startsWith("image/")) folder = "../public/images";
    else if (file.mimetype.startsWith("video/")) folder = "../public/videos";

    const fullPath = path.join(__dirname, folder);
    ensureDirectoryExists(fullPath);
    cb(null, fullPath);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, fileName);
  },
});

// File filter (optional but recommended)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/png", "image/jpg",
    "video/mp4", "video/mkv", "video/webm",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"), false);
  }
  cb(null, true);
};

// Set limits (optional)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

module.exports = upload;