import React, { useState } from 'react'

const tabs = ['Week', 'Month', 'Year']

// Static data sets for each filter
const dataMap = {
    Week: {
        revenue: [140, 125, 155, 110, 160, 145, 170],
        target: [130, 135, 130, 120, 140, 150, 155],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    Month: {
        revenue: [150, 100, 90, 120, 100, 55, 80, 60, 45, 70, 50, 30],
        target: [160, 155, 140, 145, 150, 135, 140, 145, 125, 130, 115, 120],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    Year: {
        revenue: [90, 110, 130, 120, 150, 140],
        target: [100, 115, 120, 130, 135, 145],
        labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
    },
}

const W = 560
const H = 180
const PAD_X = 20
const PAD_Y = 15
const CHART_W = W - PAD_X * 2
const CHART_H = H - PAD_Y * 2

function toPoints(data) {
    const n = data.length
    const min = Math.min(...data) - 10
    const max = Math.max(...data) + 10
    return data.map((v, i) => {
        const x = PAD_X + (i / (n - 1)) * CHART_W
        const y = PAD_Y + (1 - (v - min) / (max - min)) * CHART_H
        return [x, y]
    })
}

function smoothPath(pts) {
    if (pts.length < 2) return ''
    let d = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]
        const [x1, y1] = pts[i]
        const cx = (x0 + x1) / 2
        d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    return d
}

function areaPath(pts) {
    const line = smoothPath(pts)
    const last = pts[pts.length - 1]
    const first = pts[0]
    return `${line} L${last[0]},${H} L${first[0]},${H} Z`
}

const RevenueChart = () => {
    const [active, setActive] = useState('Month')
    const data = dataMap[active]
    const revPts = toPoints(data.revenue)
    const tgtPts = toPoints(data.target)

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h3 className="font-['Sora',sans-serif] text-[15px] font-bold text-[#243463]">
                        Revenue Overview
                    </h3>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Monthly performance · 2026</p>
                </div>
                <div className="flex gap-1 bg-[#F8FAFC] p-[3px] rounded-lg">
                    {tabs.map((t) => (
                        <button
                            key={t}
                            onClick={() => setActive(t)}
                            className={`text-[12px] font-medium px-2.5 py-1 rounded-md cursor-pointer border-none transition-all duration-150 ${active === t
                                    ? 'bg-white text-[#243463] font-semibold shadow-sm'
                                    : 'bg-transparent text-[#6B7280]'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* SVG Chart */}
            <div className="relative" style={{ height: 200 }}>
                <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gradRev" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#243463" stopOpacity="0.14" />
                            <stop offset="100%" stopColor="#243463" stopOpacity="0.01" />
                        </linearGradient>
                        <linearGradient id="gradTgt" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#FAC899" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#FAC899" stopOpacity="0.01" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((f) => (
                        <line
                            key={f}
                            x1={PAD_X} y1={PAD_Y + f * CHART_H}
                            x2={W - PAD_X} y2={PAD_Y + f * CHART_H}
                            stroke="#E5E7EB" strokeWidth="0.5"
                        />
                    ))}

                    {/* Area fills */}
                    <path d={areaPath(tgtPts)} fill="url(#gradTgt)" />
                    <path d={areaPath(revPts)} fill="url(#gradRev)" />

                    {/* Lines */}
                    <path d={smoothPath(tgtPts)} fill="none" stroke="#FAC899" strokeWidth="2" strokeLinejoin="round" />
                    <path d={smoothPath(revPts)} fill="none" stroke="#243463" strokeWidth="2.5" strokeLinejoin="round" />

                    {/* Endpoint dot */}
                    {revPts.length > 0 && (
                        <circle
                            cx={revPts[revPts.length - 1][0]}
                            cy={revPts[revPts.length - 1][1]}
                            r="5" fill="#243463" stroke="white" strokeWidth="2"
                        />
                    )}

                    {/* X-axis labels */}
                    {data.labels.map((label, i) => {
                        const x = PAD_X + (i / (data.labels.length - 1)) * CHART_W
                        return (
                            <text key={label} x={x} y={H + 18} fontSize="11" fill="#6B7280"
                                textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif">
                                {label}
                            </text>
                        )
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-3 pt-3 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[3px] bg-[#243463]" />
                    <span className="text-[12px] text-[#6B7280]">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-[3px] bg-[#FAC899]" />
                    <span className="text-[12px] text-[#6B7280]">Target</span>
                </div>
            </div>
        </div>
    )
}

export default RevenueChart