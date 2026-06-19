// import React from 'react'
// import DashboardRoute from './dashboard/DashboardRoute'
// import { Routes } from 'react-router-dom'

// const RouteLayout = () => {
//     return (

//         <>
//             <DashboardRoute />
//         </>
//     )
// }

// export default RouteLayout


import React from 'react'
import { Route, Routes } from 'react-router-dom'
import DashboardRoute from './dashboard/DashboardRoute'
import Layout from '../component/Layout'
import UploadRoute from './upload/UploadRoute'
import OrderRoute from './order/OrderRoute'
import SkuRoute from './sku/SkuRoute'

const RouteLayout = () => {
    return (
        <Routes>
            <Route element={<Layout />}>
                {/* All protected/layout routes go here */}
                <Route path="/*" element={<DashboardRoute />} />
                <Route path="/upload/*" element={<UploadRoute />} />
                <Route path="/order/*" element={<OrderRoute />} />
                <Route path="/sku/*" element={<SkuRoute />} />
            </Route>
        </Routes>
    )
}

export default RouteLayout