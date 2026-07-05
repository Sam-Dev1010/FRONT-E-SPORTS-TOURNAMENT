const API_URL = import.meta.env.VITE_API_URL || ''
const BASE = `${API_URL}/api/tournaments`

export interface Tournament {
  id: number; name: string; game?: string; description?: string
  maxTeams: number; maxPlayersPerTeam?: number
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN'
  status: 'DRAFT' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string; teams: Team[]; matches: Match[]; standings: Standing[]
}

export interface Team {
  id: number; name: string; tag?: string; logoUrl?: string; players: string[]
}

export interface Match {
  id: number; roundNumber: number; matchPosition: number
  team1?: Team; team2?: Team; score1: number; score2: number
  winner?: Team; status: string; nextMatch?: { id: number }
}

export interface Standing {
  id: number; team: Team
  points: number; wins: number; losses: number; draws: number
  goalsFor: number; goalsAgainst: number; matchesPlayed: number
  goalDifference: number
}

async function handleResponse(r: Response) {
  if (!r.ok) {
    const text = await r.text()
    throw new Error(text || `Error ${r.status}`)
  }
  return r.json()
}

export const api = {
  async getTournaments(): Promise<Tournament[]> {
    const r = await fetch(BASE)
    return handleResponse(r)
  },
  async getTournament(id: number): Promise<Tournament> {
    const r = await fetch(`${BASE}/${id}`)
    return handleResponse(r)
  },
  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(r)
  },
  async addTeam(tournamentId: number, data: Partial<Team>): Promise<Team> {
    const r = await fetch(`${BASE}/${tournamentId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(r)
  },
  async generateFixtures(tournamentId: number): Promise<Match[]> {
    const r = await fetch(`${BASE}/${tournamentId}/fixtures`, { method: 'POST' })
    return handleResponse(r)
  },
  async getMatches(tournamentId: number): Promise<Match[]> {
    const r = await fetch(`${BASE}/${tournamentId}/matches`)
    return handleResponse(r)
  },
  async getStandings(tournamentId: number): Promise<Standing[]> {
    const r = await fetch(`${BASE}/${tournamentId}/standings`)
    return handleResponse(r)
  },
  async updateScore(matchId: number, score1: number, score2: number): Promise<Match> {
      const r = await fetch(`${API_URL}/api/tournaments/matches/${matchId}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score1, score2 }),
    })
    return handleResponse(r)
  },
}
