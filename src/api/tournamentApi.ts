const STORAGE_KEY = 'e-sports-tournaments'
let nextId = parseInt(localStorage.getItem('e-sports-next-id') || '1')

export function getVisitorId(): string {
  let id = localStorage.getItem('e-sports-visitor-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('e-sports-visitor-id', id)
  }
  return id
}

export interface Tournament {
  id: number; name: string; game?: string; description?: string
  maxTeams: number; maxPlayersPerTeam?: number
  type: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN'
  status: 'DRAFT' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string; teams: Team[]; matches: Match[]; standings: Standing[]
  creatorVisitorId?: string
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

function load(): Tournament[] {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

function save(items: Tournament[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function genId() {
  const id = nextId++
  localStorage.setItem('e-sports-next-id', String(nextId))
  return id
}

function delay<T>(val: T): Promise<T> {
  return new Promise(r => setTimeout(() => r(val), 200))
}

export const api = {
  async getTournaments(): Promise<Tournament[]> {
    return delay(load())
  },

  async getTournament(id: number): Promise<Tournament> {
    const all = load()
    const t = all.find(x => x.id === id)
    if (!t) throw new Error('Torneo no encontrado')
    return delay(t)
  },

  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const all = load()
    const t: Tournament = {
      id: genId(),
      name: data.name || 'Sin nombre',
      game: data.game,
      description: data.description,
      maxTeams: data.maxTeams || 8,
      maxPlayersPerTeam: data.maxPlayersPerTeam || 5,
      type: (data.type as any) || 'SINGLE_ELIMINATION',
      status: 'REGISTRATION',
      createdAt: new Date().toISOString(),
      creatorVisitorId: getVisitorId(),
      teams: [],
      matches: [],
      standings: [],
    }
    all.push(t)
    save(all)
    return delay(t)
  },

  async addTeam(tournamentId: number, data: Partial<Team>): Promise<Team> {
    const all = load()
    const t = all.find(x => x.id === tournamentId)
    if (!t) throw new Error('Torneo no encontrado')
    if (t.teams.length >= t.maxTeams) throw new Error('Máximo de equipos alcanzado')
    const team: Team = {
      id: genId(),
      name: data.name || '',
      tag: data.tag,
      players: data.players || [],
    }
    t.teams.push(team)
    save(all)
    return delay(team)
  },

  async generateFixtures(tournamentId: number): Promise<Match[]> {
    const all = load()
    const t = all.find(x => x.id === tournamentId)
    if (!t) throw new Error('Torneo no encontrado')

    if (t.type === 'SINGLE_ELIMINATION') {
      t.matches = generateSingleElimination(t)
    } else {
      t.matches = generateRoundRobin(t)
    }

    t.status = 'IN_PROGRESS'
    t.standings = t.teams.map(team => ({
      id: genId(),
      team,
      points: 0, wins: 0, losses: 0, draws: 0,
      goalsFor: 0, goalsAgainst: 0,
      matchesPlayed: 0, goalDifference: 0,
    }))

    save(all)
    return delay(t.matches)
  },

  async getMatches(tournamentId: number): Promise<Match[]> {
    const all = load()
    const t = all.find(x => x.id === tournamentId)
    return delay(t ? t.matches : [])
  },

  async getStandings(tournamentId: number): Promise<Standing[]> {
    const all = load()
    const t = all.find(x => x.id === tournamentId)
    return delay(t ? t.standings : [])
  },

  async updateScore(matchId: number, score1: number, score2: number): Promise<Match> {
    const all = load()
    let found: Match | undefined
    for (const t of all) {
      const m = t.matches.find(x => x.id === matchId)
      if (m) {
        m.score1 = score1
        m.score2 = score2
        if (score1 !== score2) {
          m.winner = score1 > score2 ? m.team1 : m.team2
        }
        m.status = 'COMPLETED'

        if (t.type === 'SINGLE_ELIMINATION') {
          advanceWinner(t, m)
        }
        updateStandings(t)
        found = m
        break
      }
    }
    save(all)
    if (!found) throw new Error('Partido no encontrado')
    return delay(found)
  },

  async deleteTournament(id: number): Promise<void> {
    const all = load()
    const idx = all.findIndex(x => x.id === id)
    if (idx === -1) throw new Error('Torneo no encontrado')
    all.splice(idx, 1)
    save(all)
    return delay(undefined)
  },

  async deleteAllTournaments(): Promise<void> {
    save([])
    return delay(undefined)
  },
}

export function encodeShareUrl(t: Tournament): string {
  const json = JSON.stringify(t)
  const encoded = btoa(encodeURIComponent(json))
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`
}

export function decodeShareHash(): Tournament | null {
  const hash = window.location.hash
  const m = hash.match(/^#share=(.+)$/)
  if (!m) return null
  try {
    return JSON.parse(decodeURIComponent(atob(m[1])))
  } catch { return null }
}

export function importSharedTournament(t: Tournament): number {
  const all = load()
  if (all.some(x => x.id === t.id)) {
    t.id = genId()
  }
  all.push(t)
  save(all)
  return t.id
}

function generateSingleElimination(t: Tournament): Match[] {
  const teams = [...t.teams]
  const matches: Match[] = []
  const totalRounds = Math.ceil(Math.log2(teams.length))
  const totalSlots = Math.pow(2, totalRounds)

  const round1matches = totalSlots / 2
  let matchId = genId()

  const shuffled = [...teams]
  for (let i = 0; i < round1matches; i++) {
    const m: Match = {
      id: matchId++,
      roundNumber: 1,
      matchPosition: i,
      team1: shuffled[i * 2],
      team2: shuffled[i * 2 + 1],
      score1: 0, score2: 0,
      status: 'SCHEDULED',
    }
    if (!m.team1) { m.team1 = undefined as any; m.status = 'BYE' }
    if (!m.team2) { m.team2 = undefined as any; m.status = m.team1 ? 'BYE' : 'BYE' }
    matches.push(m)
  }

  for (let r = 2; r <= totalRounds; r++) {
    const numMatches = matches.filter(m => m.roundNumber === r - 1).length / 2
    for (let i = 0; i < numMatches; i++) {
      matches.push({
        id: matchId++,
        roundNumber: r,
        matchPosition: i,
        team1: undefined as any,
        team2: undefined as any,
        score1: 0, score2: 0,
        status: 'SCHEDULED',
      })
    }
  }

  return matches
}

function generateRoundRobin(t: Tournament): Match[] {
  const teams = [...t.teams]
  const matches: Match[] = []
  let matchId = genId()

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: matchId++,
        roundNumber: 1,
        matchPosition: matches.length,
        team1: teams[i],
        team2: teams[j],
        score1: 0, score2: 0,
        status: 'SCHEDULED',
      })
    }
  }

  return matches
}

function advanceWinner(t: Tournament, m: Match) {
  const next = t.matches.find(x => x.id === m.nextMatch?.id)
  if (!next) return
  const slotIndex = t.matches.filter(x => x.roundNumber === m.roundNumber && x.matchPosition < m.matchPosition).length % 2
  if (slotIndex === 0) next.team1 = m.winner
  else next.team2 = m.winner
}

function updateStandings(t: Tournament) {
  if (t.type !== 'ROUND_ROBIN') return
  const map = new Map<number, Standing>()
  for (const s of t.standings) map.set(s.team.id, s)

  for (const m of t.matches.filter(x => x.status === 'COMPLETED' && x.team1 && x.team2)) {
    const s1 = map.get(m.team1!.id)
    const s2 = map.get(m.team2!.id)
    if (!s1 || !s2) continue

    s1.matchesPlayed++
    s2.matchesPlayed++
    s1.goalsFor += m.score1
    s1.goalsAgainst += m.score2
    s2.goalsFor += m.score2
    s2.goalsAgainst += m.score1

    if (m.score1 > m.score2) {
      s1.wins++; s2.losses++
      s1.points += 3
    } else if (m.score1 < m.score2) {
      s2.wins++; s1.losses++
      s2.points += 3
    } else {
      s1.draws++; s2.draws++
      s1.points++; s2.points++
    }

    s1.goalDifference = s1.goalsFor - s1.goalsAgainst
    s2.goalDifference = s2.goalsFor - s2.goalsAgainst
  }

  t.standings.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference)
}
