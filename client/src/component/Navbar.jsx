import React, { useState, useEffect } from 'react'
import { Search, Bell, ChevronDown } from 'lucide-react'

const Navbar = () => {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const formattedTime = time.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    })

    const formattedDate = time.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })

    return (
        <header className="bg-white border-b border-[#E5E7EB] h-16 px-7 flex items-center justify-between shrink-0">

            {/* ── LEFT: Search ── */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl
                            px-3 h-[38px] w-64
                            focus-within:border-[#243463] focus-within:shadow-[0_0_0_3px_rgba(36,52,99,0.08)]
                            transition-all duration-150 cursor-text">
                <Search size={14} color="#9CA3AF" className="shrink-0" />
                <input
                    type="text"
                    placeholder="Search anything..."
                    className="bg-transparent text-[13px] text-[#111827] outline-none w-full
                               placeholder:text-[#9CA3AF] font-['Plus_Jakarta_Sans',sans-serif]"
                />
            </div>

            {/* ── RIGHT ── */}
            <div className="flex items-center gap-3 shrink-0">

                {/* Live pill */}
                <div className="flex items-center gap-2 bg-[#F0F4FF] border border-[#C7D2F0] rounded-full px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#243463] opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#243463]"></span>
                    </span>
                    <span className="text-[12px] font-semibold text-[#243463] tracking-wide">Live</span>
                </div>

                {/* Live Clock chip */}
                <div className="flex flex-col items-end">
                    <span className="text-[13px] font-bold text-[#243463] font-['Sora',sans-serif] leading-tight tabular-nums">
                        {formattedTime}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-medium leading-tight">
                        {formattedDate}
                    </span>
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-[#E5E7EB]" />

                {/* Notification */}
                <button className="relative w-[38px] h-[38px] rounded-[10px] flex items-center justify-center
                                   border border-[#E5E7EB] bg-white text-[#6B7280]
                                   hover:bg-[#F8FAFC] hover:border-[#CBD5E1] hover:text-[#243463]
                                   transition-all duration-150 cursor-pointer">
                    <Bell size={17} />
                    <span className="absolute top-[9px] right-[9px] w-[7px] h-[7px] bg-[#EF4444] rounded-full border-2 border-white" />
                </button>

                {/* Divider */}
                <div className="w-px h-5 bg-[#E5E7EB]" />

                {/* User avatar */}
                <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-[10px] border border-transparent
                                cursor-pointer hover:bg-[#F8FAFC] hover:border-[#E5E7EB] transition-all duration-150">
                    <div className="w-8 h-8 rounded-lg bg-[#243463] flex items-center justify-center
                                    text-[12px] font-bold text-white tracking-wide shrink-0">
                        AK
                    </div>
                    <ChevronDown size={13} color="#9CA3AF" className="shrink-0" />
                </div>

            </div>
        </header>
    )
}

export default Navbar