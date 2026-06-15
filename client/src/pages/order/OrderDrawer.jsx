import React from 'react';
import { X, Package, ArrowRightLeft, Calendar, Loader2, Receipt, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';
import { useState } from 'react';

const OrderDrawer = ({ isOpen, onClose, orderId, transactions, mode, isLoading }) => {

    const [activeTab, setActiveTab] = useState('payout');

    if (!isOpen) return null;

    const getVal = (obj, keys) => {
        if (!obj) return '-';
        const lowerObj = {};
        for (let k in obj) lowerObj[k.toLowerCase().trim()] = obj[k];
        for (let pk of keys) {
            if (lowerObj[pk.toLowerCase()] !== undefined && lowerObj[pk.toLowerCase()] !== '') return lowerObj[pk.toLowerCase()];
        }
        return '-';
    };

    const formatFee = (val) => {
        const num = parseFloat(val) || 0;
        if (num === 0) return '₹0.00';
        return num > 0 ? `+ ₹${num.toFixed(2)}` : `- ₹${Math.abs(num).toFixed(2)}`;
    };

    const getFeeColor = (val) => {
        const num = parseFloat(val) || 0;
        if (num === 0) return 'text-[#6B7280]';
        return num > 0 ? 'text-[#10B981]' : 'text-[#EF4444]';
    };

    const commonTxn = transactions[0] || {};
    console.log(commonTxn)
    const commonSku = getVal(commonTxn, ['sku']);
    const commonQty = getVal(commonTxn, ['quantity', 'qty']);
    const commonDate = getVal(commonTxn, ['invoice date', 'shipment date', 'date/time', 'transaction date', 'date']);

    // NAYA: Warehouse ID extract kiya Drawer ke liye
    let commonWarehouse = getVal(commonTxn, ['warehouse id', 'Warehouse ID', 'Warehouse Id', 'fulfillment center', 'warehouse', 'warehouse_id']);
    if (!commonWarehouse || commonWarehouse === '-' || String(commonWarehouse).trim().toLowerCase() === 'na') {
        commonWarehouse = 'N/A';
    }
    // --- GLOBAL RECONCILIATION COUNTERS ---
    let totalDeductions = 0;
    let finalNetPayout = 0; // Final amount jo direct settlements ke sum se banega
    let settlementDetails = []; // 1-by-1 settlements store karne ke liye

    // NAYA: Har fee ka alag sum store karne ke liye
    let totalComm = 0;
    let totalShip = 0;
    let totalOther = 0;
    let totalTds = 0;
    let totalTcs = 0;

    const sortedTransactions = [...transactions].sort((a, b) => {
        const typeA = String(mode === 'database' ? (a["Type"] || a["Transaction Type"]) : getVal(a, ['transaction type', 'type'])).toLowerCase();
        const typeB = String(mode === 'database' ? (b["Type"] || b["Transaction Type"]) : getVal(b, ['transaction type', 'type'])).toLowerCase();

        const getRank = (type) => {
            if (type.includes('shipment') || type.includes('sale') || type.includes('order')) return 1;
            if (type.includes('refund') || type.includes('return')) return 2;
            if (type.includes('cancel')) return 3;
            if (type.includes('settlement')) return 4;
            return 5;
        };
        return getRank(typeA) - getRank(typeB);
    });

    // --- MATHEMATICAL ACCUMULATION LOOP ---
    sortedTransactions.forEach(txn => {
        const type = String(mode === 'database' ? (txn["Type"] || txn["Transaction Type"]) : getVal(txn, ['transaction type', 'type'])).toLowerCase();
        const amt = getVal(txn, ['amount', 'invoice amount', 'total', 'net amount']);
        const cleanAmount = parseFloat(String(amt).replace(/,/g, '') || 0);
        const isSettlement = type.includes('settlement');

        const comm = parseFloat(txn["Commission"] || getVal(txn, ['selling fees', 'commission'])) || 0;
        const ship = parseFloat(txn["ShippingFee"] || getVal(txn, ['fba fees', 'shipping fee'])) || 0;
        const other = parseFloat(txn["OtherFees"] || getVal(txn, ['other transaction fees', 'other fees'])) || 0;
        const tds = parseFloat(txn["TDS"] || getVal(txn, ['tds (section 194-o)', 'tds'])) || 0;

        let tcs = parseFloat(txn["TCS"]) || 0;
        if (!tcs) {
            tcs = (parseFloat(getVal(txn, ['tcs-cgst'])) || 0) +
                (parseFloat(getVal(txn, ['tcs-sgst'])) || 0) +
                (parseFloat(getVal(txn, ['tcs-igst'])) || 0);
        }

        // NAYA: Individual fees ka bhi sum karte jao loop ke andar
        totalComm += comm;
        totalShip += ship;
        totalOther += other;
        totalTds += tds;
        totalTcs += tcs;

        // Deductions abhi bhi total karenge bas Info dikhane ke liye
        totalDeductions += (comm + ship + tds + tcs + other);

        // NAYA: Agar settlement row hai to usko array me daalo aur final math me add karo
        if (isSettlement) {
            finalNetPayout += cleanAmount;
            settlementDetails.push({ amount: cleanAmount });
        }
    });

    const isLoss = finalNetPayout < 0;


    // =======================================================
    // NAYA: Table wala Payment Status & Order Status Drawer ke liye generate kiya
    // =======================================================
    const isSettled = finalNetPayout !== 0;
    const paymentStatusBadge = isSettled ?
        <span className="text-[11px] font-semibold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded border border-[#10B981]/20">Settled</span> :
        <span className="text-[11px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded border border-[#F59E0B]/20">Pending</span>;

    const oStatusColor = finalNetPayout > 0 ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' : finalNetPayout < 0 ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20';
    const oStatusLabel = finalNetPayout > 0 ? 'Delivered' : finalNetPayout < 0 ? 'Return' : 'Pending';
    // =======================================================


    const visibleTransactions = sortedTransactions.filter(txn => {
        const amt = getVal(txn, ['amount', 'invoice amount', 'total', 'net amount']);
        const cleanAmount = parseFloat(String(amt).replace(/,/g, '') || 0);
        return cleanAmount !== 0; // Sirf wahi dikhega jo 0 nahi hai
    });

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose}></div>

            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#F8FAFC] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* --- HEADER --- */}
                <div className="bg-white p-5 border-b border-[#E5E7EB] flex-shrink-0 shadow-sm relative z-10">
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-[#F1F5F9] rounded-xl text-[#6B7280] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors border border-[#E5E7EB]">
                        <X size={18} />
                    </button>

                    {/* UPDATED: Title aur Status Badges with Labels */}
                    <div className="flex flex-col gap-1.5 mb-3">
                        <h2 className="text-[18px] font-bold text-[#243463]">Reconciliation Detail</h2>
                        <div className="flex items-center gap-4 mt-0.5">
                            {/* Payment Status Label + Badge */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-semibold text-[#6B7280]">Payment:</span>
                                {paymentStatusBadge}
                            </div>

                            {/* Order Status Label + Badge */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-semibold text-[#6B7280]">Order:</span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${oStatusColor}`}>
                                    {oStatusLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                            {orderId}
                        </span>
                        <span className="text-[12px] font-semibold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-md border border-[#E5E7EB] flex items-center gap-1">
                            <Calendar size={12} className="text-[#6B7280]" />
                            {formatDate(commonDate)}
                        </span>
                        <span className="text-[12px] font-semibold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-md border border-[#E5E7EB]">
                            SKU: {commonSku}
                        </span>
                        <span className="text-[12px] font-semibold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-md border border-[#E5E7EB]">
                            Qty: {commonQty}
                        </span>
                        <span className="text-[12px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                            <Package size={12} className="text-indigo-500" />
                            WareHouse: {commonWarehouse}
                        </span>
                    </div>
                </div>
                {/* --- BODY (TIMELINE & BREAKDOWN) --- */}
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#243463]">
                            <Loader2 size={32} className="animate-spin mb-3" />
                            <p className="text-[13px] font-semibold">Loading Breakdown...</p>
                        </div>
                    ) : visibleTransactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#6B7280]">
                            <AlertCircle size={32} className="mb-3 opacity-30" />
                            <p className="text-[13px] font-semibold">No valid transactions to display.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 relative">
                            {/* NAYA: Line ab visibleTransactions ki length par depend karegi */}
                            {visibleTransactions.length > 1 && <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-[#E5E7EB] z-0"></div>}

                            {/* NAYA: sortedTransactions ki jagah visibleTransactions map hoga */}
                            {visibleTransactions.map((txn, idx) => {
                                const type = mode === 'database' ? (txn["Type"] || txn["Transaction Type"]) : (getVal(txn, ['transaction type', 'type']) || 'Unknown');
                                const date = getVal(txn, ['date', 'invoice date', 'shipment date', 'date/time', 'transaction date']);
                                const amt = getVal(txn, ['amount', 'invoice amount', 'total', 'net amount']);
                                const cleanAmount = parseFloat(String(amt).replace(/,/g, '') || 0);

                                let prodSales = parseFloat(getVal(txn, ['product sales', 'product_sales'])) || 0;
                                let promoRebates = parseFloat(getVal(txn, ['promotional rebates', 'promotional_rebates'])) || 0;
                                let salesTax = parseFloat(getVal(txn, ['total sales tax liable(gst before adjusting tcs)', 'total sales tax liable', 'platformtax', 'total_sales_tax'])) || 0;

                                const comm = parseFloat(txn["Commission"] || getVal(txn, ['selling fees', 'commission'])) || 0;
                                const ship = parseFloat(txn["ShippingFee"] || getVal(txn, ['fba fees', 'shipping fee'])) || 0;
                                const other = parseFloat(txn["OtherFees"] || getVal(txn, ['other transaction fees', 'other fees'])) || 0;
                                const tds = parseFloat(txn["TDS"] || getVal(txn, ['tds (section 194-o)', 'tds'])) || 0;

                                let tcs = parseFloat(txn["TCS"]) || 0;
                                if (!tcs) {
                                    tcs = (parseFloat(getVal(txn, ['tcs-cgst'])) || 0) +
                                        (parseFloat(getVal(txn, ['tcs-sgst'])) || 0) +
                                        (parseFloat(getVal(txn, ['tcs-igst'])) || 0);
                                }

                                let calculatedGross = prodSales + promoRebates + salesTax;
                                const calculatedDeductions = comm + ship + other + tds + tcs;
                                const isSettlement = String(type).toLowerCase().includes('settlement');

                                // REVERSE MATH FOR DATABASE MODE
                                if (mode === 'database' && isSettlement) {
                                    calculatedGross = cleanAmount - calculatedDeductions;
                                    promoRebates = 0;
                                    prodSales = calculatedGross - salesTax;
                                }

                                let icon = <Package size={16} className="text-[#10B981]" />;
                                let typeColor = "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20";

                                if (String(type).toLowerCase().includes('refund') || String(type).toLowerCase().includes('return')) {
                                    icon = <ArrowRightLeft size={16} className="text-[#F59E0B]" />;
                                    typeColor = "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20";
                                } else if (String(type).toLowerCase().includes('cancel')) {
                                    icon = <X size={16} className="text-[#EF4444]" />;
                                    typeColor = "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20";
                                } else if (isSettlement) {
                                    icon = <Receipt size={16} className="text-blue-600" />;
                                    typeColor = "bg-blue-100 text-blue-700 border border-blue-200";
                                }

                                return (
                                    <div key={idx} className="bg-white p-4 rounded-[16px] border border-[#E5E7EB] shadow-sm relative z-10 flex flex-col gap-3">

                                        {/* Card Top Title Row */}
                                        <div className="flex justify-between items-start border-b border-[#E5E7EB] pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-50 rounded-xl border border-[#E5E7EB] shadow-sm">
                                                    {icon}
                                                </div>
                                                <div>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${typeColor}`}>
                                                        {type === '-' ? 'Sale/Shipment' : type}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#6B7280]">
                                                        <Calendar size={11} /> {formatDate(date)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block text-[16px] font-bold ${cleanAmount > 0 ? 'text-[#10B981]' : cleanAmount < 0 ? 'text-[#EF4444]' : 'text-[#243463]'}`}>
                                                    ₹{cleanAmount.toFixed(2)}
                                                </span>
                                                <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase">
                                                    {isSettlement ? 'Final Net Payout' : 'Gross Value'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* --- 1. SHIPMENT / SALE CALCULATION BLOCK --- */}
                                        {(String(type).toLowerCase().includes('shipment') || String(type).toLowerCase().includes('sale') || type === '-') && (
                                            <div className="bg-[#F8FAFC] rounded-xl p-3 text-[12px] flex flex-col gap-2 border border-[#E5E7EB]">
                                                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mb-1">--- Shipment Calculation ---</div>
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Taxable Value (Gross Ex Tax):</span>
                                                    <span className="font-medium text-[#243463]">₹{parseFloat(getVal(txn, ['taxable', 'tax exclusive gross', 'tax ex gross'])) || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-[#6B7280] border-b border-slate-200 pb-1.5">
                                                    <span>Total Tax (GST):</span>
                                                    <span className="font-medium text-[#243463]">+ ₹{parseFloat(getVal(txn, ['tax', 'total tax amount', 'total tax'])) || 0}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-[#243463] pt-0.5">
                                                    <span>Total Invoice Amount:</span>
                                                    <span>₹{cleanAmount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- 2. REFUND / RETURN CALCULATION BLOCK --- */}
                                        {(String(type).toLowerCase().includes('refund') || String(type).toLowerCase().includes('return')) && (
                                            <div className="bg-[#FFFBEB] rounded-xl p-3 text-[12px] flex flex-col gap-2 border border-[#FDE68A]">
                                                <div className="text-[10px] font-bold text-amber-600 tracking-wider uppercase mb-1">--- Refund / Return Calculation ---</div>
                                                <div className="flex justify-between text-[#6B7280]">
                                                    <span>Refunded Taxable Amount:</span>
                                                    <span className="font-medium text-[#243463]">₹{parseFloat(getVal(txn, ['taxable', 'tax exclusive gross', 'tax ex gross'])) || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-[#6B7280] border-b border-amber-200 pb-1.5">
                                                    <span>Refunded Tax (GST):</span>
                                                    <span className="font-medium text-[#243463]">₹{parseFloat(getVal(txn, ['tax', 'total tax amount', 'total tax'])) || 0}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-[#EF4444] pt-0.5">
                                                    <span>Total Refunded Value:</span>
                                                    <span>₹{cleanAmount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- 3. SETTLEMENT EXPLANATION UI --- */}
                                        {isSettlement && mode === 'database' && (
                                            <div className="bg-slate-50 rounded-xl p-0 text-[12px] flex flex-col border border-slate-200 mt-1 overflow-hidden shadow-sm">

                                                <div className="bg-blue-100/50 p-2.5 border-b border-slate-200 text-center">
                                                    <span className="text-[10px] font-bold text-blue-800 tracking-wider uppercase">
                                                        --- Detailed Bank Payout Breakdown ---
                                                    </span>
                                                </div>

                                                {/* SECTION A: GROSS VALUE */}
                                                <div className="p-3 flex flex-col gap-2">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                        A. Gross Order Value {cleanAmount < 0 ? <span className="text-amber-600 lowercase capitalize">(Refunded to Customer)</span> : <span className="text-green-600 lowercase capitalize">(Customer se aaye paise)</span>}
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>Product Sales:</span>
                                                        <span className={getFeeColor(prodSales)}>{formatFee(prodSales)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>Promotional Rebates:</span>
                                                        <span className={getFeeColor(promoRebates)}>{formatFee(promoRebates)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>Total Sales Tax Liable:</span>
                                                        <span className={getFeeColor(salesTax)}>{formatFee(salesTax)}</span>
                                                    </div>

                                                    <div className="flex justify-between font-bold text-[#243463] pt-1.5 border-t border-dashed border-slate-200 items-center">
                                                        <div className="flex flex-col">
                                                            <span>Total Gross (A):</span>
                                                            <span className="text-[9px] text-slate-400 font-normal tracking-widest mt-0.5 font-mono">
                                                                {prodSales.toFixed(2)} {promoRebates >= 0 ? '+' : ''}{promoRebates.toFixed(2)} {salesTax >= 0 ? '+' : ''}{salesTax.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <span className={getFeeColor(calculatedGross)}>{formatFee(calculatedGross)}</span>
                                                    </div>
                                                </div>

                                                {/* SECTION B: DEDUCTIONS */}
                                                <div className="p-3 flex flex-col gap-2 bg-red-50/30 border-t border-slate-200">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                        B. Marketplace Deductions (Fees & Taxes)
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>Commission Fee:</span>
                                                        <span className={getFeeColor(comm)}>{formatFee(comm)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>FBA / Shipping Fees:</span>
                                                        <span className={getFeeColor(ship)}>{formatFee(ship)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>TDS + TCS:</span>
                                                        <span className={getFeeColor(tds + tcs)}>{formatFee(tds + tcs)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[#6B7280]">
                                                        <span>Other / Fixed Fees:</span>
                                                        <span className={getFeeColor(other)}>{formatFee(other)}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-[#EF4444] pt-1.5 border-t border-dashed border-slate-200">
                                                        <span>Total Deductions (B):</span>
                                                        <span className={getFeeColor(calculatedDeductions)}>{formatFee(calculatedDeductions)}</span>
                                                    </div>
                                                </div>

                                                {/* SECTION C: FINAL MATH */}
                                                <div className="p-3 bg-blue-50/50 border-t border-blue-100 flex flex-col gap-1.5">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                        C. Final Math (Net Bank Payout)
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-[#6B7280]">
                                                        <span>Gross (A) + Deductions (B):</span>
                                                        <span className="font-mono">
                                                            {calculatedGross < 0 ? `(${calculatedGross.toFixed(2)})` : calculatedGross.toFixed(2)} + {calculatedDeductions < 0 ? `(${calculatedDeductions.toFixed(2)})` : calculatedDeductions.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-extrabold text-[13px] pt-1.5 border-t border-blue-200">
                                                        <span className="text-[#243463]">Net Payout Received:</span>
                                                        <span className={cleanAmount > 0 ? 'text-[#10B981]' : cleanAmount < 0 ? 'text-[#EF4444]' : 'text-[#243463]'}>
                                                            {cleanAmount < 0 ? `- ₹${Math.abs(cleanAmount).toFixed(2)}` : `₹${cleanAmount.toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* --- FOOTER (FINAL RECONCILIATION SUMMARY) --- */}
                {!isLoading && sortedTransactions.length > 0 && (
                    <div className="bg-white border-t border-[#E5E7EB] p-5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 z-20">
                        <h3 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <AlertCircle size={14} /> Overall Final Status
                        </h3>

                        {/* NAYA: TABS SWITCHER */}
                        <div className="flex bg-[#F1F5F9] rounded-lg p-1 mb-4 border border-[#E5E7EB]">
                            <button
                                onClick={() => setActiveTab('payout')}
                                className={`flex-1 text-[12px] font-bold py-1.5 rounded-md transition-colors ${activeTab === 'payout' ? 'bg-white text-[#243463] shadow-sm' : 'text-[#6B7280] hover:text-[#243463]'}`}
                            >
                                Net Payout
                            </button>
                            <button
                                onClick={() => setActiveTab('deductions')}
                                className={`flex-1 text-[12px] font-bold py-1.5 rounded-md transition-colors ${activeTab === 'deductions' ? 'bg-white text-[#243463] shadow-sm' : 'text-[#6B7280] hover:text-[#243463]'}`}
                            >
                                Fee Deductions
                            </button>
                        </div>

                        {/* TAB 1: PAYOUT VIEW */}
                        {activeTab === 'payout' && (
                            <div className="animate-in fade-in duration-200">
                                {settlementDetails.length > 0 ? (
                                    settlementDetails.map((settlement, idx) => (
                                        <div key={idx} className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                            <span>Settlement Entry {settlementDetails.length > 1 ? `(${idx + 1})` : ''}:</span>
                                            <span className={getFeeColor(settlement.amount)}>{formatFee(settlement.amount)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                        <span>Settlement Bank Payout:</span>
                                        <span className="text-[#6B7280]">Pending / Data Not Found</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E5E7EB]">
                                    <span className="text-[14px] font-bold text-[#243463]">Total Calculated Net Payout:</span>
                                    <div className={`flex items-center gap-1.5 text-[18px] font-extrabold ${isLoss ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                                        {isLoss ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                        {formatFee(finalNetPayout)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DEDUCTIONS VIEW */}
                        {activeTab === 'deductions' && (
                            <div className="animate-in fade-in duration-200">
                                <div className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                    <span>Commission Fees:</span>
                                    <span className={getFeeColor(totalComm)}>{formatFee(totalComm)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                    <span>Shipping / FBA Fees:</span>
                                    <span className={getFeeColor(totalShip)}>{formatFee(totalShip)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                    <span>TCS Deducted:</span>
                                    <span className={getFeeColor(totalTcs)}>{formatFee(totalTcs)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2 text-[13px] font-medium text-[#4B5563]">
                                    <span>TDS Deducted:</span>
                                    <span className={getFeeColor(totalTds)}>{formatFee(totalTds)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-3 text-[13px] font-medium text-[#4B5563]">
                                    <span>Other / Closing Fees:</span>
                                    <span className={getFeeColor(totalOther)}>{formatFee(totalOther)}</span>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
                                    <span className="text-[14px] font-bold text-[#243463]">Total Calculated Deducted:</span>
                                    <div className="flex items-center gap-1.5 text-[16px] font-extrabold text-[#EF4444]">
                                        {formatFee(totalDeductions)}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </>
    );
};

export default OrderDrawer;