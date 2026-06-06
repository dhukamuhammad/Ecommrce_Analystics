const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // File system module ko import karein folder create karne ke liye

const {
    // ... aapke purane imports
    uploadFileToDB
} = require("../controllers/upload/upload");

// --- 1. Client ke public folder ka path set karein ---
// Dhyan dein: Agar aapka ye file server/middleware ya server/routes ke andar hai, 
// toh ../../ karke hum pehle server folder se bahar ayenge, fir client mein jayenge.
const uploadDirectory = path.join(__dirname, "../../client/public/upload");

// --- 2. Agar folder nahi hai toh automatically create kar lein ---
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ab yahan hum dynamically banaya hua path pass kar rahe hain
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        // 1. File ka original extension nikalna (jaise .csv ya .xlsx)
        const ext = path.extname(file.originalname);

        // 2. Original file ka naam bina extension ke nikalna (jaise 'abcd.csv' se 'abcd')
        const originalBaseName = path.parse(file.originalname).name;

        // (Optional) Original naam mein agar space ho toh usko dash '-' se replace kar dena accha rehta hai
        const cleanBaseName = originalBaseName.replace(/\s+/g, '-');

        // 3. Unique suffix banana taaki same naam ki file overwrite na ho
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

        // 4. Final format: OriginalName-UniqueId.extension (e.g., abcd-1700000000-12345.csv)
        cb(null, cleanBaseName + "-" + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;