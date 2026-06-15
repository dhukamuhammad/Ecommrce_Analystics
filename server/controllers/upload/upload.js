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


// Ensure uploadDirectory path is correct based on your folder structure
const uploadDirectory = path.join(__dirname, "../../client/public/upload");

const uploadFileToDB = async (req, res) => {
    try {
        const { marketplace_id, report_type_id, report_category, sample_data } = req.body;

        if (!req.file) return errorResponse(res, 400, "Please upload a file");
        if (!marketplace_id || !report_type_id) return errorResponse(res, 400, "Marketplace ID and Report Type ID are required");

        const stored_file = req.file.filename;


        if (req.body.sample_data && report_category) {
            const sampleDataArray = JSON.parse(req.body.sample_data);

            if (sampleDataArray.length > 0) {
                const tableName = report_category === 'sales' ? 'sales_orders' : 'settlement_transactions';

                // 500-500 ke tukdo (chunks) me check karenge taaki server par load na pade
                const BATCH_SIZE = 500;
                let isDuplicateFound = false;
                let duplicateOrderId = "";

                for (let i = 0; i < sampleDataArray.length; i += BATCH_SIZE) {
                    const chunk = sampleDataArray.slice(i, i + BATCH_SIZE);
                    const conditions = [];
                    const values = [];

                    chunk.forEach(item => {
                        if (report_category === 'sales') {
                            conditions.push(`(order_id = ? AND sku = ? AND quantity = ?)`);
                            values.push(item.orderId, item.sku, item.qty);
                        } else {
                            conditions.push(`(order_id = ?)`);
                            values.push(item.orderId);
                        }
                    });

                    const query = `SELECT order_id FROM ${tableName} WHERE ${conditions.join(' OR ')} LIMIT 1`;
                    const [existingOrders] = await db.query(query, values);

                    if (existingOrders.length > 0) {
                        isDuplicateFound = true;
                        duplicateOrderId = existingOrders[0].order_id;
                        break; // Loop wahin rok do
                    }
                }

                if (isDuplicateFound) {
                    const filePath = path.join(uploadDirectory, stored_file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    return errorResponse(res, 400, `Ye exact report (data) system mein pehle se maujood hai! (Found existing order: ${duplicateOrderId})`);
                }
            }
        }
        // ==========================================
        // ==========================================

        // Agar duplicate nahi mila, tabhi database me file ka naam save karo
        const [result] = await db.query(
            "INSERT INTO uploads (marketplace_id, report_type_id, stored_file) VALUES (?, ?, ?)",
            [marketplace_id, report_type_id, stored_file]
        );

        const responseData = {
            fileName: stored_file,
            uploadId: result.insertId
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

// Backend Controller: Updated findValue function
const findValue = (obj, possibleKeys) => {
    if (!obj) return null;

    const lowerObj = {};
    for (let k in obj) {
        // NAYA: Excel ke \n (Enter) aur double spaces ko single space banata hai
        const cleanKey = String(k).toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        lowerObj[cleanKey] = obj[k];
    }

    for (let pk of possibleKeys) {
        const cleanPk = String(pk).toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        if (lowerObj[cleanPk] !== undefined && lowerObj[cleanPk] !== '') {
            return lowerObj[cleanPk];
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

        // ==========================================
        // CASE 1: SALES REPORT (Amazon + Flipkart Supported)
        // ==========================================
        if (reportType === 'sales') {
            const values = orders.map(order => {
                let warehouseVal = findValue(order, ['warehouse id', 'fulfillment center', 'warehouse']);
                if (!warehouseVal || warehouseVal.trim() === '-' || warehouseVal.trim() === '' || warehouseVal.trim().toLowerCase() === 'na') {
                    warehouseVal = 'crasome';
                }

                // Flipkart ka tax calculation if direct total tax is missing
                let totalTaxStr = findValue(order, ['total tax amount', 'tax']);
                if (!totalTaxStr || totalTaxStr === '-') {
                    const igst = parseFloat(findValue(order, ['igst amount', 'igst'])) || 0;
                    const cgst = parseFloat(findValue(order, ['cgst amount', 'cgst'])) || 0;
                    const sgst = parseFloat(findValue(order, ['sgst amount (or utgst as applicable)', 'sgst amount', 'sgst', 'utgst amount'])) || 0;

                    totalTaxStr = (igst + cgst + sgst).toString();
                }

                // NAYA: Extract Buyer Details
                const buyerName = findValue(order, ['buyer name', 'buyer', 'customer name']) || '-';
                const buyerGst = findValue(order, ['customer bill to gstid', 'buyer gst', 'customer gstin', 'buyer gstin']) || '-';

                return [
                    uploadId,
                    findValue(order, ['seller gstin', 'gstin']) || '-',
                    formatDateForDB(findValue(order, ['invoice date', 'order date'])),
                    cleanId(findValue(order, ['order id', 'order_item_id'])),
                    findValue(order, ['transaction type', 'event sub type', 'type']) || 'Unknown',
                    findValue(order, ['quantity', 'qty', 'item quantity']) || 0,
                    findValue(order, ['item description', 'product name', 'description']) || '-',
                    findValue(order, ['asin', 'fsn']) || '-',
                    findValue(order, ['sku']) || '-',
                    findValue(order, ['ship from postal code', 'pincode', 'ship from pin']) || '-',
                    findValue(order, ['ship to city', 'customer city']) || '-',
                    findValue(order, ['ship to state', 'customer state', "customer's delivery state"]) || '-',
                    cleanAmount(findValue(order, ['invoice amount', 'total amount', 'final invoice amount (price after discount+shipping charges)'])),
                    cleanAmount(findValue(order, ['tax exclusive gross', 'taxable value', 'taxable value (final invoice amount -taxes)'])),
                    cleanAmount(totalTaxStr),
                    cleanAmount(findValue(order, ['item promo discount', 'discount', 'promo discount'])),
                    warehouseVal,
                    buyerName, // NAYA
                    buyerGst   // NAYA
                ];
            });

            // NAYA: Query me buyer_name aur buyer_gstin add kiya
            const query = `
                INSERT INTO sales_orders (
                    upload_id, seller_gstin, invoice_date, order_id, transaction_type, quantity, item_description, 
                    asin, sku, ship_from_pin, ship_to_city, ship_to_state, 
                    invoice_amount, tax_ex_gross, total_tax_amount, promo_discount, warehouse_id,
                    buyer_name, buyer_gstin
                ) VALUES ?
            `;
            const chunks = chunkArray(values, BATCH_SIZE);
            for (let chunk of chunks) await db.query(query, [chunk]);
        }
        // CASE 2: SETTLEMENT REPORT (Amazon + Flipkart Supported)
        else if (reportType === 'settlement') {
            const values = orders.map(order => {
                // 1. Date (Added 'payment date')
                const tDate = findValue(order, ['payment date', 'date/time', 'transaction date', 'date', 'invoice date', 'order date']);

                // 2. Order ID
                const oId = findValue(order, ['order id', 'order_id', 'settlement_ref_no']);

                // 3. Net Amount (Added Bank Settlement Value)
                const amt = findValue(order, ['bank settlement value (rs.) = sum(j:r)', 'Bank Settlement Value (Rs.) = SUM(J:R)', 'bank settlement value (rs.)', 'bank settlement value', 'total', 'amount', 'net amount', 'total amount']);

                // 4. Taxes (Added Flipkart Specific TCS/TDS names)
                const totalSalesTax = findValue(order, ['total sales tax liable(gst before adjusting tcs)', 'total sales tax liable (gst before adjusting tcs)', 'total sales tax liable', 'gst before adjusting tcs', 'total sales tax']);
                const tcsCgst = findValue(order, ['tcs-cgst', 'tcs cgst', 'cgst amount', 'cgst']);
                const tcsSgst = findValue(order, ['tcs-sgst', 'tcs sgst', 'sgst amount', 'sgst']);
                const tcsIgst = findValue(order, ['tcs-igst', 'tcs igst', 'igst amount', 'igst', 'tcs (rs.)']); // TCS (Rs.)
                const tds = findValue(order, ['tds (rs.)', 'tds', 'section 194-o', '194-o', 'tds (section 194-o)']); // TDS (Rs.)

                // 5. Commission
                const sellingFees = findValue(order, ['commission (rs.)', 'commission', 'selling fees', 'selling fee', 'marketplace fee']);

                // 6. Shipping + Pick Pack (FBA Fees) - ParseFloat lagaya hai taaki Math(Addition) theek se ho
                const amzFba = parseFloat(cleanAmount(findValue(order, ['fba fees', 'fba fee', 'shipping fee', 'shipping']))) || 0;
                const pickPack = parseFloat(cleanAmount(findValue(order, ['pick and pack fee (rs.)', 'pick and pack fee']))) || 0;
                const flipkartShip = parseFloat(cleanAmount(findValue(order, ['shipping fee (rs.)']))) || 0;
                const reverseShip = parseFloat(cleanAmount(findValue(order, ['reverse shipping fee (rs.)', 'reverse shipping fee']))) || 0;
                const fbaFees = amzFba + pickPack + flipkartShip + reverseShip;

                // 7. Closing Fees (Fixed Fee)
                const otherFees = findValue(order, ['fixed fee (rs.)', 'Fixed Fee  (Rs.)', 'fixed fee', 'other transaction fees', 'other fees']);

                // 8. Collection Fees (New Database Column)
                const collectionFees = findValue(order, ['collection fee (rs.)', 'collection fee']);

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
                    fbaFees, // Ye already number hai upar sum karne ke baad
                    cleanAmount(otherFees),
                    cleanAmount(collectionFees)
                ];
            });

            const query = `
                INSERT INTO settlement_transactions (
                    upload_id, transaction_date, order_id, amount, 
                    total_sales_tax, tcs_cgst, tcs_sgst, tcs_igst, tds, 
                    selling_fees, fba_fees, other_transaction_fees, collection_fees
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

// --- UPDATE 2: getReconciledOrders FUNCTION ---
const getReconciledOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.name AS 'Marketplace', 
                r.name AS 'Report Type',
                s.order_id AS 'Order Id',
                DATE_FORMAT(s.invoice_date, '%d-%m-%Y') AS 'Invoice Date',                
                s.transaction_type AS 'Transaction Type',
                s.sku AS 'Sku',
                s.quantity AS 'Quantity',
                s.invoice_amount AS 'Invoice Amount',
                s.tax_ex_gross AS 'Tax Exclusive Gross',
                s.total_tax_amount AS 'Total Tax Amount',
                
                s.buyer_name AS 'Buyer Name',    
                s.buyer_gstin AS 'Buyer GSTIN', 
                s.warehouse_id AS 'Warehouse ID', 

                COALESCE(t.total_sales_tax, 0) AS 'Sales Tax',
                COALESCE(t.tcs_cgst, 0) AS 'TCS-CGST',
                COALESCE(t.tcs_sgst, 0) AS 'TCS-SGST',
                COALESCE(t.tcs_igst, 0) AS 'TCS-IGST',
                COALESCE(t.tds, 0) AS 'TDS',
                COALESCE(t.selling_fees, 0) AS 'Selling Fees',
                COALESCE(t.fba_fees, 0) AS 'FBA Fees',
                COALESCE(t.other_transaction_fees, 0) AS 'Other Fees',
                COALESCE(t.collection_fees, 0) AS 'Collection Fees', 

                COALESCE(t.amount, 0) AS 'Settlement Total',
                (COALESCE(t.amount, 0) - s.invoice_amount) AS 'Difference'
            FROM 
                sales_orders s
            LEFT JOIN 
                uploads u ON s.upload_id = u.id
            LEFT JOIN 
                marketplaces m ON u.marketplace_id = m.id
            LEFT JOIN 
                report_types r ON u.report_type_id = r.id
            LEFT JOIN (
                SELECT 
                    order_id,
                    SUM(total_sales_tax) AS total_sales_tax,
                    SUM(tcs_cgst) AS tcs_cgst,
                    SUM(tcs_sgst) AS tcs_sgst,
                    SUM(tcs_igst) AS tcs_igst,
                    SUM(tds) AS tds,
                    SUM(selling_fees) AS selling_fees,
                    SUM(fba_fees) AS fba_fees,
                    SUM(other_transaction_fees) AS other_transaction_fees,
                    SUM(collection_fees) AS collection_fees,
                    SUM(amount) AS amount
                FROM settlement_transactions
                GROUP BY order_id
            ) t ON s.order_id = t.order_id 
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

// --- UPDATED FUNCTION: API Crash Fix Ke Sath ---
const getOrderTransactions = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Sales Table se data
        const [sales] = await db.query(`
            SELECT 
                transaction_type AS 'Type', 
                DATE_FORMAT(invoice_date, '%d-%m-%Y') AS 'Date', 
                invoice_amount AS 'Amount', 
                sku AS 'sku', 
                quantity AS 'quantity',
                tax_ex_gross AS 'Taxable',
                total_tax_amount AS 'Tax',
                warehouse_id AS 'Warehouse ID' -- NAYA
            FROM sales_orders WHERE TRIM(order_id) = TRIM(?)
        `, [orderId]);

        // Settlement Table se data (Error Fix: Bad columns ki jagah 0 pass kiya)
        const [settlements] = await db.query(`
            SELECT 
                'Settlement' AS 'Type', 
                DATE_FORMAT(transaction_date, '%d-%m-%Y') AS 'Date', 
                amount AS 'Amount', 
                '-' AS 'sku', 
                0 AS 'quantity',
                0 AS 'product_sales',          
                0 AS 'promotional_rebates', 
                COALESCE(selling_fees, 0) AS 'Commission',
                COALESCE(fba_fees, 0) AS 'ShippingFee',
                COALESCE(other_transaction_fees, 0) AS 'OtherFees',
                COALESCE(tds, 0) AS 'TDS',
                (COALESCE(tcs_cgst, 0) + COALESCE(tcs_sgst, 0) + COALESCE(tcs_igst, 0)) AS 'TCS',
                COALESCE(total_sales_tax, 0) AS 'PlatformTax'
            FROM settlement_transactions WHERE TRIM(order_id) = TRIM(?)
        `, [orderId]);

        const allTransactions = [...sales, ...settlements];
        return successResponse(res, 200, "Transactions fetched successfully", allTransactions);
    } catch (error) {
        console.log(error);
        return errorResponse(res, 500, "Failed to fetch transactions", error.message);
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
    getReconciledOrders,
    getOrderTransactions
};