import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Create from './pages/Create.jsx'
import Play from './pages/Play.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Watch from './pages/Watch.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<Create />} />
      <Route path="/play/:shareToken" element={<Play mode="recipient" />} />
      <Route path="/own/:ownerToken" element={<Play mode="owner" />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/watch/:ownerToken" element={<Watch />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
