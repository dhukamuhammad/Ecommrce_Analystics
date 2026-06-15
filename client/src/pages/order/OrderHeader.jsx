import React from 'react';
import { Download, Loader2 } from 'lucide-react';

const OrderHeader = ({ mode, reportCategory, filteredOrdersLength, ordersLength, isSaving, isProcessing, handleConfirmAndSave, navigate }) => (
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
                    Total Rows: {filteredOrdersLength}
                </div>
                {mode === 'preview' ? (
                    <>
                        <button onClick={() => navigate('/upload')} className="bg-white text-[#243463] border border-[#E5E7EB] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer">Discard</button>
                        <button onClick={handleConfirmAndSave} disabled={isSaving || isProcessing || ordersLength === 0} className="bg-[#243463] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#1a2548] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2">
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
    </div>
);

export default OrderHeader;