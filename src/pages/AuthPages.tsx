import { useState, type FormEvent } from 'react'
import { ApiError } from '../services/api'
import { login, register } from '../services/authService'
import { useAuth } from '../hooks/useAuth'

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.details?.length) {
      return error.details.map((detail) => detail.message).join(' ')
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function LoginPage({ navigate }: { navigate: (path: string) => void }) {
  const { refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      await refreshSession()
      navigate('/tasks')
    } catch (loginError) {
      setError(getErrorMessage(loginError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-brand">TaskFlow</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-copy">Sign in to manage your tasks.</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          Need an account? <button type="button" onClick={() => navigate('/register')}>Register</button>
        </p>
      </section>
    </main>
  )
}

export function RegisterPage({ navigate }: { navigate: (path: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await register({ name, email, password, confirmPassword })
      setSuccess('Registration successful. You can now sign in.')
    } catch (registrationError) {
      setError(getErrorMessage(registrationError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="auth-brand">TaskFlow</p>
        <h1 id="register-title">Create account</h1>
        <p className="auth-copy">Register to start managing tasks.</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        {success && <div className="alert success" role="status">{success}</div>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <label htmlFor="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <button type="button" onClick={() => navigate('/login')}>Sign in</button>
        </p>
      </section>
    </main>
  )
}
