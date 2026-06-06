import React from 'react'

const orders = [
    {
        id: '#ORD-8821',
        customer: 'Rahul K.',
        initials: 'RK',
        avatarBg: 'rgba(36,52,99,0.10)',
        avatarColor: '#243463',
        product: 'MacBook Pro M3',
        amount: '₹1,89,000',
        status: 'Completed',
    },
    {
        id: '#ORD-8820',
        customer: 'Priya S.',
        initials: 'PS',
        avatarBg: 'rgba(250,200,153,0.30)',
        avatarColor: '#9a6a2a',
        product: 'iPhone 16 Pro',
        amount: '₹1,34,900',
        status: 'Pending',
    },
    {
        id: '#ORD-8819',
        customer: 'Ankit M.',
        initials: 'AM',
        avatarBg: 'rgba(16,185,129,0.10)',
        avatarColor: '#065f46',
        product: 'Sony WH-1000XM5',
        amount: '₹24,990',
        status: 'Completed',
    },
    {
        id: '#ORD-8818',
        customer: 'Nisha J.',
        initials: 'NJ',
        avatarBg: 'rgba(239,68,68,0.10)',
        avatarColor: '#991b1b',
        product: 'Nike Air Max 2026',
        amount: '₹12,495',
        status: 'Failed',
    },
    {
        id: '#ORD-8817',
        customer: 'Vivek B.',
        initials: 'VB',
        avatarBg: 'rgba(36,52,99,0.08)',
        avatarColor: '#243463',
        product: 'Samsung OLED 55"',
        amount: '₹89,999',
        status: 'Pending',
    },
]

const statusStyles = {
    Completed: 'bg-[#10B981]/10 text-[#10B981]',
    Pending: 'bg-[#F59E0B]/12 text-[#F59E0B]',
    Failed: 'bg-[#EF4444]/10 text-[#EF4444]',
}

const OrdersTable = () => {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-['Sora',sans-serif] text-[15px] font-bold text-[#243463]">
                        Recent Orders
                    </h3>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">Last 24 hours</p>
                </div>
                <button className="text-[12px] text-[#243463] font-semibold hover:underline cursor-pointer bg-transparent border-none">
                    View all →
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr>
                            {['Order ID', 'Customer', 'Product', 'Amount', 'Status'].map((h) => (
                                <th
                                    key={h}
                                    className="text-left text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6B7280] pb-3 border-b border-[#E5E7EB] px-3 first:pl-0 last:pr-0"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, idx) => (
                            <tr
                                key={order.id}
                                className="hover:bg-[#F8FAFC] transition-colors group"
                            >
                                <td className="px-3 pl-0 py-3 border-b border-[#E5E7EB]">
                                    <span className="font-semibold text-[#243463] text-[12px]">{order.id}</span>
                                </td>
                                <td className="px-3 py-3 border-b border-[#E5E7EB]">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                            style={{ background: order.avatarBg, color: order.avatarColor }}
                                        >
                                            {order.initials}
                                        </div>
                                        <span className="font-medium">{order.customer}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-3 border-b border-[#E5E7EB] text-[#6B7280] text-[12px]">
                                    {order.product}
                                </td>
                                <td className="px-3 py-3 border-b border-[#E5E7EB] font-semibold">
                                    {order.amount}
                                </td>
                                <td className="px-3 pr-0 py-3 border-b border-[#E5E7EB]">
                                    <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full ${statusStyles[order.status]}`}
                                    >
                                        <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{ background: 'currentColor' }}
                                        />
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default OrdersTable