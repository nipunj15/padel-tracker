import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.jsx'
import NewMatch from './pages/NewMatch.jsx'
import LiveMatch from './pages/LiveMatch.jsx'
import MatchSummary from './pages/MatchSummary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/match/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<LiveMatch />} />
        <Route path="/match/:id/summary" element={<MatchSummary />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
