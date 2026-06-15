import React from 'react';
import { useOrderLogic } from './useOrderLogic';
import OrderHeader from './OrderHeader';
import OrderFilters from './OrderFilters';
import OrderStats from './OrderStats';
import OrderTable from './OrderTable';
import OrderDrawer from './OrderDrawer'; // NAYA IMPORT
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Order = () => {
    const { state, handlers } = useOrderLogic();

    return (
        <div className="p-6 flex flex-col min-w-0 h-[calc(100vh-100px)] gap-6 bg-[#F1F5F9]">
            <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-sm overflow-hidden flex flex-col w-full h-full relative">

                <OrderHeader
                    mode={state.mode}
                    reportCategory={state.reportCategory}
                    filteredOrdersLength={state.filteredOrders.length}
                    ordersLength={state.orders.length}
                    isSaving={state.isSaving}
                    isProcessing={state.isProcessing}
                    handleConfirmAndSave={handlers.handleConfirmAndSave}
                    navigate={handlers.navigate}
                />

                <OrderFilters state={state} handlers={handlers} />

                <OrderStats
                    isProcessing={state.isProcessing}
                    statsData={state.statsData}
                    activeTypeFilter={state.activeTypeFilter}
                    setActiveTypeFilter={handlers.setActiveTypeFilter}
                />

                {/* Table ko handlers bhejein */}
                <OrderTable state={state} handlers={handlers} />

                {!state.isProcessing && state.filteredOrders.length > 0 && (
                    <div className="p-4 border-t border-[#E5E7EB] bg-white flex items-center justify-between shrink-0">
                        <span className="text-[13px] text-[#6B7280]">
                            Showing {((state.currentPage - 1) * state.rowsPerPage) + 1} to {Math.min(state.currentPage * state.rowsPerPage, state.filteredOrders.length)} of {state.filteredOrders.length} entries
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handlers.setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={state.currentPage === 1} className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#243463] hover:bg-[#F8FAFC] disabled:opacity-50">
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-[13px] font-semibold text-[#243463] px-2">Page {state.currentPage} of {state.totalPages}</span>
                            <button onClick={() => handlers.setCurrentPage(prev => Math.min(prev + 1, state.totalPages))} disabled={state.currentPage === state.totalPages} className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#243463] hover:bg-[#F8FAFC] disabled:opacity-50">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* NAYA: Drawer Render Karein */}
                <OrderDrawer
                    isOpen={state.isDrawerOpen}
                    onClose={handlers.handleCloseDrawer}
                    orderId={state.selectedOrderId}
                    transactions={state.linkedTransactions}
                    mode={state.mode}
                    isLoading={state.isDrawerLoading}
                />
            </div>
        </div>
    );
};

export default Order;