import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSession, type SessionResponse } from '../services/authService'
import { ApiError } from '../services/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const result = await getSession()
      setSession(result)
      return result
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null)
        return null
      }
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getSession(controller.signal)
      .then(setSession)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null)
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  const value = useMemo(
    () => ({ session, loading, refreshSession, clearSession }),
    [session, loading, refreshSession, clearSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
