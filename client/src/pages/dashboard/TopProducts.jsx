import React from 'react'

const products = [
    {
        rank: 1,
        emoji: '💻',
        name: 'MacBook Pro M3',
        category: 'Electronics',
        amount: '₹18.9L',
        units: '10 units',
        emojiBg: 'rgba(36,52,99,0.07)',
    },
    {
        rank: 2,
        emoji: '📱',
        name: 'iPhone 16 Pro',
        category: 'Electronics',
        amount: '₹13.5L',
        units: '10 units',
        emojiBg: 'rgba(250,200,153,0.20)',
    },
    {
        rank: 3,
        emoji: '📺',
        name: 'Samsung OLED 55"',
        category: 'Electronics',
        amount: '₹9.0L',
        units: '10 units',
        emojiBg: 'rgba(16,185,129,0.08)',
    },
    {
        rank: 4,
        emoji: '👟',
        name: 'Nike Air Max 2026',
        category: 'Fashion',
        amount: '₹6.2L',
        units: '50 units',
        emojiBg: 'rgba(245,158,11,0.10)',
    },
    {
        rank: 5,
        emoji: '🎧',
        name: 'Sony WH-1000XM5',
        category: 'Electronics',
        amount: '₹5.0L',
        units: '20 units',
        emojiBg: 'rgba(239,68,68,0.07)',
    },
]

const TopProducts = () => {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6">
            <div className="mb-5">
                <h3 className="font-['Sora',sans-serif] text-[15px] font-bold text-[#243463]">
                    Top Products
                </h3>
                <p className="text-[12px] text-[#6B7280] mt-0.5">By revenue · Jun</p>
            </div>

            <div className="space-y-3">
                {products.map((p) => (
                    <div key={p.rank} className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div
                            className={`w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${p.rank <= 2
                                    ? 'bg-[#FAC899] text-[#243463]'
                                    : 'bg-[#F8FAFC] text-[#6B7280]'
                                }`}
                        >
                            {p.rank}
                        </div>

                        {/* Emoji icon */}
                        <div
                            className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: p.emojiBg }}
                        >
                            {p.emoji}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#111827] truncate">{p.name}</p>
                            <p className="text-[11px] text-[#6B7280]">{p.category}</p>
                        </div>

                        {/* Sales */}
                        <div className="text-right flex-shrink-0">
                            <p className="text-[13px] font-bold text-[#243463]">{p.amount}</p>
                            <p className="text-[11px] text-[#6B7280]">{p.units}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TopProducts