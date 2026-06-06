// src/utils/mapper.js

export const MARKETPLACE_MAPPING = {
    Amazon: {
        "Seller Gstin": "sellerGstin",
        "Invoice Date": "invoiceDate",
        "Order Id": "orderId",
        "Quantity": "qty",
        "Item Description": "description",
        "Asin": "asin",
        "Sku": "sku",
        "Ship From Postal Code": "shipFromPin",
        "Ship To City": "shipToCity",
        "Ship To State": "shipToState",
        "Invoice Amount": "invoiceAmt",
        "Tax Exclusive Gross": "taxExGross",
        "Total Tax Amount": "totalTax",
        "Item Promo Discount": "promoDiscount",
        "Warehouse Id": "warehouseId"
    },
    Flipkart: {
        "GSTIN": "sellerGstin",
        "Order Date": "invoiceDate",
        "order_item_id": "orderId",
        "Qty": "qty",
        "Product Name": "description",
        "FSN": "asin", 
        "SKU": "sku",
        "Pincode": "shipFromPin",
        "Customer City": "shipToCity",
        "Customer State": "shipToState",
        "Total Amount": "invoiceAmt",
        "Taxable Value": "taxExGross",
        "Tax": "totalTax",
        "Discount": "promoDiscount",
        "Fulfillment Center": "warehouseId"
    },
    // Meesho aur baaki ke liye bhi aage add kar sakte hain
    Meesho: {} 
};

export const normalizeData = (rawDataArray, marketplaceName) => {
    const mapSchema = MARKETPLACE_MAPPING[marketplaceName];

    // Agar mapping schema nahi mila toh default empty bhej do ya original return kar do
    if (!mapSchema) return rawDataArray;

    return rawDataArray.map((rawRow, index) => {
        let normalizedRow = { id: index + 1 }; // Ek unique ID add kar rahe hain table ke liye
        
        Object.keys(mapSchema).forEach(rawKey => {
            const standardKey = mapSchema[rawKey];
            // Agar raw file me wo column hai, toh uski value set karo, warna '-' daal do
            normalizedRow[standardKey] = rawRow[rawKey] !== undefined ? rawRow[rawKey] : '-';
        });

        return normalizedRow;
    });
};