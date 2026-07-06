import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, getVisitorId } from '../api/tournamentApi'
import type { Tournament, Team, Match, Standing } from '../api/tournamentApi'
import { useWebSocket } from '../hooks/useWebSocket'

const statusLabel: Record<string, string> = {
  DRAFT: 'Borrador', REGISTRATION: 'Inscripciones',
  IN_PROGRESS: 'En curso', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado'
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const tId = parseInt(id || '0')
  const navigate = useNavigate()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [tab, setTab] = useState<'matches' | 'standings' | 'teams'>('matches')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamTag, setTeamTag] = useState('')
  const [notification, setNotification] = useState('')
  const [editingScore, setEditingScore] = useState<number | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)

  const load = useCallback(async () => {
    try {
      const [t, m, s] = await Promise.all([
        api.getTournament(tId),
        api.getMatches(tId),
        api.getStandings(tId),
      ])
      setTournament(t)
      setMatches(m)
      setStandings(s)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tId])

  useEffect(() => { load() }, [load])

  useWebSocket(tId, useCallback((data) => {
    setMatches(prev => prev.map(m =>
      m.id === data.matchId
        ? { ...m, score1: data.score1, score2: data.score2, status: data.status }
        : m
    ))
    showNotification('🔴 Puntaje actualizado en vivo!')
    load()
  }, [load]))

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const addTeam = async () => {
    if (!teamName) return
    try {
      await api.addTeam(tId, { name: teamName, tag: teamTag, players: [] })
      setTeamName('')
      setTeamTag('')
      showNotification('✅ Equipo agregado')
      load()
    } catch (e: any) { alert(e.message) }
  }

  const generateFixtures = async () => {
    try {
      await api.generateFixtures(tId)
      showNotification('✅ Fixtures generados!')
      load()
    } catch (e: any) { alert(e.message) }
  }

  const startEditScore = (m: Match) => {
    setEditingScore(m.id)
    setScore1(m.score1 ?? 0)
    setScore2(m.score2 ?? 0)
  }

  const saveScore = async (matchId: number) => {
    try {
      await api.updateScore(matchId, score1, score2)
      setEditingScore(null)
      showNotification('✅ Puntaje actualizado')
      load()
    } catch (e: any) { alert(e.message) }
  }

  const deleteTournament = async () => {
    if (!confirm(`¿Eliminar "${tournament?.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.deleteTournament(tId)
      navigate('/')
    } catch (e: any) { alert(e.message) }
  }

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    showNotification('🔗 Link copiado al portapapeles')
  }

  const isCreator = tournament?.creatorVisitorId === getVisitorId()

  if (loading) return <div className="loading">Cargando torneo...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!tournament) return <div className="error">Torneo no encontrado</div>

  const canGenerateFixtures = tournament.status === 'REGISTRATION' && tournament.teams.length >= 2
  const isSingleElim = tournament.type === 'SINGLE_ELIMINATION'

  return (
    <div>
      {notification && <div className="notification">{notification}</div>}

      {!isCreator && (
        <div style={{ background: '#1e293b', border: '1px solid #f59e0b40', borderRadius: '0.5rem', padding: '0.5rem 1rem', marginBottom: '1rem', textAlign: 'center', color: '#f59e0b', fontSize: '0.875rem' }}>
          👁 Modo solo lectura — No puedes modificar este torneo
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>{tournament.name}</h2>
            <span className={`badge badge-${tournament.status.toLowerCase()}`}>{statusLabel[tournament.status]}</span>
          </div>
          {tournament.game && <p style={{ color: '#94a3b8' }}>🎮 {tournament.game}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/" className="btn btn-outline btn-sm">← Volver</Link>
          <button className="btn btn-outline btn-sm" onClick={shareLink}>🔗 Compartir</button>
          {isCreator && <button className="btn btn-danger btn-sm" onClick={deleteTournament}>🗑 Eliminar</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>⚔️ Partidos</button>
        {!isSingleElim && <button className={tab === 'standings' ? 'active' : ''} onClick={() => setTab('standings')}>📊 Tabla</button>}
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>👥 Equipos</button>
      </div>

      {tab === 'teams' && (
        <div>
          <div className="card">
            <h2>Equipos ({tournament.teams.length}/{tournament.maxTeams})</h2>
            {tournament.teams.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No hay equipos registrados aún</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tournament.teams.map((team: Team) => (
                  <div key={team.id} className="team-card">
                    <div className="avatar">{team.tag || team.name[0]}</div>
                    <div className="info">
                      <div className="name">{team.name}</div>
                      {team.tag && <div className="tag">{team.tag}</div>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {team.players?.length || 0} jugadores
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isCreator && tournament.status === 'REGISTRATION' && (
              <form onSubmit={e => { e.preventDefault(); addTeam() }} className="inline-form" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Nombre del equipo</label>
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ej: Fnatic" required />
                </div>
                <div className="form-group">
                  <label>Tag</label>
                  <input value={teamTag} onChange={e => setTeamTag(e.target.value)} placeholder="FNC" maxLength={5} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Agregar</button>
              </form>
            )}
          </div>

          {isCreator && canGenerateFixtures && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>{tournament.teams.length} equipos registrados</p>
              <button className="btn btn-success btn-lg" onClick={generateFixtures}>
                🎯 Generar Fixtures
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'matches' && (
        <div>
          {matches.length === 0 ? (
            <div className="empty-state">
              <h3>No hay partidos</h3>
              <p>Registra equipos y genera los fixtures</p>
            </div>
          ) : isSingleElim ? (
            <div className="bracket">
              {Array.from(new Set(matches.map(m => m.roundNumber)))
                .sort()
                .map(round => (
                  <div key={round} className="bracket-round">
                    <h3>Ronda {round}</h3>
                    {matches.filter(m => m.roundNumber === round).map(m => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        editable={isCreator && (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')}
                        onEdit={() => startEditScore(m)}
                        editing={editingScore === m.id}
                        score1={score1}
                        score2={score2}
                        setScore1={setScore1}
                        setScore2={setScore2}
                        onSave={() => saveScore(m.id)}
                      />
                    ))}
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  editable={isCreator && (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')}
                  onEdit={() => startEditScore(m)}
                  editing={editingScore === m.id}
                  score1={score1}
                  score2={score2}
                  setScore1={setScore1}
                  setScore2={setScore2}
                  onSave={() => saveScore(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'standings' && !isSingleElim && (
        <div className="card">
          {standings.length === 0 ? (
            <div className="empty-state">
              <h3>Sin posiciones aún</h3>
              <p>Los puntajes aparecerán cuando se jueguen partidos</p>
            </div>
          ) : (
            <table className="standing-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo</th>
                  <th>PJ</th>
                  <th>G</th>
                  <th>E</th>
                  <th>P</th>
                  <th>GF</th>
                  <th>GC</th>
                  <th>DG</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.id}>
                    <td className="pos">{i + 1}</td>
                    <td className="team-name">{s.team.name}</td>
                    <td>{s.matchesPlayed}</td>
                    <td>{s.wins}</td>
                    <td>{s.draws}</td>
                    <td>{s.losses}</td>
                    <td>{s.goalsFor}</td>
                    <td>{s.goalsAgainst}</td>
                    <td>{s.goalDifference}</td>
                    <td className="highlight">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, editable, onEdit, editing, score1, score2, setScore1, setScore2, onSave }: {
  match: Match; editable: boolean; onEdit: () => void; editing: boolean
  score1: number; score2: number; setScore1: (v: number) => void; setScore2: (v: number) => void; onSave: () => void
}) {
  const isBye = match.status === 'BYE'

  if (isBye) {
    return (
      <div className="match-card" style={{ opacity: 0.5 }}>
        <div className="teams">
          <div className="team-row winner">{match.team1?.name} (BYE)</div>
        </div>
        <div className="status">Descansa</div>
      </div>
    )
  }

  return (
    <div className="match-card" onClick={editable && !editing ? onEdit : undefined}>
      <div className="teams">
        <div className={`team-row ${match.winner?.id === match.team1?.id ? 'winner' : ''}`}>
          <span>{match.team1?.name || '—'}</span>
          {editing ? (
            <input className="score" type="number" min={0} value={score1}
              style={{ width: '3rem', textAlign: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.25rem', color: '#e2e8f0', padding: '0.125rem' }}
              onChange={e => setScore1(Math.max(0, parseInt(e.target.value) || 0))}
              onClick={e => e.stopPropagation()} />
          ) : (
            <span className="score">{match.status === 'COMPLETED' ? match.score1 : '-'}</span>
          )}
        </div>
        <div className={`team-row ${match.winner?.id === match.team2?.id ? 'winner' : ''}`}>
          <span>{match.team2?.name || '—'}</span>
          {editing ? (
            <input className="score" type="number" min={0} value={score2}
              style={{ width: '3rem', textAlign: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '0.25rem', color: '#e2e8f0', padding: '0.125rem' }}
              onChange={e => setScore2(Math.max(0, parseInt(e.target.value) || 0))}
              onClick={e => e.stopPropagation()} />
          ) : (
            <span className="score">{match.status === 'COMPLETED' ? match.score2 : '-'}</span>
          )}
        </div>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
          <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onSave() }}>Guardar</button>
          <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); }}>Cancelar</button>
        </div>
      ) : (
        <div className="status">{match.status === 'COMPLETED' ? `✅ Gana ${match.winner?.name}` : '⏳ Pendiente'}</div>
      )}
    </div>
  )
}
