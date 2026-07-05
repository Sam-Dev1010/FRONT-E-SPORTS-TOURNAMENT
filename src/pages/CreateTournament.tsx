import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/tournamentApi'

export default function CreateTournament() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', game: '', description: '',
    maxTeams: 8, maxPlayersPerTeam: 5,
    type: 'SINGLE_ELIMINATION'
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const t = await api.createTournament({ ...form, type: form.type as any })
      navigate(`/tournament/${t.id}`)
    } catch (err: any) {
      alert('Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Crear nuevo torneo</h2>
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label>Nombre del torneo *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ej: ESL Pro League" />
          </div>
          <div className="form-group">
            <label>Juego</label>
            <input value={form.game} onChange={e => setForm({...form, game: e.target.value})} placeholder="Ej: League of Legends, Valorant" />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Máx. equipos</label>
              <input type="number" min={2} max={64} value={form.maxTeams} onChange={e => setForm({...form, maxTeams: +e.target.value})} />
            </div>
            <div className="form-group">
              <label>Jugadores por equipo</label>
              <input type="number" min={1} max={10} value={form.maxPlayersPerTeam} onChange={e => setForm({...form, maxPlayersPerTeam: +e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Tipo de torneo</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="SINGLE_ELIMINATION">Eliminación Directa (Single Elimination)</option>
              <option value="ROUND_ROBIN">Todos contra Todos (Round Robin)</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Creando...' : 'Crear Torneo'}
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
