import React, { useState, useEffect } from 'react';
import { X, Calendar, Activity, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, BarChart, Bar } from 'recharts';
import api from '../../services/api';

const SkuDrawer = ({ isOpen, onClose, data, formatCurrency }) => {
    const [activeTab, setActiveTab] = useState('qty_finance');

    // Graph States
    const [timeFilter, setTimeFilter] = useState('1M');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [graphData, setGraphData] = useState([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);

    // NAYA: GroupBy state (Day, Week, Month)
    const [groupBy, setGroupBy] = useState('day');

    // NAYA: 2 aur states add karni hain
    const [adGraphData, setAdGraphData] = useState([]);
    const [storageGraphData, setStorageGraphData] = useState([]);

    // Helper Function mahine ka naam theek karne ke liye (e.g. "2026-01" -> "Jan 2026")
    const formatMonthYear = (myStr) => {
        if (!myStr) return '';
        const [y, m] = myStr.split('-');
        const date = new Date(y, m - 1, 1);
        return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };

    // Graph Data Fetcher
    useEffect(() => {
        if (!isOpen || !data?.SKU || activeTab !== 'trends') return;
        if (timeFilter === 'CUSTOM' && (!customDates.start || !customDates.end)) return;

        const fetchGraphData = async () => {
            setIsGraphLoading(true);
            try {
                const { startDate, endDate } = getCalculatedDates(timeFilter);

                const response = await api.get('/sku-timeline', {
                    params: {
                        sku: data.SKU,
                        marketplace: data.Marketplace,
                        startDate,
                        endDate,
                        groupBy
                    }
                });

                if (response.data.success) {
                    // 1. Sales Data
                    const formattedSales = response.data.data.salesData.map(item => {
                        const dateObj = new Date(item.exact_date);
                        let displayTime = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        if (groupBy === 'month') displayTime = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                        if (groupBy === 'week') displayTime = `Week of ${displayTime}`;
                        return {
                            ...item,
                            displayTime,
                            Total_Quantity: Number(item.Total_Quantity || 0),
                            Refund_Quantity: Number(item.Refund_Quantity || 0)
                        };
                    });
                    setGraphData(formattedSales);

                    // 2. Ad Spend Data
                    const formattedAds = response.data.data.adSpendData.map(item => ({
                        ...item,
                        displayTime: formatMonthYear(item.month_year),
                        Total_Ad_Spend: Number(item.Total_Ad_Spend || 0)
                    }));
                    setAdGraphData(formattedAds);

                    // 3. Storage Fee Data
                    const formattedStorage = response.data.data.storageData.map(item => ({
                        ...item,
                        displayTime: formatMonthYear(item.month_year),
                        Total_Storage_Fee: Number(item.Total_Storage_Fee || 0)
                    }));
                    setStorageGraphData(formattedStorage);
                }
            } catch (error) {
                console.error("Failed to fetch graph data", error);
            } finally {
                setIsGraphLoading(false);
            }
        };

        fetchGraphData();
    }, [isOpen, data, activeTab, timeFilter, customDates, groupBy]);


    const handleTimeFilterChange = (f) => {
        setTimeFilter(f);
        if (f === '1M') setGroupBy('day');
        else if (f === '3M') setGroupBy('week');
        else if (f === '6M' || f === '1Y') setGroupBy('month');
        else setGroupBy('day'); // CUSTOM
    };

    // Date Calculator Function (Isme se purana groupBy logic hata diya hai)
    const getCalculatedDates = (filter) => {
        const end = new Date();
        const start = new Date();

        if (filter === '1M') start.setMonth(start.getMonth() - 1);
        else if (filter === '3M') start.setMonth(start.getMonth() - 3);
        else if (filter === '6M') start.setMonth(start.getMonth() - 6);
        else if (filter === '1Y') start.setFullYear(start.getFullYear() - 1);
        else if (filter === 'CUSTOM') {
            return { startDate: customDates.start, endDate: customDates.end };
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    };

    // Graph Data Fetcher
    useEffect(() => {
        if (!isOpen || !data?.SKU || activeTab !== 'trends') return;
        if (timeFilter === 'CUSTOM' && (!customDates.start || !customDates.end)) return;

        const fetchGraphData = async () => {
            setIsGraphLoading(true);
            try {
                // NAYA: groupBy ab getCalculatedDates se nahi, balki state se aayega
                const { startDate, endDate } = getCalculatedDates(timeFilter);

                const response = await api.get('/sku-timeline', {
                    params: {
                        sku: data.SKU,
                        marketplace: data.Marketplace,
                        startDate,
                        endDate,
                        groupBy // <-- State wala groupBy directly pass ho raha hai
                    }
                });

                if (response.data.success) {
                    const formattedData = response.data.data.map(item => {
                        const dateObj = new Date(item.exact_date);
                        let displayTime = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        if (groupBy === 'month') displayTime = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                        if (groupBy === 'week') displayTime = `Week of ${displayTime}`;

                        return {
                            ...item,
                            displayTime,
                            Total_Quantity: Number(item.Total_Quantity || 0),
                            // NAYA: Refund Data fetch karna
                            Refund_Quantity: Number(item.Refund_Quantity || 0),
                            Total_Sales: Number(item.Total_Sales || 0)
                        };
                    });
                    setGraphData(formattedData);
                }
            } catch (error) {
                console.error("Failed to fetch graph data", error);
            } finally {
                setIsGraphLoading(false);
            }
        };

        fetchGraphData();
    }, [isOpen, data, activeTab, timeFilter, customDates, groupBy]); // <-- NAYA: groupBy ko dependency me zaroor dalna

    if (!isOpen) return null;

    return (
        // NAYA: justify-end hata kar justify-center aur items-center lagaya hai taaki center me aaye
        <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">

            {/* NAYA: Drawer ki jagah ab ye 850px width ka rounded popup ban gaya hai */}
            <div className="w-[850px] max-w-full bg-[#F8FAFC] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Popup Header */}
                <div className="p-5 border-b border-[#E5E7EB] bg-white flex justify-between items-start shrink-0">
                    <div className="pr-4">
                        <h3 className="text-[18px] font-bold text-[#243463] break-all">
                            {data?.SKU}
                        </h3>
                        <span className="px-2.5 py-1 rounded-md text-[11px] bg-[#243463]/10 text-[#243463] font-bold mt-2 inline-block uppercase tracking-wide">
                            {data?.Marketplace || "-"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-gray-100 text-[#243463] hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Section */}
                <div className="flex border-b border-[#E5E7EB] bg-white shrink-0">
                    <button
                        onClick={() => setActiveTab('qty_finance')}
                        className={`flex-1 py-3 text-[13px] font-bold transition-colors ${activeTab === 'qty_finance' ? 'text-[#243463] border-b-2 border-[#243463] bg-[#243463]/5' : 'text-[#6B7280] hover:text-[#243463]'}`}
                    >
                        Quantity & Financials
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-3 text-[13px] font-bold transition-colors ${activeTab === 'orders' ? 'text-[#243463] border-b-2 border-[#243463] bg-[#243463]/5' : 'text-[#6B7280] hover:text-[#243463]'}`}
                    >
                        Order Metrics
                    </button>
                    <button
                        onClick={() => setActiveTab('trends')}
                        className={`flex-1 py-3 text-[13px] font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === 'trends' ? 'text-[#243463] border-b-2 border-[#243463] bg-[#243463]/5' : 'text-[#6B7280] hover:text-[#243463]'}`}
                    >
                        <Activity size={14} /> Performance Trends
                    </button>
                </div>

                {/* Popup Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar">

                    {/* --- TAB 1: QUANTITY & FINANCIALS --- */}
                    {activeTab === 'qty_finance' && (
                        <>
                            <div>
                                <h4 className="text-[14px] font-bold text-[#243463] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-[#243463] rounded-full"></span> Logistics Breakdown
                                </h4>
                                {/* NAYA: Badi screen hai toh grid gap thoda badha diya hai */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center">
                                        <span className="text-[12px] text-[#6B7280] font-medium mb-1">Total Qty</span>
                                        <span className="text-[20px] font-bold text-[#243463]">{data?.Total_Quantity || 0}</span>
                                    </div>
                                    <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-l-4 border-l-blue-500">
                                        <span className="text-[12px] text-[#6B7280] font-medium mb-1">Shipment</span>
                                        <span className="text-[20px] font-bold text-blue-600">{data?.Shipment_Quantity || 0}</span>
                                    </div>
                                    <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
                                        <span className="text-[12px] text-[#6B7280] font-medium mb-1">Refund/Return</span>
                                        <span className="text-[20px] font-bold text-red-600">{data?.Refund_Quantity || 0}</span>
                                    </div>
                                    <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-l-4 border-l-orange-500">
                                        <span className="text-[12px] text-[#6B7280] font-medium mb-1">Cancelled</span>
                                        <span className="text-[20px] font-bold text-orange-600">{data?.Cancel_Quantity || 0}</span>
                                    </div>
                                    <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-l-4 border-l-[#243463]">
                                        <span className="text-[12px] text-[#6B7280] font-medium mb-1">Replacement</span>
                                        <span className="text-[20px] font-bold text-[#243463]">{data?.Replacement_Quantity || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2">
                                <h4 className="text-[14px] font-bold text-[#243463] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-[#243463] rounded-full"></span> Financials
                                </h4>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-white p-5 border border-[#E5E7EB] rounded-xl shadow-sm flex justify-between items-center">
                                        <span className="text-[14px] text-[#6B7280] font-medium">Total Sales</span>
                                        <span className={`text-[18px] font-bold ${parseFloat(data?.Total_Sales_Amount || 0) >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>{formatCurrency(data?.Total_Sales_Amount)}</span>
                                    </div>
                                    <div className="bg-white p-5 border border-[#E5E7EB] rounded-xl shadow-sm flex justify-between items-center">
                                        <span className="text-[14px] text-[#6B7280] font-medium">Settlement</span>
                                        <span className={`text-[18px] font-bold ${parseFloat(data?.Total_Settlement_Amount || 0) >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>{formatCurrency(data?.Total_Settlement_Amount)}</span>
                                    </div>
                                    <div className="bg-red-50 p-5 border border-red-100 rounded-xl shadow-sm flex justify-between items-center">
                                        <span className="text-[14px] text-red-600 font-bold">Ad Spend</span>
                                        <span className="text-[18px] font-bold text-red-600">-{formatCurrency(data?.Total_Ad_Spend)}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB 2: ORDER METRICS --- */}
                    {activeTab === 'orders' && (
                        <div>
                            <h4 className="text-[14px] font-bold text-[#243463] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-[#243463] rounded-full"></span> Order Metrics
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-5 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center">
                                    <span className="text-[12px] text-[#6B7280] font-medium mb-1">Total Orders</span>
                                    <span className="text-[22px] font-bold text-[#243463]">{data?.Total_Orders || 0}</span>
                                </div>
                                <div className="bg-white p-5 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-b-4 border-b-green-500">
                                    <span className="text-[12px] text-[#6B7280] font-medium mb-1">Organic Orders</span>
                                    <span className="text-[22px] font-bold text-green-600">{data?.Organic_Orders || 0}</span>
                                </div>
                                <div className="bg-white p-5 border border-[#E5E7EB] rounded-xl shadow-sm flex flex-col justify-center border-b-4 border-b-teal-500">
                                    <span className="text-[12px] text-[#6B7280] font-medium mb-1">Ad Orders</span>
                                    <span className="text-[22px] font-bold text-teal-600">{data?.Ad_Orders || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: TRENDS & GRAPHS --- */}
                    {activeTab === 'trends' && (
                        <div className="flex flex-col h-full">
                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-2 mb-6">
                                {['1M', '3M', '6M', '1Y', 'CUSTOM'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => handleTimeFilterChange(f)} /* <-- NAYA: Yahan function change kiya hai */
                                        className={`px-4 py-2 text-[12px] font-bold rounded-lg transition-all border shadow-sm ${timeFilter === f ? 'bg-[#243463] text-white border-[#243463] scale-105' : 'bg-[#F8FAFC] text-[#6B7280] border-[#E5E7EB] hover:bg-gray-100'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {/* Custom Date Inputs */}
                            {timeFilter === 'CUSTOM' && (
                                <div className="flex items-center gap-2 mb-6 bg-white p-3 rounded-lg border border-[#E5E7EB]">
                                    <input type="date" className="text-[13px] p-1 border rounded outline-none" value={customDates.start} onChange={e => setCustomDates({ ...customDates, start: e.target.value })} />
                                    <span className="text-[13px] text-gray-500">to</span>
                                    <input type="date" className="text-[13px] p-1 border rounded outline-none" value={customDates.end} onChange={e => setCustomDates({ ...customDates, end: e.target.value })} />
                                </div>
                            )}
                            {/* Main Chart Area (Sales) */}
                            <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm flex-1 min-h-[280px] relative mb-4">
                                {isGraphLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-xl">
                                        <div className="animate-spin w-8 h-8 border-4 border-[#243463] border-t-transparent rounded-full"></div>
                                    </div>
                                ) : graphData.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-[14px] text-gray-400 font-medium">No timeline data available for selected period.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Heading ke aage Day/Week/Month wale Toggle Buttons */}
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[13px] font-bold text-gray-500 flex items-center gap-2">
                                                <Calendar size={15} /> Quantity Sold Over Time
                                            </h4>

                                            {/* Resolution Toggles */}
                                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                                {['day', 'week', 'month'].map((res) => (
                                                    <button
                                                        key={res}
                                                        onClick={() => setGroupBy(res)}
                                                        className={`px-3 py-1 text-[11px] font-bold rounded-md capitalize transition-all ${groupBy === res ? 'bg-white text-[#243463] shadow-sm' : 'text-gray-500 hover:text-[#243463]'}`}
                                                    >
                                                        {res}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <ResponsiveContainer width="100%" height={230}>
                                            <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#243463" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#243463" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorRefund" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="displayTime" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#243463', marginBottom: '5px' }}
                                                    cursor={{ stroke: '#243463', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                                <Area type="monotone" dataKey="Total_Quantity" name="Quantity Sold" stroke="#243463" strokeWidth={3} fillOpacity={1} fill="url(#colorQty)" activeDot={{ r: 6, fill: '#243463', stroke: '#fff', strokeWidth: 2 }} />
                                                <Area type="monotone" dataKey="Refund_Quantity" name="Returned Qty" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRefund)" activeDot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </>
                                )}
                            </div>

                            {/* NAYA: AD SPEND AND STORAGE FEE SIDE-BY-SIDE (Grid Layout) */}
                            <div className="grid grid-cols-2 gap-4 pb-2">
                                {/* AD SPEND MONTHLY GRAPH */}
                                <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm relative">
                                    <h4 className="text-[13px] font-bold text-gray-500 mb-4 flex items-center gap-2">
                                        <Activity size={15} /> Monthly Ad Spend (₹)
                                    </h4>
                                    {adGraphData.length === 0 ? (
                                        <p className="text-[12px] text-gray-400 text-center py-10">No Ad Spend data available.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={adGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} dy={5} />
                                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#EF4444', marginBottom: '5px' }} />
                                                <Bar dataKey="Total_Ad_Spend" name="Ad Spend" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                {/* STORAGE FEE MONTHLY GRAPH */}
                                <div className="bg-white p-4 border border-[#E5E7EB] rounded-xl shadow-sm relative">
                                    <h4 className="text-[13px] font-bold text-gray-500 mb-4 flex items-center gap-2">
                                        <Package size={15} /> Monthly Storage Fee (₹)
                                    </h4>
                                    {storageGraphData.length === 0 ? (
                                        <p className="text-[12px] text-gray-400 text-center py-10">No Storage Fee data available.</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={storageGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} dy={5} />
                                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#F97316', marginBottom: '5px' }} />
                                                <Bar dataKey="Total_Storage_Fee" name="Storage Fee" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SkuDrawer;