import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import Tournaments from './pages/Tournaments'
import CreateTournament from './pages/CreateTournament'
import TournamentDetail from './pages/TournamentDetail'
import { decodeShareHash, importSharedTournament } from './api/tournamentApi'

function ShareHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = decodeShareHash()
    if (t) {
      const id = importSharedTournament(t)
      window.location.hash = ''
      navigate(`/tournament/${id}`, { replace: true })
    }
  }, [navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ShareHandler />
      <div className="layout">
        <header className="header">
          <h1>⚡ <span>ESports</span> Manager</h1>
          <nav className="nav">
            <Link to="/">Torneos</Link>
            <Link to="/create">+ Nuevo</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Tournaments />} />
          <Route path="/create" element={<CreateTournament />} />
          <Route path="/tournament/:id" element={<TournamentDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
