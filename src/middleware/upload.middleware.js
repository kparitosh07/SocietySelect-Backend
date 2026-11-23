import multer from "multer";
import path from "path";

const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls"]);

const storage = multer.memoryStorage();

export const uploadResultFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("Only .csv, .xlsx, and .xls files are allowed"));
    }
    return cb(null, true);
  },
}).single("file");