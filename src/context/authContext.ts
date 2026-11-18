import { createContext } from 'react'
import type { SessionResponse } from '../services/authService'

export interface AuthContextValue {
  session: SessionResponse | null
  loading: boolean
  refreshSession: () => Promise<SessionResponse | null>
  clearSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
