import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, BarChart2, ShoppingBag, Box,
    Users, Tag, TrendingUp, FileBarChart,
    MonitorDot, Upload, Settings, ChevronRight
} from 'lucide-react'

const navItems = [
    {
        label: 'Overview',
        links: [
            { to: '/dashboard',  name: 'Dashboard',   icon: <LayoutDashboard size={17} />, badge: null, badgeNew: false },
            { to: '/analytics',  name: 'Analytics',   icon: <BarChart2       size={17} />, badge: null, badgeNew: true  },
        ],
    },
    {
        label: 'Store',
        links: [
            { to: '/upload',     name: 'Upload Data', icon: <Upload       size={17} />, badge: null, badgeNew: false },
            { to: '/order',      name: 'Order',       icon: <ShoppingBag  size={17} />, badge: null, badgeNew: false },
            { to: '/products',   name: 'Products',    icon: <Box          size={17} />, badge: null, badgeNew: false },
            { to: '/customers',  name: 'Customers',   icon: <Users        size={17} />, badge: null, badgeNew: false },
            { to: '/coupons',    name: 'Coupons',     icon: <Tag          size={17} />, badge: null, badgeNew: false },
        ],
    },
    {
        label: 'Insights',
        links: [
            { to: '/revenue',     name: 'Revenue',     icon: <TrendingUp   size={17} />, badge: null, badgeNew: false },
            { to: '/reports',     name: 'Reports',     icon: <FileBarChart size={17} />, badge: null, badgeNew: false },
            { to: '/performance', name: 'Performance', icon: <MonitorDot   size={17} />, badge: null, badgeNew: false },
        ],
    },
    {
        label: 'System',
        links: [
            { to: '/settings', name: 'Settings', icon: <Settings size={17} />, badge: null, badgeNew: false },
        ],
    },
]

const Sidebar = () => {
    return (
        <aside className="w-60 min-w-[240px] h-screen bg-[#243463] flex flex-col overflow-hidden">

            {/* ── LOGO ── */}
            <div className="px-[18px] pt-5 pb-[18px] border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                    <div className="w-[38px] h-[38px] bg-[#FAC899] rounded-[10px] flex items-center justify-center shrink-0">
                        <svg width="22" height="22" fill="none" stroke="#243463" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/>
                            <circle cx="9" cy="21" r="1"/>
                            <circle cx="20" cy="21" r="1"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-['Sora',sans-serif] text-[16px] font-bold text-white tracking-[-0.3px] leading-tight">
                            Crasome
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-[2px] mt-0.5">
                            E-Commerce Analytics
                        </p>
                    </div>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#FAC899]/[0.12] border border-[#FAC899]/[0.22] rounded-[6px] px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FAC899] shrink-0" />
                    <span className="text-[10px] font-semibold text-[#FAC899]/85 tracking-[0.5px]">
                        Pro Plan · Active
                    </span>
                </div>
            </div>

            {/* ── NAV ── */}
            <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
                {navItems.map((section) => (
                    <div key={section.label}>
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/28 px-2 mb-1.5">
                            {section.label}
                        </p>
                        <div className="space-y-px">
                            {section.links.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] text-[13px] font-medium
                                        transition-all duration-150 no-underline
                                        ${isActive
                                            ? 'bg-[#FAC899] text-[#243463] font-bold'
                                            : 'text-white/65 hover:bg-white/[0.07] hover:text-white'
                                        }`
                                    }
                                >
                                    <span className="shrink-0">{link.icon}</span>
                                    <span className="flex-1">{link.name}</span>
                                    {link.badge && (
                                        <span className="bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                            {link.badge}
                                        </span>
                                    )}
                                    {link.badgeNew && (
                                        <span className="bg-[#FAC899]/[0.18] text-[#FAC899] border border-[#FAC899]/25 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                                            New
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── FOOTER ── */}
            <div className="border-t border-white/[0.07] px-2.5 py-3">
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] cursor-pointer hover:bg-white/[0.06] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#FAC899] flex items-center justify-center text-[12px] font-bold text-[#243463] shrink-0">
                        DM
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-white leading-tight truncate">
                            Dhuka Muhammad
                        </p>
                        <p className="text-[10px] text-white/38 mt-0.5">Admin · Crasome</p>
                    </div>
                    <ChevronRight size={14} className="text-white/25 shrink-0" />
                </div>
            </div>

        </aside>
    )
}

export default Sidebar