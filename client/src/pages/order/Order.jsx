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
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;

    const reportCategory = location.state?.reportCategory || 'sales';

    useEffect(() => {
        setIsProcessing(true);
        setTimeout(() => {
            if (location.state && location.state.previewData) {
                setMode('preview');
                const rawData = location.state.previewData;
                const uniqueOrdersMap = new Map();

                rawData.forEach(row => {
                    if (reportCategory === 'sales') {
                        const oid = row["Order Id"];
                        if (!oid || oid === '-') {
                            uniqueOrdersMap.set(Math.random(), row);
                        } else {
                            if (!uniqueOrdersMap.has(oid)) {
                                uniqueOrdersMap.set(oid, row);
                            } else if (row["Transaction Type"] === 'Shipment') {
                                uniqueOrdersMap.set(oid, row);
                            }
                        }
                    } else {
                        uniqueOrdersMap.set(Math.random(), row);
                    }
                });

                const uniqueDataArray = Array.from(uniqueOrdersMap.values());
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
        if (mode === 'database') cols.push('Marketplace');

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
        setStartDate('');
        setEndDate('');
        setPaymentFilter('All');
        setOrderStatusFilter('All');
    };

    const hasActiveFilters = searchTerm !== '' || selectedMarketplace !== 'All' || startDate !== '' || endDate !== '' || paymentFilter !== 'All' || orderStatusFilter !== 'All';

    const uniqueMarketplaces = useMemo(() => {
        if (mode !== 'database') return [];
        const mps = new Set(orders.map(o => o["Marketplace"]).filter(Boolean));
        return ['All', ...Array.from(mps)];
    }, [orders, mode]);

    const filteredOrders = useMemo(() => {
        let result = orders;

        if (searchTerm.trim() !== '') {
            result = result.filter(o => {
                const oid = o["Order Id"] || o["order id"] || o["order_id"] || '';
                return String(oid).toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        if (mode === 'database') {
            if (selectedMarketplace !== 'All') {
                result = result.filter(o => o["Marketplace"] === selectedMarketplace);
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

        setCurrentPage(1); 
        return result;
    }, [orders, selectedMarketplace, searchTerm, startDate, endDate, paymentFilter, orderStatusFilter, mode]);

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

                    {mode === 'database' && (
                        <div className="flex flex-wrap items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB]">
                            <div className="flex items-center border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white min-w-[180px] flex-1">
                                <Search size={14} className="text-[#6B7280] mr-2" />
                                <input type="text" placeholder="Search Order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] w-full" />
                            </div>

                            {uniqueMarketplaces.length > 1 && (
                                <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                    <Filter size={13} className="text-[#6B7280] mr-1.5" />
                                    <select value={selectedMarketplace} onChange={(e) => setSelectedMarketplace(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                        {uniqueMarketplaces.map((mp, i) => <option key={i} value={mp}>{mp === 'All' ? 'Platform: All' : mp}</option>)}
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

                            {hasActiveFilters && (
                                <button 
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 text-[12px] font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
                                >
                                    <XCircle size={14} /> Clear All
                                </button>
                            )}
                        </div>
                    )}
                </div>

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
                                                    
                                                    {/* Styled Date for Settlement Preview */}
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

                                        const invAmt = parseFloat(order["Invoice Amount"]) || 0;
                                        const taxGross = parseFloat(order["Tax Exclusive Gross"]) || 0;
                                        const totalTax = parseFloat(order["Total Tax Amount"]) || 0;
                                        const settlementTotal = parseFloat(order["Settlement Total"]) || 0;

                                        const isSettled = settlementTotal !== 0;
                                        const oStatus = getOrderStatus(settlementTotal);

                                        return (
                                            <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                                <td className="py-3 px-4 text-[13px] text-[#6B7280]">{actualIndex}</td>
                                                
                                                {mode === 'database' && (
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-[#243463]/10 text-[#243463]">
                                                            {order["Marketplace"] || '-'}
                                                        </span>
                                                    </td>
                                                )}

                                                <td className="py-3 px-4 text-[13px] font-semibold text-[#243463] whitespace-nowrap">{order["Order Id"] || '-'}</td>
                                                
                                                {/* --- STYLED INVOICE DATE --- */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2 py-1 rounded-md w-max shadow-sm">
                                                        <Calendar size={12} className="text-[#6B7280]" />
                                                        <span className="font-medium text-[#243463] text-[12px]">{formatDate(order["Invoice Date"])}</span>
                                                    </div>
                                                </td>

                                                {/* --- STYLED SKU --- */}
                                                <td className="py-3 px-4 text-[13px]">
                                                    <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-700 whitespace-nowrap">
                                                        {order["Sku"] || '-'}
                                                    </span>
                                                </td>
                                                
                                                <td className="py-3 px-4 text-[13px] text-[#6B7280]">{order["Quantity"] || 0}</td>
                                                
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