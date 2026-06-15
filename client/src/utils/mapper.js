// src/utils/mapper.js

export const normalizeData = (rawDataArray, marketplaceName) => {
    return rawDataArray.map((rawRow, index) => {
        // Step 1: Saare keys ko lower case me convert karke object me store karo
        const lowerRow = {};
        for (let k in rawRow) {
            lowerRow[k.toLowerCase().trim()] = rawRow[k];
        }

        // Smart Helper: Case-insensitive search ke liye
        const getVal = (keys) => {
            for (let pk of keys) {
                if (lowerRow[pk.toLowerCase()] !== undefined && lowerRow[pk.toLowerCase()] !== '') {
                    return lowerRow[pk.toLowerCase()];
                }
            }
            return '-'; // Default
        };

        // Numbers extract karne ka helper
        const getNum = (keys) => {
            const val = getVal(keys);
            if (val === '-') return 0;
            return parseFloat(String(val).replace(/,/g, '')) || 0;
        };

        const cleanText = (val) => {
            if (val === '-' || !val) return '-';
            return String(val)
                .replace(/"""/g, '')      // Triple quotes hata dega
                .replace(/"/g, '')        // Baki bache double quotes hata dega
                .replace(/SKU:/gi, '')    // Case-insensitive "SKU:" hata dega
                .replace(/^,|,$/g, '')    // String ke aage ya peechhe comma hoga to hata dega
                .trim();                  // Faltu spaces hata dega
        };

        // --- FLIPKART TAX LOGIC (Sales ke liye) ---
        // NAYA: Exact Flipkart names aur negative values (refunds) ke liye logic update kiya
        const igstKeys = ['igst amount', 'igst'];
        const cgstKeys = ['cgst amount', 'cgst'];
        const sgstKeys = ['sgst amount (or utgst as applicable)', 'sgst amount', 'sgst', 'utgst amount'];

        // Check karte hain ki file me Flipkart wale tax columns hain ya nahi
        const hasFlipkartTax = igstKeys.some(k => lowerRow[k] !== undefined) ||
            cgstKeys.some(k => lowerRow[k] !== undefined) ||
            sgstKeys.some(k => lowerRow[k] !== undefined);

        let finalTax = 0;
        if (hasFlipkartTax) {
            const igst = getNum(igstKeys);
            const cgst = getNum(cgstKeys);
            const sgst = getNum(sgstKeys);
            finalTax = igst + cgst + sgst; // Ye plus/minus automatically karke sum nikalega
        } else {
            // Agar Amazon hai to direct total tax uthao
            finalTax = getNum(['total tax amount', 'total tax', 'tax']);
        }
        // Step 2: Original row ka data waisa hi rakho taaki Settlement Fees delete na ho jaye
        let normalizedRow = { ...rawRow, id: index + 1 };

        // Step 3: Standard Headers inject karo jo aapka OrderTable.jsx aur upload.js samajhta hai// Step 3: Standard Headers inject karo jo aapka OrderTable.jsx aur upload.js samajhta hai
        normalizedRow["Order Id"] = cleanText(getVal(['order id', 'order_item_id', 'settlement_ref_no', 'order item id']));
        normalizedRow["Invoice Date"] = cleanText(getVal(['invoice date', 'order date', 'date/time', 'transaction date', 'date']));
        normalizedRow["SKU"] = cleanText(getVal(['sku', 'seller sku']));
        normalizedRow["Quantity"] = getNum(['quantity', 'qty', 'item quantity']);

        // Final Amounts
        normalizedRow["Invoice Amount"] = getNum(['invoice amount', 'final invoice amount (price after discount+shipping charges)', 'total amount', 'total', 'amount', 'net amount']);
        normalizedRow["Tax Ex Gross"] = getNum(['tax exclusive gross', 'tax ex gross', 'taxable value', 'taxable value (final invoice amount -taxes)']);
        normalizedRow["Total Tax Amount"] = finalTax;

        // Important Columns
        normalizedRow["ASIN"] = cleanText(getVal(['asin', 'fsn'])); // FSN ban jayega ASIN
        normalizedRow["Seller GSTIN"] = cleanText(getVal(['seller gstin', 'gstin']));
        normalizedRow["Ship From Postal Code"] = cleanText(getVal(['ship from postal code', 'ship from pin', 'pincode']));
        normalizedRow["Ship To City"] = cleanText(getVal(['ship to city', 'customer city']));
        normalizedRow["Ship To State"] = cleanText(getVal(['ship to state', 'customer state', "customer's delivery state"]));
        normalizedRow["Item Promo Discount"] = getNum(['item promo discount', 'promo discount', 'discount', 'promotional rebates']);
        normalizedRow["Warehouse Id"] = cleanText(getVal(['warehouse id', 'fulfillment center', 'warehouse']));

        // NAYA: Transaction Type ke liye Flipkart aur Amazon dono ke naam daal diye (With fallback to 'Unknown')
        const rawType = cleanText(getVal(['transaction type', 'event sub type', 'event type', 'type']));
        normalizedRow["Transaction Type"] = (rawType === '-' || !rawType) ? 'Unknown' : rawType;

        return normalizedRow;
    });
};