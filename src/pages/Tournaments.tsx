import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getVisitorId } from '../api/tournamentApi'
import type { Tournament } from '../api/tournamentApi'

const statusLabel: Record<string, string> = {
  DRAFT: 'Borrador', REGISTRATION: 'Inscripciones',
  IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado'
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    api.getTournaments()
      .then(setTournaments)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteTournament = async (e: React.MouseEvent, id: number, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteTournament(id)
      load()
    } catch (err: any) { alert(err.message) }
  }

  if (loading) return <div className="loading">Cargando torneos...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Torneos</h2>
        <Link to="/create" className="btn btn-primary">+ Nuevo Torneo</Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="empty-state">
          <h3>No hay torneos aún</h3>
          <p>Crea tu primer torneo para empezar</p>
          <Link to="/create" className="btn btn-primary btn-lg" style={{ marginTop: '1rem' }}>Crear Torneo</Link>
        </div>
      ) : (
        <div className="grid">
          {tournaments.map(t => (
            <Link key={t.id} to={`/tournament/${t.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{t.name}</h2>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <span className={`badge badge-${t.status.toLowerCase()}`}>{statusLabel[t.status]}</span>
                    {t.creatorVisitorId === getVisitorId() && (
                      <button className="btn btn-danger btn-sm" style={{ padding: '0.125rem 0.375rem', fontSize: '0.7rem', lineHeight: 1 }}
                        onClick={e => deleteTournament(e, t.id, t.name)}>✕</button>
                    )}
                  </div>
                </div>
                {t.game && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>🎮 {t.game}</p>}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>👥 {t.teams.length}/{t.maxTeams} equipos</span>
                  <span>🏆 {t.type === 'SINGLE_ELIMINATION' ? 'Eliminación Directa' : 'Todos vs Todos'}</span>
                  <span>⚔️ {t.matches.length} partidos</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
