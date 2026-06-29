import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../../services/api';
import SkuDrawer from './SkuDrawer'; // <-- NAYA: Path apne folder ke hisaab se check kar lena

const Sku = () => {
    const [skuData, setSkuData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarketplace, setSelectedMarketplace] = useState('All');

    // NAYA: Date Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // DRAWER STATES
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedSkuData, setSelectedSkuData] = useState(null);

    // SKU pe click handle karne ka function
    const handleSkuClick = (item) => {
        setSelectedSkuData(item);
        setIsDrawerOpen(true);
    };

    // NAYA: Sorting States
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 inline text-gray-400 opacity-50" />;
        if (sortConfig.direction === 'ascending') return <ArrowUp size={12} className="ml-1 inline text-[#243463]" />;
        return <ArrowDown size={12} className="ml-1 inline text-[#243463]" />;
    };

    // Page load hote hi data fetch karenge
    useEffect(() => {
        fetchSkuData();
    }, [startDate, endDate]);

    const fetchSkuData = async () => {
        try {
            // Backend me jo route banaya tha '/sku-analytics', use yahan call kiya hai
            const response = await api.get('/sku-analytics', {
                params: { startDate, endDate }
            })
            if (response.data.success) {
                setSkuData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching SKU data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter ke liye unique marketplaces nikalna
    const uniqueMarketplaces = useMemo(() => {
        const mps = new Set(skuData.map(item => item.Marketplace).filter(Boolean));
        return ['All', ...Array.from(mps)];
    }, [skuData]);

    // Search aur Dropdown ke hisaab se data filter karna
    // Search, Dropdown aur DATE RATIO ke hisaab se data filter karna
    const filteredData = useMemo(() => {
        let result = skuData;

        if (selectedMarketplace !== 'All') {
            result = result.filter(item => item.Marketplace === selectedMarketplace);
        }

        if (searchTerm.trim() !== '') {
            result = result.filter(item =>
                String(item.SKU).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // =======================================================
        // --- NAYA LOGIC: PRORATED AD SPEND & ORDERS CALCULATION ---
        // =======================================================
        let ratio = 1; // Default 1 rahega (matlab full month ka data)

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end >= start) {
                // 1. Kitne din select kiye hain? (e.g., 1 Jan se 7 Jan = 7 days)
                const diffTime = Math.abs(end - start);
                const selectedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                // 2. Start Date wale mahine me total kitne din hote hain? (e.g., Jan = 31)
                const year = start.getFullYear();
                const month = start.getMonth(); // 0-indexed hota hai
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // 3. Ratio nikal lo (e.g., 7 / 31 = 0.2258)
                ratio = selectedDays / daysInMonth;
            }
        }

        // Data ko map karke ratio apply karna aur return karna
        // Data ko map karke ratio apply karna aur return karna
        return result.map(item => {
            const rawAdSpend = parseFloat(item.Total_Ad_Spend) || 0;
            const rawAdOrders = parseInt(item.Ad_Orders) || 0;
            const totalOrders = parseInt(item.Total_Orders) || 0;

            // NAYA: Raw Storage Fee
            const rawStorageFee = parseFloat(item.Total_Storage_Fee) || 0;
            const rawPromoDiscount = parseFloat(item.Total_Promo_Discount) || 0;

            const proratedAdSpend = rawAdSpend * ratio;
            const proratedAdOrders = Math.round(rawAdOrders * ratio);
            const calculatedOrganicOrders = totalOrders - proratedAdOrders;

            // NAYA: Prorated Storage Fee
            const proratedStorageFee = rawStorageFee * ratio;

            // NAYA: Raw Promo Discount
            const proratedPromoDiscount = rawPromoDiscount * ratio;

            return {
                ...item,
                Total_Ad_Spend: proratedAdSpend,
                Ad_Orders: proratedAdOrders,
                Organic_Orders: calculatedOrganicOrders,
                // NAYA
                Total_Storage_Fee: proratedStorageFee,
                Total_Promo_Discount: proratedPromoDiscount
            };
        });
    }, [skuData, selectedMarketplace, searchTerm, startDate, endDate]); // Dependencies me dates add karni zaroori hain

    // NAYA: Filtered data ko sort karne ka logic
    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key] || 0;
                let bValue = b[sortConfig.key] || 0;

                // String values (jaise SKU Name aur Marketplace) ke liye
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                } else {
                    // Numbers ke liye
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);


    // Amount ko format karne ka function
    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toFixed(2)}`;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] max-h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden m-4">

            {/* --- HEADER & FILTERS --- */}
            <div className="p-5 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    {/* NAYA: Icon ka color apne theme color (#243463) me kar diya */}
                    <div className="p-2 bg-[#243463]/10 text-[#243463] rounded-lg">
                        <Package size={20} />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-bold text-[#243463]">
                            SKU Analytics
                        </h2>
                        <p className="text-[12px] text-[#6B7280]">
                            Manage and track your SKU performance
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Total Rows Badge */}
                    <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-3 py-2 rounded-lg shadow-sm">
                        <span className="text-[12px] font-semibold text-[#6B7280]">
                            Rows:
                        </span>
                        {/* NAYA: Badge ka color apne theme color me kar diya */}
                        <span className="text-[13px] font-bold text-[#243463] bg-[#243463]/10 px-2 py-0.5 rounded-md">
                            {filteredData.length}
                        </span>
                    </div>
                    {/* Search Bar */}
                    <div className="flex items-center border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white min-w-[220px] shadow-sm">
                        <Search size={15} className="text-[#6B7280] mr-2" />
                        <input
                            type="text"
                            placeholder="Search SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-[13px] text-[#243463] w-full placeholder-[#9CA3AF]"
                        />
                    </div>

                    {/* Marketplace Filter */}
                    {uniqueMarketplaces.length > 1 && (
                        <div className="flex items-center border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white shadow-sm">
                            <Filter size={15} className="text-[#6B7280] mr-2" />
                            <select
                                value={selectedMarketplace}
                                onChange={(e) => setSelectedMarketplace(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] text-[#243463] cursor-pointer font-medium"
                            >
                                {uniqueMarketplaces.map((mp, i) => (
                                    <option key={i} value={mp}>
                                        {mp === 'All' ? 'Platform: All' : mp}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white shadow-sm">
                        <span className="text-[12px] font-semibold text-[#6B7280] ml-1">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer"
                        />
                        <span className="text-[12px] font-semibold text-[#6B7280] border-l border-[#E5E7EB] pl-2">To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer"
                        />
                        {/* Clear Date Button */}
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="ml-1 text-[11px] bg-red-50 text-red-500 hover:bg-red-100 px-2 py-1 rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* --- TABLE AREA --- */}
            <div className="flex-1 min-h-0 overflow-hidden">

                <div className="h-full w-full overflow-auto custom-scrollbar relative">

                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 min-h-[300px]">
                            <Loader2
                                size={32}
                                className="animate-spin text-[#243463] mb-3"
                            />
                            <p className="text-[14px] font-medium text-[#243463]">
                                Loading SKU Data...
                            </p>
                        </div>
                    ) : (
                        <table className="min-w-max w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] shadow-[0_1px_0_#E5E7EB]">#</th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] shadow-[0_1px_0_#E5E7EB] min-w-[250px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('SKU')}>
                                        SKU Name {renderSortIcon('SKU')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] shadow-[0_1px_0_#E5E7EB] min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Marketplace')}>
                                        Marketplace {renderSortIcon('Marketplace')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Orders')}>
                                        Total Orders {renderSortIcon('Total_Orders')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Ad_Orders')}>
                                        Ad Orders {renderSortIcon('Ad_Orders')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[110px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Organic_Orders')}>
                                        Organic Orders {renderSortIcon('Organic_Orders')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Quantity')}>
                                        Total Qty {renderSortIcon('Total_Quantity')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Shipment_Quantity')}>
                                        Shipment {renderSortIcon('Shipment_Quantity')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Refund_Quantity')}>
                                        Refund {renderSortIcon('Refund_Quantity')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Cancel_Quantity')}>
                                        Cancel {renderSortIcon('Cancel_Quantity')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-center shadow-[0_1px_0_#E5E7EB] min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Replacement_Quantity')}>
                                        Replace {renderSortIcon('Replacement_Quantity')}
                                    </th>

                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-right shadow-[0_1px_0_#E5E7EB] min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Sales_Amount')}>
                                        Total Sales {renderSortIcon('Total_Sales_Amount')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-right shadow-[0_1px_0_#E5E7EB] min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Settlement_Amount')}>
                                        Settlement {renderSortIcon('Total_Settlement_Amount')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-right shadow-[0_1px_0_#E5E7EB] min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Ad_Spend')}>
                                        Ad Spend {renderSortIcon('Total_Ad_Spend')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-right shadow-[0_1px_0_#E5E7EB] min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Storage_Fee')}>
                                        Storage Fee {renderSortIcon('Total_Storage_Fee')}
                                    </th>
                                    <th className="sticky top-0 z-20 py-4 px-5 bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#6B7280] text-right shadow-[0_1px_0_#E5E7EB] min-w-[130px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('Total_Promo_Discount')}>
                                        Promo Discount {renderSortIcon('Total_Promo_Discount')}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {sortedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="py-10 text-center text-[14px] text-[#6B7280]">
                                            No SKU found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedData.map((item, idx) => (
                                        <tr key={idx} className="border-b border-[#E5E7EB] hover:bg-[#F8FAFC]/50 transition-colors">
                                            <td className="py-3 px-5 text-[13px] text-[#6B7280]">{idx + 1}</td>

                                            <td
                                                className="py-3 px-5 text-[13px] font-bold text-blue-600 cursor-pointer hover:underline hover:text-blue-800 whitespace-nowrap transition-colors"
                                                onClick={() => handleSkuClick(item)}
                                            >
                                                {item.SKU}
                                            </td>

                                            <td className="py-3 px-5 text-[13px] whitespace-nowrap">
                                                <span className="px-2.5 py-1 rounded-md font-semibold text-[11px] bg-[#243463]/10 text-[#243463]">
                                                    {item.Marketplace || "-"}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] font-medium text-[#4B5563] text-center">
                                                {item.Total_Orders || 0}
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-teal-50 text-teal-600 px-2.5 py-1 rounded-md font-semibold border border-teal-100">
                                                    {item.Ad_Orders || 0}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md font-bold border border-green-200">
                                                    {item.Organic_Orders || 0}
                                                </span>
                                            </td>


                                            <td className="py-3 px-5 text-[13px] font-medium text-center">
                                                <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded border border-slate-200">
                                                    {item.Total_Quantity || 0}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-semibold border border-blue-100">
                                                    {item.Shipment_Quantity || 0}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md font-semibold border border-red-100">
                                                    {item.Refund_Quantity || 0}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md font-semibold border border-orange-100">
                                                    {item.Cancel_Quantity || 0}
                                                </span>
                                            </td>

                                            <td className="py-3 px-5 text-[13px] text-center">
                                                <span className="bg-[#243463]/10 text-[#243463] px-2.5 py-1 rounded-md font-semibold border border-[#243463]/20">
                                                    {item.Replacement_Quantity || 0}
                                                </span>
                                            </td>

                                            <td className={`py-3 px-5 text-[13px] font-bold text-right whitespace-nowrap ${parseFloat(item.Total_Sales_Amount || 0) >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                                                {formatCurrency(item.Total_Sales_Amount || 0)}
                                            </td>

                                            <td className={`py-3 px-5 text-[13px] font-bold text-right whitespace-nowrap ${parseFloat(item.Total_Settlement_Amount || 0) >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                                                {formatCurrency(item.Total_Settlement_Amount || 0)}
                                            </td>

                                            <td className="py-3 px-5 text-[13px] font-bold text-red-500 text-right whitespace-nowrap">
                                                -{formatCurrency(item.Total_Ad_Spend || 0)}
                                            </td>
                                            <td className="py-3 px-5 text-[13px] font-bold text-red-500 text-right whitespace-nowrap">
                                                -{formatCurrency(item.Total_Storage_Fee || 0)}
                                            </td>
                                            <td className="py-3 px-5 text-[13px] font-bold text-red-500 text-right whitespace-nowrap">
                                                {formatCurrency(item.Total_Promo_Discount || 0)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>)}
                </div>
            </div>

            {/* NAYA: Component based Drawer Call */}
            <SkuDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                data={selectedSkuData}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default Sku;