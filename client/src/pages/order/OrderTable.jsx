import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Calendar, MoreVertical } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

const OrderTable = ({ state, handlers }) => {
    const { isProcessing, mode, reportCategory, currentRows, currentPage, rowsPerPage } = state;

    // --- UPDATED getVal: Flipkart ke Enter (\n) aur extra spaces ko fix karne ke liye ---
    const getVal = (obj, possibleKeys) => {
        const lowerObj = {};
        for (let k in obj) {
            const cleanKey = k.toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            lowerObj[cleanKey] = obj[k];
        }
        for (let pk of possibleKeys) {
            const cleanPk = pk.toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            if (lowerObj[cleanPk] !== undefined && lowerObj[cleanPk] !== '') {
                return lowerObj[cleanPk];
            }
        }
        return '-';
    };

    // NAYA: Check karo ki kya data me kisi bhi row ke paas Buyer Name ya GSTIN hai?
    const hasBuyerDetails = currentRows.some(order => {
        // NAYA: Database mode aur Preview mode dono ka fallback pakadne ke liye
        const bName = mode === 'database' ? order["Buyer Name"] : getVal(order, ['buyer name', 'buyer', 'customer name']);
        const bGst = mode === 'database' ? order["Buyer GSTIN"] : getVal(order, ['customer bill to gstid', 'buyer gst', 'customer gstin', 'buyer gstin']);

        // Agar inme se ek bhi valid string hai jo '-' nahi hai
        return (bName && bName !== '-' && bName !== '') || (bGst && bGst !== '-' && bGst !== '');
    });
    // --- UPDATED getColumns ---
    const getColumns = () => {
        if (mode === 'preview' && reportCategory === 'settlement') {
            let cols = ['#', 'Date', 'Order Id'];
            // NAYA: Settlement Preview me bhi condition lagayi
            if (hasBuyerDetails) { cols.push('Buyer Name', 'Buyer GSTIN'); }
            cols.push('Sales Tax', 'TCS-CGST', 'TCS-SGST', 'TCS-IGST', 'TDS', 'Commission Fees', 'Shipping + Pick Pack', 'Other Fees', 'Collection Fees', 'Net Amount', 'Warehouse ID');
            return cols;
        }

        let cols = ['#'];
        if (mode === 'database') { cols.push('Marketplace', 'Report Type'); }
        cols.push('Order Id');
        if (hasBuyerDetails) { cols.push('Buyer Name', 'Buyer GSTIN'); }
        cols.push('Invoice Date', 'SKU', 'Quantity', 'Invoice Amount', 'Tax Ex Gross', 'Total Tax');

        if (mode === 'database') {
            cols.push('Sales Tax', 'TCS-CGST', 'TCS-SGST', 'TCS-IGST', 'TDS', 'Commission Fees', 'FBA Fees', 'Other Fees', 'Collection Fees', 'Settlement Total', 'Payment Status', 'Order Status', 'Warehouse ID');
        } else {
            cols.push('Warehouse ID');
        }
        return cols;
    };

    const cleanAmt = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
    const getColorClass = (amount) => amount > 0 ? 'text-[#10B981]' : amount < 0 ? 'text-[#EF4444]' : 'text-[#6B7280]';
    const getOrderStatus = (val) => val > 0 ? { label: 'Delivered', color: 'bg-[#10B981]/10 text-[#10B981]' } : val < 0 ? { label: 'Return', color: 'bg-[#EF4444]/10 text-[#EF4444]' } : { label: 'Pending', color: 'bg-[#F59E0B]/10 text-[#F59E0B]' };

    // ==========================================
    // NAYA: Columns Show/Hide State & Logic
    // ==========================================
    const [hiddenColumns, setHiddenColumns] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Bahar click karne par popup close karna
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (col) => {
        setHiddenColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    };

    const isColVisible = (col) => !hiddenColumns.includes(col);
    const allAvailableColumns = getColumns();
    // ==========================================
    return (
        <div className="flex flex-col flex-1 min-h-0 relative">

            {/* --- NAYA: 3-Dot Button & Popup Menu --- */}
            <div className="flex justify-end px-4 py-2 bg-white/50 border-b border-[#E5E7EB] z-30" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors border border-transparent hover:border-slate-200"
                    title="Manage Columns"
                >
                    <MoreVertical size={18} />
                </button>

                {isMenuOpen && (
                    <div className="absolute top-12 right-4 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-50 py-2 max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="px-3 pb-2 mb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Manage Columns
                        </div>
                        {allAvailableColumns.map(col => (
                            <label key={col} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-[13px] text-slate-700">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-[#243463] focus:ring-[#243463] cursor-pointer"
                                    checked={!hiddenColumns.includes(col)}
                                    onChange={() => toggleColumn(col)}
                                />
                                <span className="truncate select-none">{col}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* --- ORIGINAL TABLE WRAPPER --- */}
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
                                {/* NAYA: Sirf visible columns hi header me map honge */}
                                {allAvailableColumns.filter(isColVisible).map((head, index) => (
                                    <th key={index} className="py-4 px-4 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap sticky top-0 bg-[#F8FAFC] z-10 shadow-[0_1px_0_#E5E7EB]">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {currentRows.length === 0 ? (
                                <tr><td colSpan={25} className="py-10 text-center text-[14px] text-[#6B7280]">No data found matching your filters.</td></tr>
                            ) : (
                                currentRows.map((order, idx) => {
                                    const actualIndex = ((currentPage - 1) * rowsPerPage) + idx + 1;

                                    const buyerName = getVal(order, ['buyer name', 'buyer', 'customer name']);
                                    const buyerGst = getVal(order, ['customer bill to gstid', 'buyer gst', 'customer gstin', 'buyer gstin']);

                                    // ===============================================
                                    // 1. SETTLEMENT PREVIEW BLOCK
                                    // ===============================================
                                    if (mode === 'preview' && reportCategory === 'settlement') {
                                        const tDate = getVal(order, ['payment date', 'date/time', 'transaction date', 'date', 'invoice date']);
                                        const oId = getVal(order, ['order id', 'order_id', 'settlement_ref_no']);
                                        const sTax = cleanAmt(getVal(order, ['total sales tax liable(gst before adjusting tcs)', 'total sales tax liable', 'gst before adjusting tcs']));
                                        const cgst = cleanAmt(getVal(order, ['tcs-cgst', 'tcs cgst', 'cgst amount', 'cgst']));
                                        const sgst = cleanAmt(getVal(order, ['tcs-sgst', 'tcs sgst', 'sgst amount', 'sgst']));
                                        const igst = cleanAmt(getVal(order, ['tcs-igst', 'tcs igst', 'igst amount', 'igst', 'TCS (Rs.)']));
                                        const tds = cleanAmt(getVal(order, ['TDS (Rs.)', 'tds', 'section 194-o', '194-o']));
                                        const sFees = cleanAmt(getVal(order, ['commission (rs.)', 'commission', 'selling fees', 'marketplace fee']));
                                        const amzFba = cleanAmt(getVal(order, ['fba fees', 'shipping fee', 'shipping']));
                                        const pickPack = cleanAmt(getVal(order, ['pick and pack fee (rs.)', 'pick and pack fee']));
                                        const flipkartShip = cleanAmt(getVal(order, ['shipping fee (rs.)']));
                                        const reverseShip = cleanAmt(getVal(order, ['reverse shipping fee (rs.)', 'reverse shipping fee']));
                                        const fbaFees = amzFba + pickPack + flipkartShip + reverseShip;
                                        const fixedFee = cleanAmt(getVal(order, ['fixed fee (rs.)', 'fixed fee', 'other transaction fees', 'other fees']));
                                        const collectionFee = cleanAmt(getVal(order, ['collection fee (rs.)', 'collection fee']));
                                        const otherFees = fixedFee;
                                        const amt = cleanAmt(getVal(order, ['bank settlement value (rs.) = sum(j:r)', 'bank settlement value (rs.)', 'bank settlement value', 'total', 'amount', 'net amount', 'total amount']));

                                        let displayWarehouse = order["Warehouse Id"] || order["Warehouse ID"] || getVal(order, ['warehouse id', 'fulfillment center', 'warehouse']);
                                        if (!displayWarehouse || String(displayWarehouse).trim() === '-' || String(displayWarehouse).trim() === '' || String(displayWarehouse).trim().toLowerCase() === 'na') {
                                            displayWarehouse = 'crasome';
                                        }

                                        return (
                                            <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                                {isColVisible('#') && <td className="py-3 px-4 text-[13px] text-[#6B7280]">{actualIndex}</td>}
                                                {isColVisible('Date') && (
                                                    <td className="py-3 px-4 text-[13px] whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-1 rounded-md w-max">
                                                            <Calendar size={12} className="text-[#6B7280]" />
                                                            <span className="font-medium text-[#243463] text-[12px]">{formatDate(tDate)}</span>
                                                        </div>
                                                    </td>
                                                )}
                                                {isColVisible('Order Id') && (
                                                    <td className="py-3 px-4 text-[13px] font-bold text-[#243463] whitespace-nowrap">
                                                        {oId}
                                                    </td>
                                                )}
                                                {hasBuyerDetails && isColVisible('Buyer Name') && <td className="py-3 px-4 text-[13px] text-[#243463] whitespace-nowrap">{buyerName}</td>}
                                                {hasBuyerDetails && isColVisible('Buyer GSTIN') && <td className="py-3 px-4 text-[13px] text-[#6B7280] whitespace-nowrap">{buyerGst}</td>}

                                                {isColVisible('Sales Tax') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sTax)}`}>{sTax}</td>}
                                                {isColVisible('TCS-CGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(cgst)}`}>{cgst}</td>}
                                                {isColVisible('TCS-SGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sgst)}`}>{sgst}</td>}
                                                {isColVisible('TCS-IGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(igst)}`}>{igst}</td>}
                                                {isColVisible('TDS') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(tds)}`}>{tds}</td>}
                                                {isColVisible('Commission Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(sFees)}`}>{sFees}</td>}
                                                {isColVisible('Shipping + Pick Pack') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(fbaFees)}`}>{fbaFees.toFixed(2)}</td>}
                                                {isColVisible('Other Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(otherFees)}`}>{otherFees.toFixed(2)}</td>}
                                                {isColVisible('Collection Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(collectionFee)}`}>{collectionFee.toFixed(2)}</td>}
                                                {isColVisible('Net Amount') && <td className={`py-3 px-4 text-[13px] font-bold ${getColorClass(amt)}`}>₹{amt.toFixed(2)}</td>}
                                                {isColVisible('Warehouse ID') && (
                                                    <td className="py-3 px-4 text-[13px] text-[#6B7280] whitespace-nowrap">
                                                        <span className="bg-gray-100 border border-gray-200 px-2 py-1 rounded-md">{displayWarehouse}</span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    }

                                    // ===============================================
                                    // 2. DATABASE & SALES PREVIEW BLOCK
                                    // ===============================================
                                    const oId = getVal(order, ['order id', 'order_id']);
                                    const invDate = getVal(order, ['invoice date', 'order date', 'date']);
                                    const skuVal = getVal(order, ['sku']);
                                    const qtyVal = getVal(order, ['quantity', 'item quantity', 'qty']);

                                    // UPDATED: Buyer Info nikalna Database row ya getVal se
                                    const bNameRaw = mode === 'database' ? order["Buyer Name"] : getVal(order, ['buyer name', 'buyer', 'customer name']);
                                    const bGstRaw = mode === 'database' ? order["Buyer GSTIN"] : getVal(order, ['customer bill to gstid', 'buyer gst', 'customer gstin', 'buyer gstin']);

                                    // Agar '-' hai toh use ekdum halka grey 'N/A' bana do
                                    const buyerNameDisplay = (!bNameRaw || bNameRaw === '-') ? <span className="text-slate-300 italic text-[11px]">N/A</span> : bNameRaw;
                                    const buyerGstDisplay = (!bGstRaw || bGstRaw === '-') ? <span className="text-slate-300 italic text-[11px]">N/A</span> : bGstRaw;

                                    const invAmt = cleanAmt(getVal(order, ['invoice amount', 'total amount', 'price after discount']));
                                    const taxGross = cleanAmt(getVal(order, ['tax exclusive gross', 'tax ex gross', 'taxable value']));
                                    const totalTax = cleanAmt(getVal(order, ['total tax amount', 'total tax', 'tax'])); const settlementTotal = parseFloat(order["Settlement Total"]) || 0;
                                    const isSettled = settlementTotal !== 0;
                                    const oStatus = getOrderStatus(settlementTotal);

                                    let displayWarehouse = order["Warehouse ID"] || order["Warehouse Id"] || getVal(order, ['warehouse id', 'fulfillment center', 'warehouse']);
                                    if (!displayWarehouse || String(displayWarehouse).trim() === '-' || String(displayWarehouse).trim() === '' || String(displayWarehouse).trim().toLowerCase() === 'na') {
                                        displayWarehouse = 'crasome';
                                    }

                                    return (
                                        <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                            {isColVisible('#') && <td className="py-3 px-4 text-[13px] text-[#6B7280]">{actualIndex}</td>}

                                            {mode === 'database' && (
                                                <>
                                                    {isColVisible('Marketplace') && <td className="py-3 px-4 whitespace-nowrap"><span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-[#243463]/10 text-[#243463]">{order["Marketplace"] || '-'}</span></td>}
                                                    {isColVisible('Report Type') && <td className="py-3 px-4 whitespace-nowrap"><span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-600 border border-blue-100">{order["Report Type"] || '-'}</span></td>}
                                                </>
                                            )}

                                            {isColVisible('Order Id') && (
                                                <td
                                                    onClick={() => mode === 'database' ? handlers.handleOpenDrawer(oId) : undefined}
                                                    className={`py-3 px-4 text-[13px] font-bold whitespace-nowrap ${mode === 'database' ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-[#243463]'}`}
                                                >
                                                    {oId === '-' ? '-' : oId}
                                                </td>
                                            )}

                                            {hasBuyerDetails && isColVisible('Buyer Name') && (
                                                <td className="py-3 px-4 text-[13px] text-[#243463] whitespace-nowrap">
                                                    {buyerNameDisplay}
                                                </td>
                                            )}
                                            {hasBuyerDetails && isColVisible('Buyer GSTIN') && (
                                                <td className="py-3 px-4 text-[13px] text-[#6B7280] whitespace-nowrap">
                                                    {buyerGstDisplay}
                                                </td>
                                            )}
                                            {isColVisible('Invoice Date') && (
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2 py-1 rounded-md w-max shadow-sm"><Calendar size={12} className="text-[#6B7280]" /><span className="font-medium text-[#243463] text-[12px]">{formatDate(invDate)}</span></div>
                                                </td>
                                            )}

                                            {isColVisible('SKU') && <td className="py-3 px-4 text-[13px]"><span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-slate-700 whitespace-nowrap">{skuVal === '-' ? '-' : skuVal}</span></td>}
                                            {isColVisible('Quantity') && <td className="py-3 px-4 text-[13px] text-[#6B7280]">{qtyVal === '-' ? 0 : qtyVal}</td>}
                                            {isColVisible('Invoice Amount') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(invAmt)}`}>₹{invAmt.toFixed(2)}</td>}
                                            {isColVisible('Tax Ex Gross') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(taxGross)}`}>₹{taxGross.toFixed(2)}</td>}
                                            {isColVisible('Total Tax') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(totalTax)}`}>₹{totalTax.toFixed(2)}</td>}

                                            {mode === 'database' && (
                                                <>
                                                    {isColVisible('Sales Tax') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Sales Tax"])}`}>{order["Sales Tax"] || 0}</td>}
                                                    {isColVisible('TCS-CGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-CGST"])}`}>{order["TCS-CGST"] || 0}</td>}
                                                    {isColVisible('TCS-SGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-SGST"])}`}>{order["TCS-SGST"] || 0}</td>}
                                                    {isColVisible('TCS-IGST') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TCS-IGST"])}`}>{order["TCS-IGST"] || 0}</td>}
                                                    {isColVisible('TDS') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["TDS"])}`}>{order["TDS"] || 0}</td>}
                                                    {isColVisible('Commission Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Selling Fees"])}`}>{order["Selling Fees"] || 0}</td>}
                                                    {isColVisible('FBA Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["FBA Fees"])}`}>{order["FBA Fees"] || 0}</td>}
                                                    {isColVisible('Other Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Other Fees"])}`}>{order["Other Fees"] || 0}</td>}
                                                    {isColVisible('Collection Fees') && <td className={`py-3 px-4 text-[13px] font-medium ${getColorClass(order["Collection Fees"])}`}>{order["Collection Fees"] || 0}</td>}
                                                    {isColVisible('Settlement Total') && <td className={`py-3 px-4 text-[13px] font-bold ${getColorClass(settlementTotal)}`}>₹{settlementTotal.toFixed(2)}</td>}
                                                    {isColVisible('Payment Status') && <td className="py-3 px-4 text-[13px]"><span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${isSettled ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>{isSettled ? 'Settled' : 'Pending'}</span></td>}
                                                    {isColVisible('Order Status') && <td className="py-3 px-4 text-[13px]"><span className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${oStatus.color}`}>{oStatus.label}</span></td>}
                                                </>
                                            )}

                                            {isColVisible('Warehouse ID') && (
                                                <td className="py-3 px-4 text-[13px] text-[#6B7280] whitespace-nowrap">
                                                    <span className="bg-gray-100 border border-gray-200 px-2 py-1 rounded-md">{displayWarehouse}</span>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default OrderTable;