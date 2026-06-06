import React from 'react'

const categories = [
    { name: 'Electronics', pct: 50, color: '#243463', bar: 50 },
    { name: 'Fashion', pct: 25, color: '#FAC899', bar: 25 },
    { name: 'Home & Living', pct: 15, color: '#10B981', bar: 15 },
    { name: 'Others', pct: 10, color: '#E5E7EB', bar: 10 },
]

// Build SVG donut arcs
const R = 60
const CX = 80
const CY = 80
const STROKE = 24
const CIRC = 2 * Math.PI * R

function buildArcs(items) {
    let offset = 0
    return items.map((item) => {
        const dash = (item.pct / 100) * CIRC
        const arc = { ...item, dash, offset }
        offset += dash
        return arc
    })
}

const CategoryChart = () => {
    const arcs = buildArcs(categories)

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6">
            <div className="mb-5">
                <h3 className="font-['Sora',sans-serif] text-[15px] font-bold text-[#243463]">
                    Sales by Category
                </h3>
                <p className="text-[12px] text-[#6B7280] mt-0.5">This month</p>
            </div>

            {/* Donut */}
            <div className="flex justify-center mb-5">
                <div className="relative w-40 h-40">
                    <svg viewBox="0 0 160 160" width="160" height="160">
                        {/* Background ring */}
                        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F8FAFC" strokeWidth={STROKE} />
                        {arcs.map((arc) => (
                            <circle
                                key={arc.name}
                                cx={CX} cy={CY} r={R}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth={STROKE}
                                strokeDasharray={`${arc.dash} ${CIRC - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${CX} ${CY})`}
                            />
                        ))}
                    </svg>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="font-['Sora',sans-serif] text-[22px] font-bold text-[#243463] leading-none">
                            ₹84L
                        </p>
                        <p className="text-[11px] text-[#6B7280] mt-1">Total</p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5">
                {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                        <div
                            className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0"
                            style={{ background: cat.color }}
                        />
                        <span className="text-[13px] text-[#111827] flex-1">{cat.name}</span>
                        {/* Mini bar */}
                        <div className="flex-1 bg-[#F8FAFC] rounded h-[3px] mx-2">
                            <div
                                className="h-full rounded"
                                style={{ width: `${cat.bar}%`, background: cat.color }}
                            />
                        </div>
                        <span className="text-[13px] font-semibold text-[#111827] w-9 text-right">
                            {cat.pct}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CategoryChart