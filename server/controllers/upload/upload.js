const db = require("../../config/db");
const { successResponse, errorResponse } = require("../../utils/responseFormatter");
const fs = require("fs");
const path = require("path");

const getCompanies = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM companies");
        // Using successResponse helper
        return successResponse(res, 200, "Companies fetched successfully", rows);

    } catch (error) {
        console.log(error);
        // Using errorResponse helper
        return errorResponse(res, 500, "Failed to fetch companies", error.message);
    }
};

const getMarketplaces = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM marketplaces");
        return successResponse(res, 200, "Marketplaces fetched successfully", rows);

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to fetch marketplaces", error.message);
    }
};

const getReportTypes = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM report_types");
        return successResponse(res, 200, "Report Types fetched successfully", rows);

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to fetch report types", error.message);
    }
};

const addCompany = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return errorResponse(res, 400, "Company name is required");
        }

        await db.query(
            "INSERT INTO companies(name) VALUES(?)",
            [name]
        );

        return successResponse(res, 201, "Company Added successfully");

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to add company", error.message);
    }
};

const addMarketplace = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return errorResponse(res, 400, "Marketplace name is required");
        }

        await db.query(
            "INSERT INTO marketplaces(name) VALUES(?)",
            [name]
        );

        return successResponse(res, 201, "Marketplace Added successfully");

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to add marketplace", error.message);
    }
};

const addReportType = async (req, res) => {
    try {
        const { marketplace_id, name } = req.body;

        if (!marketplace_id || !name) {
            return errorResponse(res, 400, "Marketplace ID and Report Type name are required");
        }

        await db.query(
            "INSERT INTO report_types(marketplace_id, name) VALUES(?, ?)",
            [marketplace_id, name]
        );

        return successResponse(res, 201, "Report Type Added successfully");

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to add report type", error.message);
    }
};


const updateMarketplace = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return errorResponse(res, 400, "Marketplace name is required");
        await db.query("UPDATE marketplaces SET name = ? WHERE id = ?", [name, id]);
        return successResponse(res, 200, "Marketplace updated successfully");
    } catch (error) {
        return errorResponse(res, 500, "Failed to update marketplace", error.message);
    }
};

const deleteMarketplace = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM marketplaces WHERE id = ?", [id]);
        return successResponse(res, 200, "Marketplace deleted successfully");
    } catch (error) {
        return errorResponse(res, 500, "Failed to delete marketplace", error.message);
    }
};

const updateReportType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return errorResponse(res, 400, "Report Type name is required");
        await db.query("UPDATE report_types SET name = ? WHERE id = ?", [name, id]);
        return successResponse(res, 200, "Report Type updated successfully");
    } catch (error) {
        return errorResponse(res, 500, "Failed to update report type", error.message);
    }
};

const deleteReportType = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM report_types WHERE id = ?", [id]);
        return successResponse(res, 200, "Report Type deleted successfully");
    } catch (error) {
        return errorResponse(res, 500, "Failed to delete report type", error.message);
    }
};

const uploadFileToDB = async (req, res) => {
    try {
        const { marketplace_id, report_type_id } = req.body;
        if (!req.file) return errorResponse(res, 400, "Please upload a file");
        if (!marketplace_id || !report_type_id) return errorResponse(res, 400, "Marketplace ID and Report Type ID are required");

        const stored_file = req.file.filename;

        // Query chalane ke baad hum result ko variable mein store karenge
        const [result] = await db.query(
            "INSERT INTO uploads (marketplace_id, report_type_id, stored_file) VALUES (?, ?, ?)",
            [marketplace_id, report_type_id, stored_file]
        );

        // Naya Change: Frontend ko insertId (upload_id) bhejenge
        const responseData = {
            fileName: stored_file,
            uploadId: result.insertId // Ye ID database mein data link karne ke kaam aayegi
        };
        return successResponse(res, 200, "File uploaded and saved to database successfully", responseData);

    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to upload file", error.message);
    }
};

// ==========================================
// HELPER FUNCTIONS (Ye saveMappedData ke upar hone chahiye)
// ==========================================

const formatDateForDB = (dateString) => {
    if (!dateString || dateString === '-') return null;
    try {
        if (dateString.includes('-') || dateString.includes('/')) {
            const separator = dateString.includes('-') ? '-' : '/';
            const parts = dateString.split(' ')[0].split(separator);
            if (parts.length === 3) {
                if (parts[0].length <= 2) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
        }
        return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
};

const findValue = (obj, possibleKeys) => {
    const lowerObj = {};
    for (let k in obj) {
        lowerObj[k.toLowerCase().trim()] = obj[k];
    }
    for (let pk of possibleKeys) {
        if (lowerObj[pk.toLowerCase()] !== undefined && lowerObj[pk.toLowerCase()] !== '') {
            return lowerObj[pk.toLowerCase()];
        }
    }
    return null;
};

// Ye raha apka missing cleanId function
const cleanId = (id) => {
    if (!id || id === '-') return '-';
    return id.toString().replace(/[^a-zA-Z0-9-]/g, '');
};

// Ye raha apka missing cleanAmount function
const cleanAmount = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/,/g, '').trim()) || 0;
};

// Batch split karne ka function
const chunkArray = (array, size) => {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
};


// ==========================================
// MAIN FUNCTION: saveMappedData
// ==========================================
// --- UPDATE 1: saveMappedData FUNCTION ---
const saveMappedData = async (req, res) => {
    try {
        const { uploadId, reportType, orders } = req.body;

        if (!orders || orders.length === 0) return errorResponse(res, 400, "No data to save");
        const BATCH_SIZE = 500;

        if (reportType === 'sales') {
            const values = orders.map(order => [
                uploadId,
                findValue(order, ['seller gstin', 'gstin']) || '-',
                formatDateForDB(findValue(order, ['invoice date', 'order date'])),
                cleanId(findValue(order, ['order id', 'order_item_id'])),
                findValue(order, ['quantity', 'qty']) || 0,
                findValue(order, ['item description', 'product name', 'description']) || '-',
                findValue(order, ['asin', 'fsn']) || '-',
                findValue(order, ['sku']) || '-',
                findValue(order, ['ship from postal code', 'pincode', 'ship from pin']) || '-',
                findValue(order, ['ship to city', 'customer city']) || '-',
                findValue(order, ['ship to state', 'customer state']) || '-',
                cleanAmount(findValue(order, ['invoice amount', 'total amount'])),
                cleanAmount(findValue(order, ['tax exclusive gross', 'taxable value'])),
                cleanAmount(findValue(order, ['total tax amount', 'tax'])),
                cleanAmount(findValue(order, ['item promo discount', 'discount', 'promo discount'])),
                findValue(order, ['warehouse id', 'fulfillment center']) || '-'
            ]);

            const query = `
                INSERT INTO sales_orders (
                    upload_id, seller_gstin, invoice_date, order_id, quantity, item_description, 
                    asin, sku, ship_from_pin, ship_to_city, ship_to_state, 
                    invoice_amount, tax_ex_gross, total_tax_amount, promo_discount, warehouse_id
                ) VALUES ?
            `;
            const chunks = chunkArray(values, BATCH_SIZE);
            for (let chunk of chunks) await db.query(query, [chunk]);
        }

        // --- NAYA SETTLEMENT LOGIC (Nayi Columns Ke Sath) ---
        else if (reportType === 'settlement') {
            const values = orders.map(order => {
                const tDate = findValue(order, ['date/time', 'transaction date', 'date', 'invoice date']);
                const oId = findValue(order, ['order id', 'order_id']);
                const amt = findValue(order, ['total', 'amount', 'net amount']);

                // Nayi columns ko excel header se map karna
                // Nayi columns ko excel header se map karna
                const totalSalesTax = findValue(order, [
                    'total sales tax liable(gst before adjusting tcs)', // Exact match (bina space ke bracket)
                    'total sales tax liable (gst before adjusting tcs)', // Agar bracket se pehle space ho
                    'total sales tax liable',
                    'gst before adjusting tcs',
                    'total sales tax'
                ]); const tcsCgst = findValue(order, ['tcs-cgst', 'tcs cgst']);
                const tcsSgst = findValue(order, ['tcs-sgst', 'tcs sgst']);
                const tcsIgst = findValue(order, ['tcs-igst', 'tcs igst']);
                const tds = findValue(order, ['tds', 'section 194-o', '194-o', 'tds (section 194-o)']);
                const sellingFees = findValue(order, ['selling fees', 'selling fee', 'commission']);
                const fbaFees = findValue(order, ['fba fees', 'fba fee']);
                const otherFees = findValue(order, ['other transaction fees', 'other fees']);

                return [
                    uploadId,
                    formatDateForDB(tDate),
                    cleanId(oId),
                    cleanAmount(amt),
                    cleanAmount(totalSalesTax),
                    cleanAmount(tcsCgst),
                    cleanAmount(tcsSgst),
                    cleanAmount(tcsIgst),
                    cleanAmount(tds),
                    cleanAmount(sellingFees),
                    cleanAmount(fbaFees),
                    cleanAmount(otherFees)
                ];
            });

            const query = `
                INSERT INTO settlement_transactions (
                    upload_id, transaction_date, order_id, amount, 
                    total_sales_tax, tcs_cgst, tcs_sgst, tcs_igst, tds, 
                    selling_fees, fba_fees, other_transaction_fees
                ) VALUES ?
            `;
            const chunks = chunkArray(values, BATCH_SIZE);
            for (let chunk of chunks) await db.query(query, [chunk]);
        }
        else {
            return errorResponse(res, 400, "Invalid report type specified");
        }
        return successResponse(res, 201, "Data successfully saved to database!");
    } catch (error) {
        console.log("Database Save Error:", error);
        return errorResponse(res, 500, "Failed to save data to database", error.message);
    }
};

// --- UPDATE 2: getReconciledOrders FUNCTION (Sari Columns ka SUM hoga idhar) ---
const getReconciledOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.name AS 'Marketplace', 
                s.order_id AS 'Order Id',
                DATE_FORMAT(s.invoice_date, '%d-%m-%Y') AS 'Invoice Date',                
                s.sku AS 'Sku',
                s.quantity AS 'Quantity',
                s.invoice_amount AS 'Invoice Amount',
                s.tax_ex_gross AS 'Tax Exclusive Gross',
                s.total_tax_amount AS 'Total Tax Amount',
                
                /* NAYI COLUMNS KA SUM */
                COALESCE(SUM(t.total_sales_tax), 0) AS 'Sales Tax',
                COALESCE(SUM(t.tcs_cgst), 0) AS 'TCS-CGST',
                COALESCE(SUM(t.tcs_sgst), 0) AS 'TCS-SGST',
                COALESCE(SUM(t.tcs_igst), 0) AS 'TCS-IGST',
                COALESCE(SUM(t.tds), 0) AS 'TDS',
                COALESCE(SUM(t.selling_fees), 0) AS 'Selling Fees',
                COALESCE(SUM(t.fba_fees), 0) AS 'FBA Fees',
                COALESCE(SUM(t.other_transaction_fees), 0) AS 'Other Fees',

                COALESCE(SUM(t.amount), 0) AS 'Settlement Total',
                (COALESCE(SUM(t.amount), 0) - s.invoice_amount) AS 'Difference'
            FROM 
                sales_orders s
            LEFT JOIN 
                uploads u ON s.upload_id = u.id
            LEFT JOIN 
                marketplaces m ON u.marketplace_id = m.id
            LEFT JOIN 
                settlement_transactions t ON TRIM(s.order_id) = TRIM(t.order_id)
            GROUP BY 
                s.id, m.name, s.order_id, s.invoice_date, s.sku, s.quantity, s.invoice_amount, s.tax_ex_gross, s.total_tax_amount
            ORDER BY 
                s.invoice_date DESC
        `;

        const [rows] = await db.query(query);
        return successResponse(res, 200, "Reconciled data fetched successfully", rows);
    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to fetch reconciled data", error.message);
    }
};

const getFileUploads = async (req, res) => {
    try {
        // JOIN lagaya hai taaki IDs ki jagah unke names mil sakein frontend ko
        const [rows] = await db.query(`
            SELECT u.id, u.stored_file, m.name AS marketplace_name, r.name AS report_type_name
            FROM uploads u
            LEFT JOIN marketplaces m ON u.marketplace_id = m.id
            LEFT JOIN report_types r ON u.report_type_id = r.id
            ORDER BY u.id DESC
        `);
        return successResponse(res, 200, "Uploads fetched successfully", rows);
    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to fetch uploads", error.message);
    }
};

const deleteUpload = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Pehle database se file ka naam nikalein
        const [rows] = await db.query("SELECT stored_file FROM uploads WHERE id = ?", [id]);

        if (rows.length > 0) {
            const fileName = rows[0].stored_file;

            // 2. File ka exact path banayein jahan multer ne save kiya tha
            // Controller (server/controllers/upload) se client/public/upload tak ka rasta
            const filePath = path.join(__dirname, "../../../client/public/upload", fileName);

            // 3. Agar file folder me exist karti hai, toh usko delete (unlink) karein
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`File deleted physically: ${fileName}`);
            }
        }

        // 4. Ab database se record (aur CASCADE ki wajah se matched data bhi) delete karein
        await db.query("DELETE FROM uploads WHERE id = ?", [id]);

        return successResponse(res, 200, "File deleted successfully from folder and database");
    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to delete file", error.message);
    }
};

module.exports = {
    getCompanies,
    getMarketplaces,
    getReportTypes,
    addCompany,
    addMarketplace,
    addReportType,
    deleteReportType,
    deleteMarketplace,
    updateReportType,
    updateMarketplace,
    uploadFileToDB,
    getFileUploads,
    deleteUpload,
    saveMappedData,
    getReconciledOrders
};