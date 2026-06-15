import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// --- NAYA: Ek common function jo dono jagah (Preview aur DB) data ko unique banayega ---
// src/hooks/useOrderLogic.js (ya jahan bhi ye function hai)

const groupAndDeduplicateOrders = (data) => {
    // =========================================================
    // NAYA LOGIC: Sirf Flipkart Settlement ke Transaction Type ke liye
    // =========================================================
    data.forEach((row) => {
        let isFlipkartSettlement = false;
        let bankSettlementValue = 0;

        // Check karte hain ki kya column me 'bank settlement value' hai (Enter/Space ignore karke)
        for (let k in row) {
            const cleanKey = String(k).toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanKey.includes('bank settlement value')) {
                isFlipkartSettlement = true;
                bankSettlementValue = row[k];
            }
        }

        // Agar ye Flipkart Settlement hai toh Amount ke basis par Type assign kar do
        if (isFlipkartSettlement) {
            const amt = parseFloat(String(bankSettlementValue).replace(/,/g, '')) || 0;
            if (amt > 0) row["Transaction Type"] = "Shipment";
            else if (amt < 0) row["Transaction Type"] = "Refund";
            else row["Transaction Type"] = "Cancel";
        }
    });
    // =========================================================

    // AAPKA ORIGINAL CODE (BINA KISI BHI CHANGE KE)
    const orderGroups = new Map();
    data.forEach((row) => {
        const oid = row["Order Id"] || row["order id"] || row["order_id"];
        if (!oid || oid === "-") {
            orderGroups.set(`temp_${Math.random()}`, [row]);
            return;
        }
        if (!orderGroups.has(oid)) orderGroups.set(oid, []);
        orderGroups.get(oid).push(row);
    });

    const uniqueDataArray = [];
    const manualReviewRows = [];

    orderGroups.forEach((rows, orderId) => {
        if (rows.length === 1) {
            uniqueDataArray.push(rows[0]);
            return;
        }
        const types = rows.map(r => String(r["Transaction Type"] || r["transaction type"] || r["type"] || r["Event Sub Type"] || r["event sub type"] || "").trim().toLowerCase());
        const hasRefund = types.some(t => t.includes("refund") || t.includes("return"));
        const hasShipment = types.some(t => t.includes("shipment") || t.includes("sale") || t.includes("order"));
        const hasCancel = types.some(t => t.includes("cancel") || t.includes("cancellation"));

        let finalType = null;
        if (hasRefund) finalType = "Refund";
        else if (hasShipment) finalType = "Shipment";
        else if (hasCancel) finalType = "Cancel";

        if (finalType) {
            let selectedRow = rows.find(r => {
                const t = String(r["Transaction Type"] || r["transaction type"] || r["Event Sub Type"] || r["event sub type"] || r["type"] || "").trim().toLowerCase();
                if (finalType === "Refund") return t.includes("refund") || t.includes("return");
                if (finalType === "Shipment") return t.includes("shipment") || t.includes("sale") || t.includes("order");
                if (finalType === "Cancel") return t.includes("cancel") || t.includes("cancellation");
                return false;
            }) || rows[0];
            selectedRow.__virtualType = finalType;
            uniqueDataArray.push(selectedRow);
        } else {
            rows.forEach(r => r.__virtualType = "Manual Review");
            manualReviewRows.push(...rows);
        }
    });

    uniqueDataArray.push(...manualReviewRows);
    return uniqueDataArray;
};

export const useOrderLogic = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [rawOrders, setRawOrders] = useState([]); // NAYA: Drawer ke liye raw data store karenge

    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(true);
    const [mode, setMode] = useState('database');

    // --- NAYA STATE: Drawer (Sidebar) ke liye ---
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [dbDrawerTxns, setDbDrawerTxns] = useState([]); // Database mode drawer data
    const [isDrawerLoading, setIsDrawerLoading] = useState(false); // Loading spinner ke liye

    const [selectedMarketplace, setSelectedMarketplace] = useState('All');
    const [selectedReportTypeFilter, setSelectedReportTypeFilter] = useState('All');
    const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('All'); // NAYA
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');
    const [activeTypeFilter, setActiveTypeFilter] = useState("All");


    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;
    const reportCategory = location.state?.reportCategory || 'sales';

    // --- DRAWER HANDLERS ---
    const handleOpenDrawer = async (orderId) => {
        setSelectedOrderId(orderId);
        setIsDrawerOpen(true);

        if (mode === 'database') {
            setIsDrawerLoading(true);
            setDbDrawerTxns([]); // Purana data clear karein
            try {
                const response = await api.get(`/getOrderTransactions/${orderId}`);
                if (response.data.success) {
                    setDbDrawerTxns(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching order transactions:", error);
            } finally {
                setIsDrawerLoading(false);
            }
        }
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedOrderId(null);
        setDbDrawerTxns([]);
    };

    // --- NAYA LOGIC: Linked Transactions Find Karne Ke Liye ---
    const linkedTransactions = useMemo(() => {
        if (!selectedOrderId) return [];
        if (mode === 'preview') {
            return rawOrders.filter(o => {
                const oid = o["Order Id"] || o["order id"] || o["order_id"];
                return String(oid).trim() === String(selectedOrderId).trim();
            });
        } else {
            return dbDrawerTxns; // Database mode mein backend ka data
        }
    }, [selectedOrderId, rawOrders, dbDrawerTxns, mode])

    // --- DATA FETCHING ---
    // --- DATA FETCHING & HIERARCHY LOGIC ---
    useEffect(() => {
        setIsProcessing(true);
        setTimeout(() => {
            if (location.state && location.state.previewData) {
                setMode('preview');
                const rawData = location.state.previewData;
                setRawOrders(rawData); // Raw data save karne ke liye store kiya

                // NAYA: Upar wala function use kiya
                const deduplicated = groupAndDeduplicateOrders(rawData);
                setOrders(deduplicated);
                setIsProcessing(false);
            } else {
                setMode('database');
                fetchReconciledData();
            }
        }, 100);
    }, [location.state, reportCategory]);

    const fetchReconciledData = async () => {
        try {
            const response = await api.get('/getReconciledOrders');
            if (response.data.success) {
                // NAYA: DB se aaye data ko bhi Table ke liye unique/merge kar diya
                const dbData = response.data.data;
                const deduplicatedDbData = groupAndDeduplicateOrders(dbData);
                setOrders(deduplicatedDbData);
            }
        } catch (error) {
            console.error("Error fetching reconciled data:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmAndSave = async () => {
        if (orders.length === 0) return alert("No data to save!");
        const uploadId = location.state?.uploadId;
        if (!uploadId) return alert("Upload ID missing. Please upload the file again.");

        setIsSaving(true);
        try {
            // NAYA: Yahan 'orders' ki jagah 'rawOrders' bhej rahe hain taaki DB mein sabhi transactions (Shipment, Cancel) save hon!
            const payload = { uploadId, reportType: reportCategory, orders: rawOrders };
            const response = await api.post('/saveMappedData', payload);
            if (response.data.success) {
                alert("Data saved successfully!");
                navigate('/upload', { replace: true, state: null });
            }
        } catch (error) {
            alert("Error saving data to database!");
        } finally {
            setIsSaving(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm(''); setSelectedMarketplace('All'); setSelectedReportTypeFilter('All'); setSelectedWarehouseFilter('All');
        setStartDate(''); setEndDate(''); setPaymentFilter('All'); setOrderStatusFilter('All'); setActiveTypeFilter('All');
    };

    const hasActiveFilters = searchTerm !== '' || selectedMarketplace !== 'All' || selectedReportTypeFilter !== 'All' || startDate !== '' || endDate !== '' || paymentFilter !== 'All' || orderStatusFilter !== 'All' || activeTypeFilter !== 'All';

    const uniqueMarketplaces = useMemo(() => {
        if (mode !== 'database') return [];
        const mps = new Set(orders.map(o => o["Marketplace"]).filter(Boolean));
        return ['All', ...Array.from(mps)];
    }, [orders, mode]);

    const uniqueReportTypes = useMemo(() => {
        if (mode !== 'database') return [];
        const rts = new Set(orders.map(o => o["Report Type"]).filter(Boolean));
        return ['All', ...Array.from(rts)];
    }, [orders, mode]);

    // NAYA: Database se automatically unique warehouses nikalne ke liye
    const uniqueWarehouses = useMemo(() => {
        if (mode !== 'database') return [];
        const whs = new Set(orders.map(o => o["Warehouse ID"] || o["Warehouse Id"]).filter(Boolean).filter(w => w !== '-'));
        return ['All', ...Array.from(whs)];
    }, [orders, mode]);


    const { statsData } = useMemo(() => {
        if (!orders || orders.length === 0) return { statsData: [{ id: "All", label: "TOTAL ROWS", value: 0, desc: `0 records` }] };

        let baseOrders = orders;
        if (mode === 'database') {
            if (selectedMarketplace !== 'All') baseOrders = baseOrders.filter(o => o["Marketplace"] === selectedMarketplace);
            if (selectedReportTypeFilter !== 'All') baseOrders = baseOrders.filter(o => o["Report Type"] === selectedReportTypeFilter);
            // mode === 'database' wale block ke andar add karein
            if (selectedWarehouseFilter !== 'All') {
                baseOrders = baseOrders.filter(o => (o["Warehouse ID"] || o["Warehouse Id"]) === selectedWarehouseFilter);
            }
            if (startDate || endDate) {
                const start = startDate ? new Date(startDate).getTime() : 0;
                const end = endDate ? new Date(endDate).getTime() : Infinity;
                baseOrders = baseOrders.filter(o => {
                    const dStr = o["Invoice Date"];
                    if (!dStr) return false;
                    let orderTime = 0;
                    if (dStr.includes('-') && dStr.split('-')[2]?.length === 4) {
                        const [day, month, year] = dStr.split('-');
                        orderTime = new Date(`${year}-${month}-${day}`).getTime();
                    } else orderTime = new Date(dStr).getTime();
                    return orderTime >= start && orderTime <= end;
                });
            }
        }

        if (baseOrders.length === 0) return { statsData: [{ id: "All", label: "TOTAL ROWS", value: 0, desc: `0 records` }] };

        const headers = Object.keys(baseOrders[0]);
        let typeColName = headers.find(h => ["transaction type", "order status", "type", "status"].includes(h.toLowerCase().trim()));
        let typeCounts = {};


        baseOrders.forEach(row => {
            let virtualType = "Unknown";
            if (row.__virtualType) virtualType = row.__virtualType;
            else if (mode === 'database') {
                // --- FIX YAHAN HAI: Database ko Preview ki tarah strict array match kar diya ---
                const rawType = String(row["Transaction Type"] || row["Event Sub Type"] || row["type"] || "").trim();
                const lowerVal = rawType.toLowerCase();

                if (["sale", "order", "shipment", "sales"].includes(lowerVal)) virtualType = "Shipment";
                else if (["return", "refund"].includes(lowerVal)) virtualType = "Refund";
                else if (["cancel", "cancelled", "cancellation"].includes(lowerVal)) virtualType = "Cancel";
                else {
                    // Agar exact match nahi hai (jaise "Return Cancellation"), to usko original naam dedo
                    virtualType = rawType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || "Others";
                }
            } else {
                if (typeColName && row[typeColName]) {
                    const lowerVal = String(row[typeColName]).trim().toLowerCase();
                    if (["sale", "order", "shipment", "sales"].includes(lowerVal)) virtualType = "Shipment";
                    else if (["return", "refund"].includes(lowerVal)) virtualType = "Refund";
                    else if (["cancel", "cancelled", "cancellation"].includes(lowerVal)) virtualType = "Cancel";
                    else {
                        const raw = String(row[typeColName]).trim();
                        virtualType = raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    }
                } else {
                    const rowString = Object.values(row).join(" ").toLowerCase();
                    if (rowString.includes("cancel")) virtualType = "Cancel";
                    else if (rowString.includes("return") || rowString.includes("refund")) virtualType = "Refund";
                    else if (rowString.includes("shipment") || rowString.includes("sale")) virtualType = "Shipment";
                    else virtualType = "Others";
                }
            }
            row.__virtualType = virtualType;
            typeCounts[virtualType] = (typeCounts[virtualType] || 0) + 1;
        });


        const sData = [{ id: "All", label: "TOTAL ROWS", value: baseOrders.length, desc: "Filtered records available." }];

        // --- NAYA: Box ka fixed sequence define kiya ---
        const preferredSequence = ["Shipment", "Delivered", "Refund", "Return", "Cancel", "Pending"];

        // 1. Pehle sequence ke hisaab se boxes add karenge (Agar unka data 0 se jyada hai)
        preferredSequence.forEach(type => {
            if (typeCounts[type] !== undefined) {
                sData.push({ id: type, label: type.toUpperCase(), value: typeCounts[type], desc: `${type} records found.` });
            }
        });

        // 2. Agar inke alawa koi naya type aa jaye (jaise 'Others'), toh usko sabse last me daalenge
        Object.keys(typeCounts).forEach(type => {
            if (!preferredSequence.includes(type)) {
                sData.push({ id: type, label: type.toUpperCase(), value: typeCounts[type], desc: `${type} records found.` });
            }
        });

        return { statsData: sData };
    }, [orders, mode, selectedMarketplace, selectedReportTypeFilter, startDate, endDate]);



    const filteredOrders = useMemo(() => {
        let result = orders;
        if (mode === 'database') {
            if (selectedMarketplace !== 'All') result = result.filter(o => o["Marketplace"] === selectedMarketplace);
            if (selectedReportTypeFilter !== 'All') result = result.filter(o => o["Report Type"] === selectedReportTypeFilter);
            if (selectedWarehouseFilter !== 'All') {
                result = result.filter(o => {
                    const wId = o["Warehouse ID"] || o["Warehouse Id"] || o["warehouse id"] || o["warehouse_id"];
                    return wId === selectedWarehouseFilter;
                });
            }
            if (startDate || endDate) {
                const start = startDate ? new Date(startDate).getTime() : 0;
                const end = endDate ? new Date(endDate).getTime() : Infinity;
                result = result.filter(o => {
                    const dStr = o["Invoice Date"];
                    if (!dStr) return false;
                    let orderTime = 0;
                    if (dStr.includes('-') && dStr.split('-')[2]?.length === 4) {
                        const [day, month, year] = dStr.split('-');
                        orderTime = new Date(`${year}-${month}-${day}`).getTime();
                    } else orderTime = new Date(dStr).getTime();
                    return orderTime >= start && orderTime <= end;
                });
            }
            if (paymentFilter !== 'All') {
                result = result.filter(o => {
                    const sTotal = parseFloat(o["Settlement Total"]) || 0;
                    if (paymentFilter === 'Settled') return sTotal !== 0;
                    if (paymentFilter === 'Pending') return sTotal === 0;
                    return true;
                });
            }
            if (orderStatusFilter !== 'All') {
                result = result.filter(o => {
                    const sTotal = parseFloat(o["Settlement Total"]) || 0;
                    if (orderStatusFilter === 'Delivered') return sTotal > 0;
                    if (orderStatusFilter === 'Return') return sTotal < 0;
                    if (orderStatusFilter === 'Pending') return sTotal === 0;
                    return true;
                });
            }
        }

        if (activeTypeFilter !== "All") result = result.filter(o => o.__virtualType === activeTypeFilter);
        if (searchTerm.trim() !== '') {
            result = result.filter(o => {
                const oid = o["Order Id"] || o["order id"] || o["order_id"] || '';
                return String(oid).toLowerCase().includes(searchTerm.toLowerCase());
            });
        }
        setCurrentPage(1);
        return result;
    }, [orders, selectedMarketplace, selectedReportTypeFilter, selectedWarehouseFilter, startDate, endDate, paymentFilter, orderStatusFilter, mode, activeTypeFilter, searchTerm]);

    const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
    const currentRows = useMemo(() => {
        const indexOfLastRow = currentPage * rowsPerPage;
        const indexOfFirstRow = indexOfLastRow - rowsPerPage;
        return filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
    }, [filteredOrders, currentPage]);

    return {
        state: {
            orders, isSaving, isProcessing, mode, reportCategory,
            selectedMarketplace, selectedReportTypeFilter, searchTerm, startDate, endDate, paymentFilter, orderStatusFilter, activeTypeFilter,
            currentPage, rowsPerPage, totalPages, currentRows, filteredOrders,
            uniqueMarketplaces, uniqueReportTypes, statsData, hasActiveFilters,
            isDrawerOpen, selectedOrderId, linkedTransactions, isDrawerLoading, selectedWarehouseFilter, uniqueWarehouses
        },
        handlers: {
            setSelectedMarketplace, setSelectedReportTypeFilter, setSearchTerm, setStartDate, setEndDate, setPaymentFilter, setOrderStatusFilter, setActiveTypeFilter, setCurrentPage,
            handleConfirmAndSave, clearFilters, navigate,
            handleOpenDrawer, handleCloseDrawer, setSelectedWarehouseFilter
        }
    };
};