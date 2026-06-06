const express = require("express");
const router = express.Router();

const {
    getCompanies,
    getMarketplaces,
    getReportTypes,
    addCompany,
    addMarketplace,
    addReportType,
    uploadFileToDB,
    updateMarketplace,
    deleteMarketplace,
    updateReportType,
    deleteReportType,
    getFileUploads,
    deleteUpload,
    saveMappedData,
    getReconciledOrders
} = require("../../controllers/upload/upload");

const upload = require("../../middleware/multer");

// GET Routes
router.get("/getCompanies", getCompanies);
router.get("/getMarketplaces", getMarketplaces);
router.get("/getReportTypes", getReportTypes);
router.get("/getUploads", getFileUploads);
router.get('/getReconciledOrders', getReconciledOrders)

// POST Routes (Add)
router.post("/addCompany", addCompany);
router.post("/addMarketplace", addMarketplace);
router.post("/addReportType", addReportType);

// PUT Routes (Edit)
router.put("/updateMarketplace/:id", updateMarketplace);
router.put("/updateReportType/:id", updateReportType);

// DELETE Routes
router.delete("/deleteMarketplace/:id", deleteMarketplace);
router.delete("/deleteReportType/:id", deleteReportType);
router.delete("/deleteUpload/:id", deleteUpload);

// Upload Route
router.post("/uploadFile", upload.single("file"), uploadFileToDB);
router.post("/saveMappedData", saveMappedData);

module.exports = router;