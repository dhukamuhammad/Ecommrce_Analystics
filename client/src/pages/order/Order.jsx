import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, Loader2, Filter, Calendar, XCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate';
import api from '../../services/api';

const Order = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(true);
    const [mode, setMode] = useState('database');

    const [selectedMarketplace, setSelectedMarketplace] = useState('All');
    const [selectedReportTypeFilter, setSelectedReportTypeFilter] = useState('All'); // NAYA STATE

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');

    // NAYA STATE: Dynamic Cards filter ke liye
    const [activeTypeFilter, setActiveTypeFilter] = useState("All");

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;

    const reportCategory = location.state?.reportCategory || 'sales';

    // --- NAYA USEEFFECT (Hierarchy Logic ke sath - No Duplicates) ---
    useEffect(() => {
        setIsProcessing(true);
        setTimeout(() => {
            if (location.state && location.state.previewData) {
                setMode('preview');
                const rawData = location.state.previewData;

                // Step 1 : Group rows by Order Id
                const orderGroups = new Map();

                rawData.forEach((row) => {
                    const oid = row["Order Id"] || row["order id"] || row["order_id"];

                    if (!oid || oid === "-") {
                        orderGroups.set(`temp_${Math.random()}`, [row]);
                        return;
                    }

                    if (!orderGroups.has(oid)) {
                        orderGroups.set(oid, []);
                    }

                    orderGroups.get(oid).push(row);
                });

                // Step 2 : Determine final row
                const uniqueDataArray = [];
                const manualReviewRows = [];

                orderGroups.forEach((rows, orderId) => {
                    if (rows.length === 1) {
                        uniqueDataArray.push(rows[0]);
                        return;
                    }

                    const types = rows.map(r =>
                        String(r["Transaction Type"] || r["transaction type"] || r["type"] || "")
                            .trim()
                            .toLowerCase()
                    );

                    // Hierarchy Checks
                    const hasRefund = types.some(t => t.includes("refund") || t.includes("return"));
                    const hasShipment = types.some(t => t.includes("shipment") || t.includes("sale") || t.includes("order"));
                    const hasCancel = types.some(t => t.includes("cancel"));

                    let finalType = null;

                    // Refund > Shipment > Cancel
                    if (hasRefund) {
                        finalType = "Refund";
                    }
                    else if (hasShipment) {
                        finalType = "Shipment";
                    }
                    else if (hasCancel) {
                        finalType = "Cancel";
                    }

                    let selectedRow = null;

                    if (finalType) {
                        // Find the exact row that matches the finalType to keep its specific data
                        selectedRow = rows.find(
                            r => {
                                const t = String(r["Transaction Type"] || r["transaction type"] || r["type"] || "").trim().toLowerCase();
                                if (finalType === "Refund") return t.includes("refund") || t.includes("return");
                                if (finalType === "Shipment") return t.includes("shipment") || t.includes("sale") || t.includes("order");
                                if (finalType === "Cancel") return t.includes("cancel");
                                return false;
                            }
                        ) || rows[0];

                        selectedRow.__virtualType = finalType; // Forcefully assign the calculated type
                        uniqueDataArray.push(selectedRow);
                    }
                    else {
                        rows.forEach(r => {
                            r.__virtualType = "Manual Review";
                        });
                        manualReviewRows.push(...rows);
                    }
                });

                // Combine processed rows
                uniqueDataArray.push(...manualReviewRows);

                setOrders(uniqueDataArray);
                setIsProcessing(false);
            }
            else {
                setMode('database');
                fetchReconciledData();
            }
        }, 100);
    }, [location.state, reportCategory]);

    const fetchReconciledData = async () => {
        try {
            const response = await api.get('/getReconciledOrders');
            if (response.data.success) {
                setOrders(response.data.data);
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
            const payload = { uploadId, reportType: reportCategory, orders };
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

    const getColumns = () => {
        if (mode === 'preview' && reportCategory === 'settlement') {
            return ['#', 'Date', 'Order Id', 'Sales Tax', 'TCS-CGST', 'TCS-SGST', 'TCS-IGST', 'TDS', 'Commission Fees', 'Shipping + Pick Pack Fees', 'Closing Fees', 'Net Amount'];
        }

        let cols = ['#'];
        if (mode === 'database') {
            cols.push('Marketplace');
            cols.push('Report Type'); // NAYA ADD KIYA
        }

        cols.push('Order Id', 'Invoice Date', 'SKU', 'Quantity', 'Invoice Amount', 'Tax Ex Gross', 'Total Tax');

        if (mode === 'database') {
            cols.push('Sales Tax', 'TCS-CGST', 'TCS-SGST', 'TCS-IGST', 'TDS', 'Commission Fees', 'Shipping + Pick Pack Fees', 'Closing Fees', 'Settlement Total', 'Payment Status', 'Order Status');
        }
        return cols;
    };

    const getVal = (obj, possibleKeys) => {
        const lowerObj = {};
        for (let k in obj) lowerObj[k.toLowerCase().trim()] = obj[k];
        for (let pk of possibleKeys) {
            if (lowerObj[pk.toLowerCase()] !== undefined && lowerObj[pk.toLowerCase()] !== '') return lowerObj[pk.toLowerCase()];
        }
        return '-';
    };

    const cleanAmt = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;

    const getColorClass = (amount) => {
        if (amount > 0) return 'text-[#10B981]';
        if (amount < 0) return 'text-[#EF4444]';
        return 'text-[#6B7280]';
    };

    const getOrderStatus = (val) => {
        if (val > 0) return { label: 'Delivered', color: 'bg-[#10B981]/10 text-[#10B981]' };
        if (val < 0) return { label: 'Return', color: 'bg-[#EF4444]/10 text-[#EF4444]' };
        return { label: 'Pending', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' };
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedMarketplace('All');
        setSelectedReportTypeFilter('All'); // NAYA ADD KIYA
        setStartDate('');
        setEndDate('');
        setPaymentFilter('All');
        setOrderStatusFilter('All');
        setActiveTypeFilter('All');
    };

    const hasActiveFilters = searchTerm !== '' || selectedMarketplace !== 'All' || selectedReportTypeFilter !== 'All' || startDate !== '' || endDate !== '' || paymentFilter !== 'All' || orderStatusFilter !== 'All' || activeTypeFilter !== 'All';


    const uniqueMarketplaces = useMemo(() => {
        if (mode !== 'database') return [];
        const mps = new Set(orders.map(o => o["Marketplace"]).filter(Boolean));
        return ['All', ...Array.from(mps)];
    }, [orders, mode]);

    // --- NAYA USEMEMO ---
    const uniqueReportTypes = useMemo(() => {
        if (mode !== 'database') return [];
        const rts = new Set(orders.map(o => o["Report Type"]).filter(Boolean));
        return ['All', ...Array.from(rts)];
    }, [orders, mode]);

    // --- NAYA DYNAMIC STATS USEMEMO ---
    // --- NAYA DYNAMIC STATS USEMEMO (Ab ye filter hone ke baad ginti karega) ---
    const { statsData } = useMemo(() => {
        if (!orders || orders.length === 0) {
            return { statsData: [{ id: "All", label: "TOTAL ROWS", value: 0, desc: `0 records` }] };
        }

        // 1. Pehle data ko Marketplace, Report Type aur Date ke hisaab se filter karenge taaki Box ke numbers accurate aayen
        let baseOrders = orders;
        if (mode === 'database') {
            if (selectedMarketplace !== 'All') {
                baseOrders = baseOrders.filter(o => o["Marketplace"] === selectedMarketplace);
            }
            if (selectedReportTypeFilter !== 'All') {
                baseOrders = baseOrders.filter(o => o["Report Type"] === selectedReportTypeFilter);
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
                    } else {
                        orderTime = new Date(dStr).getTime();
                    }
                    return orderTime >= start && orderTime <= end;
                });
            }
        }

        if (baseOrders.length === 0) {
            return { statsData: [{ id: "All", label: "TOTAL ROWS", value: 0, desc: `0 records` }] };
        }

        const headers = Object.keys(baseOrders[0]);
        let typeColName = headers.find(h => {
            const lower = h.toLowerCase().trim();
            return lower === "transaction type" || lower === "order status" || lower === "type" || lower === "status";
        });

        let typeCounts = {};

        baseOrders.forEach(row => {
            let virtualType = "Unknown";

            if (row.__virtualType) {
                virtualType = row.__virtualType;
            }
            else if (mode === 'database') {
                const dbType = String(row["Transaction Type"] || "").toLowerCase();

                if (dbType.includes("sale") || dbType.includes("shipment") || dbType.includes("order")) {
                    virtualType = "Shipment";
                } else if (dbType.includes("return") || dbType.includes("refund")) {
                    virtualType = "Refund";
                } else if (dbType.includes("cancel")) {
                    virtualType = "Cancel";
                } else {
                    virtualType = row["Transaction Type"] || "Others";
                }
            }
            else {
                if (typeColName && row[typeColName]) {
                    const val = String(row[typeColName]).trim();
                    const lowerVal = val.toLowerCase();

                    if (["sale", "order", "shipment", "sales"].includes(lowerVal)) virtualType = "Shipment";
                    else if (["return", "refund"].includes(lowerVal)) virtualType = "Refund";
                    else if (["cancel", "cancelled", "cancellation"].includes(lowerVal)) virtualType = "Cancel";
                    else virtualType = val;
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

        const sData = [
            { id: "All", label: "TOTAL ROWS", value: baseOrders.length, desc: "Filtered records available." }
        ];

        Object.keys(typeCounts).sort().forEach(type => {
            sData.push({ id: type, label: type.toUpperCase(), value: typeCounts[type], desc: `${type} records found.` });
        });

        return { statsData: sData };
    }, [orders, mode, selectedMarketplace, selectedReportTypeFilter, startDate, endDate]); // Dependencies updated


    // --- UPDATED FILTERED ORDERS (Ab real-time update hoga) ---
    const filteredOrders = useMemo(() => {
        let result = orders;

        // 1. Apply Marketplace, Report Type & Date Filters First
        if (mode === 'database') {
            if (selectedMarketplace !== 'All') {
                result = result.filter(o => o["Marketplace"] === selectedMarketplace);
            }

            if (selectedReportTypeFilter !== 'All') {
                result = result.filter(o => o["Report Type"] === selectedReportTypeFilter);
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
                    } else {
                        orderTime = new Date(dStr).getTime();
                    }
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

        // 2. Apply Dynamic Box Filter (Shipment/Cancel/Refund)
        if (activeTypeFilter !== "All") {
            result = result.filter(o => o.__virtualType === activeTypeFilter);
        }

        // 3. Apply Search Box Filter
        if (searchTerm.trim() !== '') {
            result = result.filter(o => {
                const oid = o["Order Id"] || o["order id"] || o["order_id"] || '';
                return String(oid).toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        setCurrentPage(1); // Page reset
        return result;
    }, [orders, selectedMarketplace, selectedReportTypeFilter, startDate, endDate, paymentFilter, orderStatusFilter, mode, activeTypeFilter, searchTerm]); // Yahan dependency missing thi jo ab add ho gayi
    const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
    const currentRows = useMemo(() => {
        const indexOfLastRow = currentPage * rowsPerPage;
        const indexOfFirstRow = indexOfLastRow - rowsPerPage;
        return filteredOrders.slice(indexOfFirstRow, indexOfLastRow);
    }, [filteredOrders, currentPage]);

    return (
        <div className="p-6 flex flex-col min-w-0 h-[calc(100vh-100px)] gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm overflow-hidden flex flex-col w-full h-full">

                {/* --- HEADER --- */}
                <div className="p-5 border-b border-[#E5E7EB] shrink-0 flex flex-col gap-4">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
                        <div>
                            <h2 className="font-['Sora',sans-serif] text-[18px] font-bold text-[#243463] whitespace-nowrap">
                                {mode === 'preview' ? (reportCategory === 'settlement' ? 'Settlement Preview' : 'Sales Preview') : 'Reconciliation Dashboard'}
                            </h2>
                            <p className="text-[12px] text-[#6B7280] mt-0.5">
                                {mode === 'preview' ? 'Check mapped data before final save' : 'Matched Sales & Settlement Data'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-[13px] font-semibold text-[#243463] hidden md:block px-3 bg-[#F8FAFC] py-2 rounded-lg border border-[#E5E7EB]">
                                Total Rows: {filteredOrders.length}
                            </div>

                            {mode === 'preview' ? (
                                <>
                                    <button onClick={() => navigate('/upload')} className="bg-white text-[#243463] border border-[#E5E7EB] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">Discard</button>
                                    <button onClick={handleConfirmAndSave} disabled={isSaving || isProcessing || orders.length === 0} className="bg-[#243463] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#1a2548] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2">
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                        {isSaving ? 'Saving...' : 'Confirm & Save Data'}
                                    </button>
                                </>
                            ) : (
                                <button className="bg-white text-[#243463] border border-[#E5E7EB] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-center gap-2">
                                    <Download size={14} /> Export
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- FILTER BAR (Ab Search box hamesha dikhega) --- */}
                    <div className="flex flex-wrap items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB]">

                        {/* SEARCH BAR - Ab Preview me bhi dikhega */}
                        <div className="flex items-center border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white min-w-[180px] flex-1">
                            <Search size={14} className="text-[#6B7280] mr-2" />
                            <input type="text" placeholder="Search Order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] w-full" />
                        </div>

                        {/* BAAKI FILTERS - Sirf Database mode me dikhenge */}
                        {mode === 'database' && (
                            <>
                                {uniqueMarketplaces.length > 1 && (
                                    <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                        <Filter size={13} className="text-[#6B7280] mr-1.5" />
                                        <select value={selectedMarketplace} onChange={(e) => setSelectedMarketplace(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                            {uniqueMarketplaces.map((mp, i) => <option key={i} value={mp}>{mp === 'All' ? 'Platform: All' : mp}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* --- NAYA DROPDOWN --- */}
                                {uniqueReportTypes.length > 1 && (
                                    <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                        <Filter size={13} className="text-[#6B7280] mr-1.5" />
                                        <select value={selectedReportTypeFilter} onChange={(e) => setSelectedReportTypeFilter(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                            {uniqueReportTypes.map((rt, i) => <option key={i} value={rt}>{rt === 'All' ? 'Report: All' : rt}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                    <Calendar size={13} className="text-[#6B7280]" />
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[12px] text-[#243463] outline-none cursor-pointer bg-transparent" title="Start Date" />
                                    <span className="text-[#6B7280] text-[12px]">to</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[12px] text-[#243463] outline-none cursor-pointer bg-transparent" title="End Date" />
                                </div>

                                <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                    <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                        <option value="All">Payment: All</option>
                                        <option value="Settled">Settled</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>

                                <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                    <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                        <option value="All">Status: All</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Return">Return</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-[12px] font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                            >
                                <XCircle size={14} /> Clear All
                            </button>
                        )}
                    </div>
                </div>
                {/* --- DYNAMIC STAT CARDS --- */}
                {!isProcessing && statsData && statsData.length > 1 && (
                    <div className="flex flex-wrap gap-4 px-5 pb-5 pt-5 border-b border-[#E5E7EB] shrink-0 bg-white">
                        {statsData.map((s) => {
                            const isActive = activeTypeFilter === s.id;
                            return (
                                <div
                                    key={s.label}
                                    onClick={() => setActiveTypeFilter(s.id)}
                                    className={`flex-1 min-w-[140px] rounded-xl p-4 border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md 
                                        ${isActive ? "bg-[#243463] border-[#243463] shadow-md text-white" : "bg-[#F8FAFC] border-[#E5E7EB] text-[#243463] hover:border-[#243463]/30"}
                                    `}
                                >
                                    <div className={`text-[10px] font-bold tracking-widest mb-1 uppercase ${isActive ? "text-[#E5E7EB]" : "text-[#6B7280]"}`}>
                                        {s.label}
                                    </div>
                                    <div className="text-2xl font-bold mb-0.5">{s.value}</div>
                                    <div className={`text-[10px] leading-snug ${isActive ? "text-[#E5E7EB]/80" : "text-[#6B7280]"}`}>{s.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- TABLE AREA --- */}
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 min-h-0 relative">
                    {isProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 min-h-[300px]">
                            <Loader2 size={32} className="animate-spin text-[#243463] mb-3" />
                            <p className="text-[14px] font-medium text-[#243463]">Processing Data...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[max-content]">
                            <thead>
                                <tr>
                                    {getColumns().map((head, index) => (
                                        <th key={index} className="py-4 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap sticky top-0 bg-[#F8FAFC] z-10 shadow-[0_1px_0_#E5E7EB]">
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {currentRows.length === 0 ? (
                                    <tr><td colSpan={20} className="py-10 text-center text-[14px] text-[#6B7280]">No data found matching your filters.</td></tr>
                                ) : (
                                    currentRows.map((order, idx) => {
                                        const actualIndex = ((currentPage - 1) * rowsPerPage) + idx + 1;

                                        if (mode === 'preview' && reportCategory === 'settlement') {
                                            const tDate = getVal(order, ['date/time', 'transaction date', 'date']);
                                            const oId = getVal(order, ['order id', 'order_id']);

                                            const sTax = cleanAmt(getVal(order, ['total sales tax liable', 'gst before adjusting tcs', 'total sales tax liable(gst before adjusting tcs)']));
                                            const cgst = cleanAmt(getVal(order, ['tcs-cgst', 'tcs cgst']));
                                            const sgst = cleanAmt(getVal(order, ['tcs-sgst', 'tcs sgst']));
                                            const igst = cleanAmt(getVal(order, ['tcs-igst', 'tcs igst']));
                                            const tds = cleanAmt(getVal(order, ['tds', 'section 194-o']));
                                            const sFees = cleanAmt(getVal(order, ['selling fees', 'commission']));
                                            const fbaFees = cleanAmt(getVal(order, ['fba fees']));
                                            const otherFees = cleanAmt(getVal(order, ['other transaction fees']));
                                            const amt = cleanAmt(getVal(order, ['total', 'amount', 'net amount']));

                                            return (
                                                <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                                    <td className="py-3 px-4 text-[13px] text-[#6B7280]">{actualIndex}</td>

                                                    <td className="py-3 px-4 text-[13px] whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-1 rounded-md w-max">
                                                            <Calendar size={12} className="text-[#6B7280]" />
                                                            <span className="font-medium text-[#243463] text-[12px]">{formatDate(tDate)}</span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-[13px] font-semibold text-[#243463] whitespace-nowrap">{oId}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sTax)}`}>{sTax}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(cgst)}`}>{cgst}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sgst)}`}>{sgst}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(igst)}`}>{igst}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(tds)}`}>{tds}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sFees)}`}>{sFees}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(fbaFees)}`}>{fbaFees}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(otherFees)}`}>{otherFees}</td>
                                                    <td className={`py-3 px-4 text-[13px] font-bold ${getColorClass(amt)}`}>₹{amt.toFixed(2)}</td>
                                                </tr>
                                            );
                                        }

                                        // --- DASHBOARD OR SALES PREVIEW RENDER ---
                                        const oId = getVal(order, ['order id', 'order_id']);
                                        const invDate = getVal(order, ['invoice date', 'order date', 'date']);
                                        const skuVal = getVal(order, ['sku']);
                                        const qtyVal = getVal(order, ['quantity', 'item quantity', 'qty']);

                                        const invAmt = cleanAmt(getVal(order, ['invoice amount', 'total amount', 'price after discount']));
                                        const taxGross = cleanAmt(getVal(order, ['tax exclusive gross', 'tax ex gross', 'taxable value']));
                                        const totalTax = cleanAmt(getVal(order, ['total tax amount', 'total tax', 'tax']));

                                        const settlementTotal = parseFloat(order["Settlement Total"]) || 0;
                                        const isSettled = settlementTotal !== 0;
                                        const oStatus = getOrderStatus(settlementTotal);

                                        return (
                                            <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                                <td className="py-3 px-4 text-[13px] text-[#6B7280]">{actualIndex}</td>

                                                {mode === 'database' && (
                                                    <>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-[#243463]/10 text-[#243463]">
                                                                {order["Marketplace"] || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-600 border border-blue-100">
                                                                {order["Report Type"] || '-'}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}

                                                <td className="py-3 px-4 text-[13px] font-semibold text-[#243463] whitespace-nowrap">{oId === '-' ? '-' : oId}</td>

                                                {/* --- STYLED INVOICE DATE --- */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2 py-1 rounded-md w-max shadow-sm">
                                                        <Calendar size={12} className="text-[#6B7280]" />
                                                        <span className="font-medium text-[#243463] text-[12px]">{formatDate(invDate)}</span>
                                                    </div>
                                                </td>

                                                {/* --- STYLED SKU --- */}
                                                <td className="py-3 px-4 text-[13px]">
                                                    <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-700 whitespace-nowrap">
                                                        {skuVal === '-' ? '-' : skuVal}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 text-[13px] text-[#6B7280]">{qtyVal === '-' ? 0 : qtyVal}</td>

                                                <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(invAmt)}`}>₹{invAmt.toFixed(2)}</td>
                                                <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(taxGross)}`}>₹{taxGross.toFixed(2)}</td>
                                                <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(totalTax)}`}>₹{totalTax.toFixed(2)}</td>

                                                {mode === 'database' && (
                                                    <>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Sales Tax"])}`}>{order["Sales Tax"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-CGST"])}`}>{order["TCS-CGST"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-SGST"])}`}>{order["TCS-SGST"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-IGST"])}`}>{order["TCS-IGST"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TDS"])}`}>{order["TDS"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Selling Fees"])}`}>{order["Selling Fees"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["FBA Fees"])}`}>{order["FBA Fees"] || 0}</td>
                                                        <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Other Fees"])}`}>{order["Other Fees"] || 0}</td>

                                                        <td className={`py-3 px-4 text-[13px] font-bold ${getColorClass(settlementTotal)}`}>₹{settlementTotal.toFixed(2)}</td>
                                                        <td className="py-3 px-4 text-[13px]">
                                                            <span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${isSettled ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
                                                                {isSettled ? 'Settled' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-[13px]">
                                                            <span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${oStatus.color}`}>
                                                                {oStatus.label}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* --- FOOTER --- */}
                {!isProcessing && filteredOrders.length > 0 && (
                    <div className="p-4 border-t border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
                        <span className="text-[13px] text-[#6B7280]">
                            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} entries
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#243463] hover:bg-[#F8FAFC] disabled:opacity-50">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-[13px] font-semibold text-[#243463] px-2">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#243463] hover:bg-[#F8FAFC] disabled:opacity-50">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Order;