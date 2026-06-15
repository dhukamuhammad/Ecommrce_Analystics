import React from 'react';

const OrderStats = ({ isProcessing, statsData, activeTypeFilter, setActiveTypeFilter }) => {
    if (isProcessing || !statsData || statsData.length <= 1) return null;

    return (
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
                        <div className={`text-[10px] font-bold tracking-widest mb-1 uppercase ${isActive ? "text-[#E5E7EB]" : "text-[#6B7280]"}`}>{s.label}</div>
                        <div className="text-2xl font-bold mb-0.5">{s.value}</div>
                        <div className={`text-[10px] leading-snug ${isActive ? "text-[#E5E7EB]/80" : "text-[#6B7280]"}`}>{s.desc}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default OrderStats;