import { useEffect, useRef, useCallback } from 'react'

interface ScoreUpdate {
  type: 'SCORE_UPDATE'
  matchId: number
  tournamentId: number
  score1: number
  score2: number
  winnerId: number | null
  status: string
}

export function useWebSocket(tournamentId: number | null, onScoreUpdate: (data: ScoreUpdate) => void) {
  const ws = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!tournamentId) return
    const apiUrl = import.meta.env.VITE_API_URL || ''
    if (apiUrl) {
      const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/live'
      ws.current = new WebSocket(wsUrl)
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws.current = new WebSocket(`${protocol}//${window.location.host}/ws/live`)
    }

    ws.current.onmessage = (event) => {
      try {
        const data: ScoreUpdate = JSON.parse(event.data)
        if (data.type === 'SCORE_UPDATE' && data.tournamentId === tournamentId) {
          onScoreUpdate(data)
        }
      } catch { /* ignore */ }
    }

    ws.current.onclose = () => {
      setTimeout(connect, 3000)
    }
  }, [tournamentId, onScoreUpdate])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return ws
}
