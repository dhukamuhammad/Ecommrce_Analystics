import React from 'react'
import KpiCard from './KpiCard'
import RevenueChart from './RevenueChart'
import CategoryChart from './CategoryChart'
import OrdersTable from './OrdersTable'
import TopProducts from './TopProducts'

const kpiData = [
    {
        value: '₹84.2L',
        label: 'Total Revenue',
        badge: '12.5%',
        badgeUp: true,
        barWidth: '78%',
        barColor: '#243463',
        iconBg: 'rgba(36,52,99,0.10)',
        icon: (
            <svg width="20" height="20" fill="none" stroke="#243463" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
        ),
    },
    {
        value: '3,482',
        label: 'Total Orders',
        badge: '8.3%',
        badgeUp: true,
        barWidth: '65%',
        barColor: '#10B981',
        iconBg: 'rgba(16,185,129,0.10)',
        icon: (
            <svg width="20" height="20" fill="none" stroke="#10B981" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
            </svg>
        ),
    },
    {
        value: '12,840',
        label: 'Active Customers',
        badge: '5.1%',
        badgeUp: true,
        barWidth: '82%',
        barColor: '#FAC899',
        iconBg: 'rgba(250,200,153,0.25)',
        icon: (
            <svg width="20" height="20" fill="none" stroke="#d4841a" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
            </svg>
        ),
    },
    {
        value: '2.4%',
        label: 'Churn Rate',
        badge: '2.1%',
        badgeUp: false,
        barWidth: '24%',
        barColor: '#EF4444',
        iconBg: 'rgba(239,68,68,0.10)',
        icon: (
            <svg width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
    },
]

const Dashboard = () => {
    return (
        <div className="p-6 flex flex-col gap-5 min-w-0">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 min-w-0">
                {kpiData.map((kpi) => (
                    <KpiCard key={kpi.label} {...kpi} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 min-w-0" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)' }}>
                <div className="min-w-0"><RevenueChart /></div>
                <div className="min-w-0"><CategoryChart /></div>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-4 min-w-0" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,280px)' }}>
                <div className="min-w-0"><OrdersTable /></div>
                <div className="min-w-0"><TopProducts /></div>
            </div>
        </div>
    )
}

export default Dashboard