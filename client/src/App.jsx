import { BrowserRouter } from 'react-router-dom'
import RouteLayout from './routes'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <RouteLayout />
    </BrowserRouter>
  )
}

export default App