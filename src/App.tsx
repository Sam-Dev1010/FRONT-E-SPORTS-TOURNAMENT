import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Tournaments from './pages/Tournaments'
import CreateTournament from './pages/CreateTournament'
import TournamentDetail from './pages/TournamentDetail'

export default function App() {
  return (
    <BrowserRouter>
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
