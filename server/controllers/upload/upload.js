const db = require("../../config/db");
const { successResponse, errorResponse } = require("../../utils/responseFormatter");
const fs = require("fs");
const path = require("path");
const XLSX = require('xlsx');


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

// HELPER FUNCTIONS

const formatDateForDB = (dateString) => {
    // Agar blank ya 00-00-0000 aara hai toh sidha null bhej do taaki DB accept kar le
    if (!dateString || String(dateString).trim() === '-' || String(dateString).includes('0000')) return null;

    try {
        const strDate = String(dateString).trim();

        // 1. Agar Excel ka serial number aa jaye (e.g., 44562)
        if (!isNaN(strDate) && Number(strDate) > 10000) {
            const excelDate = new Date((Number(strDate) - (25567 + 2)) * 86400 * 1000);
            return excelDate.toISOString().split('T')[0];
        }

        // 2. Space se tod do taaki time (09:23:45) hat jaye
        const datePart = strDate.split(' ')[0];

        // 3. Agar hyphen (-) ya slash (/) hai
        if (datePart.includes('-') || datePart.includes('/')) {
            const separator = datePart.includes('-') ? '-' : '/';
            const parts = datePart.split(separator);

            if (parts.length === 3) {
                // CASE A: Agar YYYY-MM-DD (e.g., 2026-01-02) perfect format me hai
                if (parts[0].length === 4) {
                    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                }
                // CASE B: Agar format ulta pulata (DD-MM-YYYY ya MM/DD/YYYY) hai
                else {
                    let part0 = parseInt(parts[0], 10);
                    let part1 = parseInt(parts[1], 10);
                    let year = parts[2];

                    if (year.length === 2) year = '20' + year; // Agar "26" hai toh "2026"

                    let day, month;

                    // SMART DETECTION LOGIC
                    if (part1 > 12) {
                        // Agar beech wala number 12 se bada hai (e.g., 10/31/2026) -> MM/DD/YYYY
                        month = parts[0];
                        day = parts[1];
                    } else if (part0 > 12) {
                        // Agar pehla number 12 se bada hai (e.g., 31/10/2026) -> DD/MM/YYYY
                        day = parts[0];
                        month = parts[1];
                    } else {
                        // Agar dono 12 se chhote hain (e.g., 05-06-2026)
                        // Indian Excel me Hyphen (-) aam taur par DD-MM hota hai, aur Slash (/) MM/DD hota hai
                        if (separator === '/') {
                            month = parts[0];
                            day = parts[1];
                        } else {
                            day = parts[0];
                            month = parts[1];
                        }
                    }

                    // Hamesha MySQL ka ziddi format (YYYY-MM-DD) return karega
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            }
        }

        // 4. Fallback: JavaScript Date Object
        const dateObj = new Date(dateString);
        if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${year}-${month}-${day}`;
        }

        return null;
    } catch (e) {
        console.error("Date format error:", e);
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

// saveMappedData FUNCTION ---
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
                    formatDateForDB(findValue(order, ['invoice date'])),
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

// getReconciledOrders FUNCTION ---
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

            // 2. FIX: Path ko "../../client/public/upload" kar diya hai taaki Multer wale path se match kare
            const filePath = path.join(__dirname, "../../../client/public/upload", fileName);


            console.log("🔍 Attempting to delete file from path:", filePath);

            // 3. Agar file folder me exist karti hai, toh usko delete (unlink) karein
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ File deleted physically: ${fileName}`);
            } else {
                console.log(`❌ File not found in folder (Path galat hai ya file pehle hi ud chuki hai): ${filePath}`);
            }
        }

        // 4. Ab database se record (aur CASCADE ki wajah se matched data bhi) delete karein
        await db.query("DELETE FROM uploads WHERE id = ?", [id]);

        return successResponse(res, 200, "File deleted successfully from folder and database");
    } catch (error) {
        console.log("Delete Error:", error);
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

// Smart SQL Query jo DB level par hi grouping aur math kar degi
// const query = `
//     SELECT 
//         s.sku AS 'SKU',
//         m.name AS 'Marketplace',
//         COUNT(DISTINCT s.order_id) AS 'Total_Orders',
//         SUM(s.quantity) AS 'Total_Quantity',
//         SUM(s.invoice_amount) AS 'Total_Sales_Amount',
//         SUM(s.tax_ex_gross) AS 'Total_Taxable_Value',
//         SUM(s.total_tax_amount) AS 'Total_Tax',

//         -- Settlement Fees ko bhi sum kar rahe hain
//         SUM(COALESCE(t.total_sales_tax, 0)) AS 'Total_Sales_Tax_Deducted',
//         SUM(COALESCE(t.tds, 0) + COALESCE(t.tcs_cgst, 0) + COALESCE(t.tcs_sgst, 0) + COALESCE(t.tcs_igst, 0)) AS 'Total_TDS_TCS',
//         SUM(COALESCE(t.selling_fees, 0) + COALESCE(t.fba_fees, 0) + COALESCE(t.other_transaction_fees, 0) + COALESCE(t.collection_fees, 0)) AS 'Total_Marketplace_Fees',

//         -- Final Payout
//         SUM(COALESCE(t.amount, 0)) AS 'Total_Net_Payout'
//     FROM 
//         sales_orders s
//     LEFT JOIN 
//         uploads u ON s.upload_id = u.id
//     LEFT JOIN 
//         marketplaces m ON u.marketplace_id = m.id
//     LEFT JOIN (
//         -- Pehle settlement ko order_id se sum karenge taaki duplicate values na aayein
//         SELECT 
//             order_id,
//             SUM(total_sales_tax) AS total_sales_tax,
//             SUM(tcs_cgst) AS tcs_cgst, SUM(tcs_sgst) AS tcs_sgst, SUM(tcs_igst) AS tcs_igst, SUM(tds) AS tds,
//             SUM(selling_fees) AS selling_fees, SUM(fba_fees) AS fba_fees, 
//             SUM(other_transaction_fees) AS other_transaction_fees, SUM(collection_fees) AS collection_fees,
//             SUM(amount) AS amount
//         FROM settlement_transactions
//         GROUP BY order_id
//     ) t ON s.order_id = t.order_id 
//     WHERE 
//         s.sku IS NOT NULL AND s.sku != '-' AND s.sku != ''
//     GROUP BY 
//         s.sku, m.name
//     ORDER BY 
//         Total_Quantity DESC
// `;


// --- NAYA: SKU Analytics API ---

const getSkuWiseData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateCondition = "";
        let adSpendDateCondition = ""; // NAYA: Ad Spend file filtering ke liye
        let queryParams = [];

        if (startDate && endDate) {
            // 1. Sales ke liye date condition
            dateCondition = ` AND DATE(s.invoice_date) BETWEEN ? AND ? `;
            queryParams.push(startDate, endDate, startDate, endDate);

            // ========================================================
            // --- NAYA LOGIC: FILE NAME SE MONTH/YEAR NIKALNA ---
            // ========================================================
            const start = new Date(startDate);
            const end = new Date(endDate);

            const monthNamesShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const monthNamesLong = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

            let fileConditions = [];
            // Start date ke mahine ki 1 tareekh se loop shuru karenge
            let currDate = new Date(start.getFullYear(), start.getMonth(), 1);

            while (currDate <= end) {
                const m = currDate.getMonth();
                const y = currDate.getFullYear();

                const shortM = monthNamesShort[m];
                const longM = monthNamesLong[m];

                // SQL Condition: File name me (jan YA january) ho AND (2026) ho
                fileConditions.push(`((LOWER(u.stored_file) LIKE '%${shortM}%' OR LOWER(u.stored_file) LIKE '%${longM}%') AND LOWER(u.stored_file) LIKE '%${y}%')`);

                // Agle mahine pe jao
                currDate.setMonth(currDate.getMonth() + 1);
            }

            if (fileConditions.length > 0) {
                // In conditions ko hum WHERE clause me add kar denge
                adSpendDateCondition = ` AND (${fileConditions.join(" OR ")}) `;
            }
            // ========================================================
        }

        const query = `
            SELECT 
                all_skus.original_sku AS SKU,
                all_skus.marketplace AS Marketplace,
                
                -- Sales Data
                COALESCE(sd.Total_Orders, 0) AS Total_Orders,
                COALESCE(sd.Total_Quantity, 0) AS Total_Quantity,
                COALESCE(sd.Total_Sales_Amount, 0) AS Total_Sales_Amount,
                COALESCE(sd.Shipment_Quantity, 0) AS Shipment_Quantity,
                COALESCE(sd.Refund_Quantity, 0) AS Refund_Quantity,
                COALESCE(sd.Cancel_Quantity, 0) AS Cancel_Quantity,
                COALESCE(sd.Replacement_Quantity, 0) AS Replacement_Quantity,
                COALESCE(sd.Others_Quantity, 0) AS Others_Quantity,
                COALESCE(sd.Total_Settlement_Amount, 0) AS Total_Settlement_Amount,
                
                -- Ad Spend Data
                COALESCE(ad.Total_Ad_Spend, 0) AS Total_Ad_Spend,
                COALESCE(ad.Ad_Orders, 0) AS Ad_Orders,

                -- Organic Orders
                (COALESCE(sd.Total_Orders, 0) - COALESCE(ad.Ad_Orders, 0)) AS Organic_Orders,

                -- NAYA: Promo Discount Data
                COALESCE(sd.Total_Promo_Discount, 0) AS Total_Promo_Discount,
                
                -- NAYA: Storage Fee Data
                COALESCE(sf.Total_Storage_Fee, 0) AS Total_Storage_Fee
                
            FROM (
                -- STEP 1: Master List 
                SELECT 
                    LOWER(TRIM(s.sku)) as sku, 
                    MAX(s.sku) as original_sku, 
                    COALESCE(m.name, 'Unknown') as marketplace 
                FROM sales_orders s
                LEFT JOIN uploads u ON s.upload_id = u.id
                LEFT JOIN marketplaces m ON u.marketplace_id = m.id
                WHERE s.sku IS NOT NULL AND s.sku != '' AND s.sku != '-'
                ${dateCondition} 
                GROUP BY LOWER(TRIM(s.sku)), COALESCE(m.name, 'Unknown')
                
                UNION
                
                SELECT 
                    LOWER(TRIM(CASE WHEN a.sku LIKE 'B0________-%' THEN SUBSTRING(a.sku, 12) ELSE a.sku END)) as sku, 
                    MAX(CASE WHEN a.sku LIKE 'B0________-%' THEN SUBSTRING(a.sku, 12) ELSE a.sku END) as original_sku,
                    COALESCE(m.name, 'Unknown') as marketplace 
                FROM sku_ad_spend a
                LEFT JOIN uploads u ON a.upload_id = u.id
                LEFT JOIN marketplaces m ON u.marketplace_id = m.id
                WHERE a.sku IS NOT NULL AND a.sku != '' AND a.sku != '-'
                ${adSpendDateCondition} 
                GROUP BY LOWER(TRIM(CASE WHEN a.sku LIKE 'B0________-%' THEN SUBSTRING(a.sku, 12) ELSE a.sku END)), COALESCE(m.name, 'Unknown')
            ) AS all_skus
            
            -- STEP 2: Sales Data attach karna
            LEFT JOIN (
                SELECT 
                    LOWER(TRIM(s.sku)) as sku_match,
                    COALESCE(m.name, 'Unknown') AS marketplace,
                    COUNT(DISTINCT s.order_id) AS Total_Orders,
                    SUM(s.quantity) AS Total_Quantity,
                    SUM(s.invoice_amount) AS Total_Sales_Amount,
                    SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) IN ('sale', 'order', 'shipment', 'sales') THEN s.quantity ELSE 0 END) AS Shipment_Quantity,
                    SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) IN ('return', 'refund') THEN s.quantity ELSE 0 END) AS Refund_Quantity,
                    SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) LIKE '%cancel%' THEN s.quantity ELSE 0 END) AS Cancel_Quantity,
                    SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) LIKE '%replacement%' THEN s.quantity ELSE 0 END) AS Replacement_Quantity,
                    SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) NOT IN ('sale', 'order', 'shipment', 'sales', 'return', 'refund') 
                             AND LOWER(TRIM(s.transaction_type)) NOT LIKE '%cancel%' 
                             AND LOWER(TRIM(s.transaction_type)) NOT LIKE '%replacement%' 
                        THEN s.quantity ELSE 0 END) AS Others_Quantity,
                        -- NAYA: Promo Discount sum karna
                    SUM(s.promo_discount) AS Total_Promo_Discount,
                    SUM(COALESCE(t.Net_Settlement, 0)) AS Total_Settlement_Amount
                FROM sales_orders s
                LEFT JOIN uploads u ON s.upload_id = u.id
                LEFT JOIN marketplaces m ON u.marketplace_id = m.id
                LEFT JOIN (
                    SELECT order_id, SUM(amount) AS Net_Settlement 
                    FROM settlement_transactions 
                    GROUP BY order_id
                ) t ON s.order_id = t.order_id
                WHERE s.sku IS NOT NULL AND s.sku != '-' AND s.sku != '' 
                ${dateCondition} 
                GROUP BY LOWER(TRIM(s.sku)), COALESCE(m.name, 'Unknown')
            ) AS sd ON all_skus.sku = sd.sku_match AND all_skus.marketplace = sd.marketplace
            
            -- STEP 3: Ad Spend Data attach karna
            LEFT JOIN (
                SELECT 
                    LOWER(TRIM(CASE WHEN a.sku LIKE 'B0________-%' THEN SUBSTRING(a.sku, 12) ELSE a.sku END)) as sku_match,
                    COALESCE(m.name, 'Unknown') AS marketplace,
                    SUM(a.spend_inr) AS Total_Ad_Spend,
                    SUM(a.orders) AS Ad_Orders
                FROM sku_ad_spend a
                LEFT JOIN uploads u ON a.upload_id = u.id
                LEFT JOIN marketplaces m ON u.marketplace_id = m.id
                WHERE a.sku IS NOT NULL AND a.sku != '' AND a.sku != '-' 
                ${adSpendDateCondition} 
                GROUP BY sku_match, COALESCE(m.name, 'Unknown')
            ) AS ad ON all_skus.sku = ad.sku_match AND all_skus.marketplace = ad.marketplace

            -- ==========================================
            -- NAYA STEP 4: Storage Fee Data ASIN to SKU Map karke attach karna
            -- ==========================================
            LEFT JOIN (
                SELECT 
                    LOWER(TRIM(s_map.sku)) as sku_match,
                    COALESCE(m.name, 'Unknown') AS marketplace,
                    SUM(stf.estimated_monthly_storage_fee) AS Total_Storage_Fee
                FROM asin_storage_fees stf
                LEFT JOIN uploads u ON stf.upload_id = u.id
                LEFT JOIN marketplaces m ON u.marketplace_id = m.id
                -- Ye JOIN ASIN ko match karke sales_orders se SKU nikalega
                LEFT JOIN (
                    SELECT s2.asin, MAX(s2.sku) as sku, u2.marketplace_id 
                    FROM sales_orders s2
                    JOIN uploads u2 ON s2.upload_id = u2.id
                    WHERE s2.asin IS NOT NULL AND s2.asin != ''
                    GROUP BY s2.asin, u2.marketplace_id
                ) s_map ON LOWER(TRIM(stf.asin)) = LOWER(TRIM(s_map.asin)) AND u.marketplace_id = s_map.marketplace_id
                WHERE stf.asin IS NOT NULL AND stf.asin != '' AND s_map.sku IS NOT NULL
                ${adSpendDateCondition} 
                GROUP BY sku_match, COALESCE(m.name, 'Unknown')
            ) AS sf ON all_skus.sku = sf.sku_match AND all_skus.marketplace = sf.marketplace
            -- ==========================================
            
            ORDER BY Total_Quantity DESC, Total_Ad_Spend DESC
        `;

        const [rows] = await db.query(query, queryParams);

        return successResponse(res, 200, "SKU-wise data fetched successfully", rows);
    } catch (error) {
        console.error("Error in getSkuWiseData:", error);
        return errorResponse(res, 500, "Failed to fetch SKU data", error.message);
    }
};

const getSkuTimelineData = async (req, res) => {
    try {
        const { sku, marketplace, startDate, endDate, groupBy } = req.query;

        if (!sku) return errorResponse(res, 400, "SKU is required");

        // ==========================================
        // 1. SALES & REFUNDS TIMELINE (Daily/Weekly/Monthly)
        // ==========================================
        let dateSelector = "DATE(s.invoice_date)";
        if (groupBy === 'week') {
            dateSelector = "CONCAT(YEAR(s.invoice_date), '-W', WEEK(s.invoice_date, 1))";
        } else if (groupBy === 'month') {
            dateSelector = "DATE_FORMAT(s.invoice_date, '%Y-%m')";
        }

        const salesQuery = `
            SELECT 
                ${dateSelector} AS time_period,
                MIN(DATE(s.invoice_date)) AS exact_date,
                SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) IN ('sale', 'order', 'shipment', 'sales') THEN s.quantity ELSE 0 END) AS Total_Quantity,
                SUM(CASE WHEN LOWER(TRIM(s.transaction_type)) IN ('return', 'refund') THEN s.quantity ELSE 0 END) AS Refund_Quantity,
                COUNT(DISTINCT s.order_id) AS Total_Orders,
                SUM(s.invoice_amount) AS Total_Sales
            FROM sales_orders s
            LEFT JOIN uploads u ON s.upload_id = u.id
            LEFT JOIN marketplaces m ON u.marketplace_id = m.id
            WHERE LOWER(TRIM(s.sku)) = LOWER(TRIM(?))
            AND COALESCE(m.name, 'Unknown') = ?
            AND DATE(s.invoice_date) BETWEEN ? AND ?
            GROUP BY time_period
            ORDER BY exact_date ASC
        `;
        const [salesRows] = await db.query(salesQuery, [sku, marketplace, startDate, endDate]);

        // ==========================================
        // 2. AD SPEND TIMELINE (Purely Monthly)
        // ==========================================
        const adQuery = `
            SELECT u.stored_file, SUM(a.spend_inr) as Total_Ad_Spend
            FROM sku_ad_spend a
            LEFT JOIN uploads u ON a.upload_id = u.id
            LEFT JOIN marketplaces m ON u.marketplace_id = m.id
            WHERE LOWER(TRIM(CASE WHEN a.sku LIKE 'B0________-%' THEN SUBSTRING(a.sku, 12) ELSE a.sku END)) = LOWER(TRIM(?))
            AND COALESCE(m.name, 'Unknown') = ?
            GROUP BY u.stored_file
        `;
        const [adRows] = await db.query(adQuery, [sku, marketplace]);

        const adSpendMonthly = {};
        const monthsStr = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

        adRows.forEach(row => {
            const fileLower = String(row.stored_file).toLowerCase();
            let matchedMonth = null, matchedYear = null;

            monthsStr.forEach((m, idx) => {
                if (fileLower.includes(m) || fileLower.includes(monthsStr[idx] + 'uary') || fileLower.includes(monthsStr[idx] + 'ember')) {
                    matchedMonth = String(idx + 1).padStart(2, '0');
                }
            });

            const yearMatch = fileLower.match(/(20\d{2})/);
            if (yearMatch) matchedYear = yearMatch[1];
            else {
                const shortYear = fileLower.match(/(?:-|_| )(\d{2})(?:\.|\s|$)/);
                if (shortYear) matchedYear = "20" + shortYear[1];
            }

            if (matchedMonth && matchedYear) {
                const key = `${matchedYear}-${matchedMonth}`;
                adSpendMonthly[key] = (adSpendMonthly[key] || 0) + Number(row.Total_Ad_Spend);
            }
        });

        const startObj = new Date(startDate);
        const endObj = new Date(endDate);
        const finalAdSpendData = Object.keys(adSpendMonthly)
            .sort()
            .map(key => ({ month_year: key, Total_Ad_Spend: adSpendMonthly[key] }))
            .filter(item => {
                // Filter only selected months
                const [y, m] = item.month_year.split('-');
                const itemDate = new Date(y, m - 1, 1);
                return itemDate >= new Date(startObj.getFullYear(), startObj.getMonth(), 1) && itemDate <= endObj;
            });

        // ==========================================
        // 3. STORAGE FEE TIMELINE (Purely Monthly via ASIN Match)
        // ==========================================
        const storageQuery = `
            SELECT DATE_FORMAT(sf.month_of_charge, '%Y-%m') as month_year, SUM(sf.estimated_monthly_storage_fee) as Total_Storage_Fee
            FROM asin_storage_fees sf
            LEFT JOIN uploads u ON sf.upload_id = u.id
            LEFT JOIN marketplaces m ON u.marketplace_id = m.id
            LEFT JOIN (
                SELECT s2.asin, MAX(s2.sku) as sku, u2.marketplace_id 
                FROM sales_orders s2
                JOIN uploads u2 ON s2.upload_id = u2.id
                WHERE s2.asin IS NOT NULL AND s2.asin != ''
                GROUP BY s2.asin, u2.marketplace_id
            ) s_map ON LOWER(TRIM(sf.asin)) = LOWER(TRIM(s_map.asin)) AND u.marketplace_id = s_map.marketplace_id
            WHERE LOWER(TRIM(s_map.sku)) = LOWER(TRIM(?))
            AND COALESCE(m.name, 'Unknown') = ?
            AND sf.month_of_charge >= DATE_FORMAT(?, '%Y-%m-01') 
            AND sf.month_of_charge <= ?
            GROUP BY month_year
            ORDER BY month_year ASC
        `;
        const [storageRows] = await db.query(storageQuery, [sku, marketplace, startDate, endDate]);

        // Teeno Data ek sath return kar rahe hain
        return successResponse(res, 200, "Timeline fetched", {
            salesData: salesRows,
            adSpendData: finalAdSpendData,
            storageData: storageRows
        });

    } catch (error) {
        console.error("Error in getSkuTimelineData:", error);
        return errorResponse(res, 500, "Failed to fetch timeline data", error.message);
    }
};

const uploadAdSpendReport = async (req, res) => {
    try {
        if (!req.file) return errorResponse(res, 400, "No file uploaded");

        const { marketplace_id, report_type_id } = req.body;
        // NAYA: Multer ne jo clean name save kiya hai wo use karenge
        const fileName = req.file.filename;

        // ==========================================
        // --- NAYA LOGIC: DUPLICATE UPLOAD CHECK ---
        // ==========================================
        const [existingUpload] = await db.query(
            "SELECT id FROM uploads WHERE stored_file = ?",
            [fileName]
        );

        if (existingUpload.length > 0) {
            // Agar file pehle se DB me hai, toh jo nayi file folder me aayi hai usko turant delete kar do
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            console.log("❌ Duplicate file upload blocked:", fileName);
            // Frontend ko error response bhej do
            return errorResponse(res, 400, "Ye file already uploaded hai! Kripya koi nayi file upload karein.");
        }
        // ==========================================

        const uploadQuery = `INSERT INTO uploads (marketplace_id, report_type_id, stored_file) VALUES (?, ?, ?)`;
        // req.file.originalname ki jagah fileName use kiya hai taaki DB aur Folder me naam exact same rahe
        const [uploadResult] = await db.query(uploadQuery, [marketplace_id, report_type_id, fileName]);
        const uploadId = uploadResult.insertId;

        console.log("✅ Uploads table entry done! Upload ID:", uploadId);

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        let rawJsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: "" });

        if (rawJsonData.length === 0) {
            console.log("❌ File khali hai ya galat format me hai");
            // Agar file kharab hai to bhi usko folder se uda do
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return errorResponse(res, 400, "File is empty!");
        }

        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, rawJsonData.length); i++) {
            const rowValues = Object.values(rawJsonData[i]).map(v => String(v).toLowerCase().trim());
            if (rowValues.includes('sku') || rowValues.includes('advertised sku') || rowValues.includes('seller sku')) {
                headerRowIndex = i + 1;
                break;
            }
        }

        if (headerRowIndex > 0) {
            rawJsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: "", range: headerRowIndex });
        }

        const cleanNumber = (val) => {
            if (!val || val === '-') return 0.00;
            return parseFloat(String(val).replace(/,/g, '').replace(/%/g, '')) || 0.00;
        };

        const cleanInt = (val) => {
            if (!val || val === '-') return 0;
            return parseInt(String(val).replace(/,/g, '')) || 0;
        };

        const values = rawJsonData.map(row => {
            const sku = findValue(row, ['sku', 'seller sku', 'advertised sku', 'products']);
            if (!sku || sku === '-') return null;

            return [
                uploadId,
                sku,
                findValue(row, ['sponsored products eligibility', 'eligibility']) || 'Unknown',
                cleanNumber(findValue(row, ['sales(inr)', 'sales (inr)', 'sales', '7 day total sales'])),
                cleanNumber(findValue(row, ['spend(inr)', 'spend (inr)', 'spend'])),
                cleanNumber(findValue(row, ['cpc(inr)', 'cpc (inr)', 'cpc'])),
                cleanNumber(findValue(row, ['roas'])),
                cleanNumber(findValue(row, ['acos'])),
                cleanNumber(findValue(row, ['conversion rate'])),
                cleanNumber(findValue(row, ['ctr'])),
                cleanInt(findValue(row, ['impressions'])),
                cleanInt(findValue(row, ['clicks'])),
                cleanInt(findValue(row, ['orders', '7 day total orders'])),
                cleanInt(findValue(row, ['viewable impressions'])),
                cleanInt(findValue(row, ['ntb orders', 'new to brand orders'])),
                cleanNumber(findValue(row, ['% of orders ntb', 'ntb orders %'])),
                cleanNumber(findValue(row, ['ntb sales(inr)', 'ntb sales (inr)'])),
                cleanNumber(findValue(row, ['% of sales ntb', 'ntb sales %']))
            ];
        }).filter(item => item !== null);

        console.log("✅ Data mapped successfully! Valid SKU Rows found:", values.length);

        if (values.length === 0) {
            console.log("❌ Error: Valid SKU ka data zero ho gaya.");
            // Kachra data wali file bhi folder se uda do
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return errorResponse(res, 400, "No valid SKU data found in file. Please check column headers.");
        }

        const query = `
            INSERT INTO sku_ad_spend (
                upload_id, sku, eligibility_status, 
                sales_inr, spend_inr, cpc_inr, 
                roas, acos, conversion_rate, ctr, 
                impressions, clicks, orders, viewable_impressions, 
                ntb_orders, ntb_orders_percentage, ntb_sales_inr, ntb_sales_percentage
            ) VALUES ?
        `;

        const BATCH_SIZE = 1000;
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            const chunk = values.slice(i, i + BATCH_SIZE);
            await db.query(query, [chunk]);
        }

        console.log("🟢 All data saved in sku_ad_spend table!");
        return successResponse(res, 201, "Ads Spend Data successfully saved to database!");

    } catch (error) {
        console.error("❌ Ad Spend SQL Upload Error:", error);
        // Agar koi error aayi toh file clean kar do
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return errorResponse(res, 500, "Failed to upload Ad Spend data", error.message);
    }
};

const uploadStorageFeeReport = async (req, res) => {
    try {
        // 1. File Check
        if (!req.file) return errorResponse(res, 400, "No file uploaded");

        const { marketplace_id, report_type_id } = req.body;
        const fileName = req.file.filename;

        // ==========================================
        // --- 2. DUPLICATE FILE CHECK ---
        // ==========================================
        const [existingUpload] = await db.query(
            "SELECT id FROM uploads WHERE stored_file = ?",
            [fileName]
        );

        if (existingUpload.length > 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            console.log("❌ Duplicate file upload blocked:", fileName);
            return errorResponse(res, 400, "Ye file already uploaded hai! Kripya koi nayi file upload karein.");
        }

        // ==========================================
        // --- 3. UPLOADS TABLE ENTRY ---
        // ==========================================
        const uploadQuery = `INSERT INTO uploads (marketplace_id, report_type_id, stored_file) VALUES (?, ?, ?)`;
        const [uploadResult] = await db.query(uploadQuery, [marketplace_id, report_type_id, fileName]);
        const uploadId = uploadResult.insertId;

        console.log("✅ Uploads table entry done! Upload ID:", uploadId);

        // ==========================================
        // --- 4. SUPER SMART SHEET DETECTION ---
        // ==========================================
        const workbook = XLSX.readFile(req.file.path);
        let targetSheetName = null;
        let headerRowIndex = -1;
        let rawData2DArray = [];

        // File me saari sheets check karo "ASIN" column ke liye
        for (let sheet of workbook.SheetNames) {
            let tempArray = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "" });

            for (let i = 0; i < Math.min(20, tempArray.length); i++) {
                if (!tempArray[i] || tempArray[i].length === 0) continue;

                const rowValues = tempArray[i].map(v => String(v).toLowerCase().trim());

                // Jahaan ASIN mila, wahi humara target sheet hai
                if (rowValues.includes('asin')) {
                    targetSheetName = sheet;
                    headerRowIndex = i;
                    rawData2DArray = tempArray;
                    break;
                }
            }
            if (targetSheetName) break;
        }

        if (!targetSheetName) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return errorResponse(res, 400, "❌ Is Excel file mein 'ASIN' ka column nahi mila!");
        }

        // ==========================================
        // --- 5. MANUAL JSON CREATION (Bug Bypass) ---
        // ==========================================
        let rawJsonData = [];
        const headers = rawData2DArray[headerRowIndex];

        for (let i = headerRowIndex + 1; i < rawData2DArray.length; i++) {
            const rowData = rawData2DArray[i];

            if (!rowData || rowData.length === 0 || rowData.every(val => val === "" || val === null)) continue;

            let rowObj = {};
            let hasActualData = false;

            for (let j = 0; j < headers.length; j++) {
                // Header ko lower-case aur trim karke object ki key banayenge
                let colName = headers[j] ? String(headers[j]).toLowerCase().trim() : `empty_column_${j}`;
                let cellValue = rowData[j] !== undefined ? rowData[j] : "";
                rowObj[colName] = cellValue;

                if (cellValue !== "") hasActualData = true;
            }

            if (hasActualData) {
                rawJsonData.push(rowObj);
            }
        }

        if (rawJsonData.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return errorResponse(res, 400, "❌ Headers found, but sheet is empty below headers!");
        }

        // ==========================================
        // --- 6. DATA CLEANING & MAPPING ---
        // ==========================================
        const cleanNumber = (val) => {
            if (!val || val === '-') return 0.00;
            return parseFloat(String(val).replace(/,/g, '').replace(/₹/g, '').trim()) || 0.00;
        };

        const values = rawJsonData.map(row => {
            // Helper function to find keys matching user's exact columns
            const getVal = (keys) => {
                for (let k of keys) {
                    if (row[k] !== undefined && row[k] !== '') return row[k];
                }
                return null;
            };

            const asin = getVal(['asin']);
            if (!asin || asin === '-') return null; // ASIN zaroori hai

            // ==========================================
            // --- FIX: MONTH OF CHARGE DATETIME FORMAT ---
            // ==========================================
            let rawMonth = getVal(['month-of-charge', 'month of charge', 'month']);
            let monthOfCharge = null;

            if (rawMonth) {
                // CASE 1: Agar Excel ka raw number aa jaye (Jaise 46023.2292...)
                if (!isNaN(rawMonth) && Number(rawMonth) > 10000) {
                    // Excel number ko JS Date me convert karne ka formula
                    const excelDate = new Date((Number(rawMonth) - 25569) * 86400 * 1000);

                    const year = excelDate.getFullYear();
                    const month = String(excelDate.getMonth() + 1).padStart(2, '0');

                    // Format: YYYY-MM-01 00:00:00
                    monthOfCharge = `${year}-${month}-01 00:00:00`;
                }
                // CASE 2: Agar normal String (2026-01) aaye
                else {
                    rawMonth = String(rawMonth).trim();
                    if (rawMonth.length === 7 && rawMonth.includes('-')) {
                        monthOfCharge = `${rawMonth}-01 00:00:00`;
                    } else {
                        monthOfCharge = rawMonth;
                    }
                }
            }
            // ==========================================

            const avgQtyOnHand = cleanNumber(getVal(['average-quantity-on-hand']));
            const storageFee = cleanNumber(getVal(['estimated-monthly-storage-fee']));
            const currency = getVal(['currency']) || 'INR';

            return [
                uploadId,
                asin,
                monthOfCharge,
                avgQtyOnHand,
                storageFee,
                currency
            ];
        }).filter(item => item !== null);
        console.log("✅ Storage Data mapped successfully! Valid ASIN Rows:", values.length);

        if (values.length === 0) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return errorResponse(res, 400, "No valid ASIN data could be processed.");
        }

        // ==========================================
        // --- 7. SAVE TO DATABASE (BATCH INSERT) ---
        // ==========================================
        const query = `
            INSERT INTO asin_storage_fees (
                upload_id, asin, month_of_charge, average_quantity_on_hand, estimated_monthly_storage_fee, currency
            ) VALUES ?
        `;

        const BATCH_SIZE = 1000;
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
            const chunk = values.slice(i, i + BATCH_SIZE);
            await db.query(query, [chunk]);
        }

        console.log("🟢 All data saved in asin_storage_fees table!");
        return successResponse(res, 201, "Storage Fee Data successfully saved to database!");

    } catch (error) {
        console.error("❌ Storage Fee SQL Upload Error:", error);
        // Error aaye toh folder se file uda do taaki server par kachra jama na ho
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return errorResponse(res, 500, "Failed to upload Storage Fee data", error.message);
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
    getOrderTransactions,
    getSkuWiseData,
    uploadAdSpendReport,
    getSkuTimelineData,
    uploadStorageFeeReport,
};