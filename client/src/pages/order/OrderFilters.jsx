import React from 'react';
import { Search, Filter, Calendar, XCircle } from 'lucide-react';

const OrderFilters = ({ state, handlers }) => {
    const { mode, searchTerm, selectedMarketplace, uniqueMarketplaces, selectedReportTypeFilter, uniqueReportTypes, selectedWarehouseFilter, uniqueWarehouses, startDate, endDate, paymentFilter, orderStatusFilter, hasActiveFilters } = state;
    const { setSearchTerm, setSelectedMarketplace, setSelectedReportTypeFilter, setSelectedWarehouseFilter, setStartDate, setEndDate, setPaymentFilter, setOrderStatusFilter, clearFilters } = handlers;
    return (
        <div className="p-5 pt-0 border-b border-[#E5E7EB] shrink-0">
            <div className="flex flex-wrap items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center border border-[#E5E7EB] rounded-lg px-3 py-1.5 bg-white min-w-[180px] flex-1">
                    <Search size={14} className="text-[#6B7280] mr-2" />
                    <input type="text" placeholder="Search Order ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] w-full" />
                </div>

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

                        {uniqueReportTypes.length > 1 && (
                            <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                <Filter size={13} className="text-[#6B7280] mr-1.5" />
                                <select value={selectedReportTypeFilter} onChange={(e) => setSelectedReportTypeFilter(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer">
                                    {uniqueReportTypes.map((rt, i) => <option key={i} value={rt}>{rt === 'All' ? 'Report: All' : rt}</option>)}
                                </select>
                            </div>
                        )}

                        {/* NAYA: Warehouse Dropdown (Report Type ke theek baju mein) */}
                        {uniqueWarehouses && uniqueWarehouses.length > 1 && (
                            <div className="flex items-center border border-[#E5E7EB] rounded-lg px-2 py-1.5 bg-white">
                                <Filter size={13} className="text-[#6B7280] mr-1.5" />
                                <select value={selectedWarehouseFilter} onChange={(e) => setSelectedWarehouseFilter(e.target.value)} className="bg-transparent border-none outline-none text-[12px] text-[#243463] cursor-pointer max-w-[150px]">
                                    {uniqueWarehouses.map((wh, i) => <option key={i} value={wh}>{wh === 'All' ? 'Warehouse: All' : wh}</option>)}
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
                    <button onClick={clearFilters} className="flex items-center gap-1 text-[12px] font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 px-2.5 py-1.5 rounded-lg transition-colors ml-auto">
                        <XCircle size={14} /> Clear All
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrderFilters;