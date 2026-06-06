import React from 'react'

const KpiCard = ({ icon, iconBg, value, label, badge, badgeUp, barWidth, barColor }) => {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-5 relative overflow-hidden">
            {/* Decorative bg circle */}
            <div
                className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06]"
                style={{ background: barColor }}
            />

            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
                    style={{ background: iconBg }}
                >
                    {icon}
                </div>
                <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${badgeUp
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}
                >
                    {badgeUp ? '↑' : '↓'} {badge}
                </span>
            </div>

            <p className="font-['Sora',sans-serif] text-[26px] font-bold text-[#243463] tracking-tight leading-none">
                {value}
            </p>
            <p className="text-[13px] text-[#6B7280] mt-1">{label}</p>

            {/* Progress bar */}
            <div className="mt-3.5 bg-[#F8FAFC] rounded h-1 overflow-hidden">
                <div
                    className="h-full rounded transition-all duration-700"
                    style={{ width: barWidth, background: barColor }}
                />
            </div>
        </div>
    )
}

export default KpiCard