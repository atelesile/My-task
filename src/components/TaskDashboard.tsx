import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../services/api'
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskQuery,
  type TaskStatus,
} from '../services/taskService'

const EMPTY_TASK: TaskInput = {
  title: '',
  description: '',
  assignee: '',
  category: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
}

const PAGE_SIZE = 10

type Filters = Pick<TaskQuery, 'search' | 'status' | 'priority' | 'assignee' | 'dueAfter' | 'dueBefore'>

const EMPTY_FILTERS: Filters = {
  search: '',
  status: '',
  priority: '',
  assignee: '',
  dueAfter: '',
  dueBefore: '',
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.'
    if (error.status === 403) return 'You do not have permission to perform this action.'
    if (error.status === 404) return 'This task could not be found. Refresh the list and try again.'
    if (error.status === 429) return 'Too many requests. Please wait a moment and try again.'
    if (error.status >= 500) return 'TaskFlow is temporarily unavailable. Please try again later.'
    if (error.details?.length) {
      return error.details.map((detail) => detail.message).join(' ')
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'The task operation could not be completed.'
}

function taskDate(task: Task) {
  if (!task.dueDate) return ''
  return task.dueDate.length >= 10 ? task.dueDate.slice(0, 10) : task.dueDate
}

function hasActiveFilters(filters: Filters) {
  return Object.values(filters).some(Boolean)
}

interface TaskDashboardProps {
  userName?: string
  loggingOut: boolean
  logoutError: string
  onLogout: () => void
  onUnauthorized: () => void
}

export function TaskDashboard({
  userName,
  loggingOut,
  logoutError,
  onLogout,
  onUnauthorized,
}: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS)
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState<TaskInput>(EMPTY_TASK)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    getTasks({ ...appliedFilters, page, limit: PAGE_SIZE }, controller.signal)
      .then((result) => {
        if (!active) return
        setTasks(result.tasks)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch((taskError: unknown) => {
        if (!active || (taskError instanceof DOMException && taskError.name === 'AbortError')) {
          return
        }
        if (taskError instanceof ApiError && taskError.status === 401) {
          onUnauthorized()
          return
        }
        setError(getErrorMessage(taskError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [appliedFilters, page, refreshKey, onUnauthorized])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (filters.dueAfter && filters.dueBefore && filters.dueAfter > filters.dueBefore) {
      setError('The start due date must be on or before the end due date.')
      return
    }

    setError('')
    setNotice('')
    setLoading(true)
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
    setError('')
    setNotice('')
    setLoading(true)
  }

  function changePage(nextPage: number) {
    setError('')
    setLoading(true)
    setPage(nextPage)
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_TASK)
    setNotice('')
    setError('')
    setShowForm(true)
  }

  function openEditForm(task: Task) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description ?? '',
      assignee: task.assignee ?? '',
      category: task.category ?? '',
      priority: task.priority,
      status: task.status,
      dueDate: taskDate(task),
    })
    setNotice('')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_TASK)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    setNotice('')

    const payload: TaskInput = {
      title: form.title.trim(),
      description: form.description?.trim() || '',
      assignee: form.assignee?.trim() || '',
      category: form.category?.trim() || '',
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || '',
    }

    try {
      if (editingId) {
        await updateTask(editingId, payload)
        setNotice('Task updated successfully.')
      } else {
        await createTask(payload)
        setNotice('Task created successfully.')
      }
      closeForm()
      setLoading(true)
      setRefreshKey((current) => current + 1)
    } catch (taskError) {
      if (taskError instanceof ApiError && taskError.status === 401) {
        onUnauthorized()
        return
      }
      setError(getErrorMessage(taskError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    if (deletingId) return

    setDeletingId(task.id)
    setError('')
    setNotice('')
    try {
      await deleteTask(task.id)
      setNotice('Task deleted successfully.')
      setLoading(true)
      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        setRefreshKey((current) => current + 1)
      }
    } catch (taskError) {
      if (taskError instanceof ApiError && taskError.status === 401) {
        onUnauthorized()
        return
      }
      setError(getErrorMessage(taskError))
    } finally {
      setDeletingId(null)
    }
  }

  const resultIsFiltered = hasActiveFilters(appliedFilters)

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="auth-brand">TaskFlow</p>
          <h1>My tasks</h1>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </header>

      {logoutError && <div className="dashboard-alert alert error" role="alert">{logoutError}</div>}
      {error && <div className="dashboard-alert alert error" role="alert">{error}</div>}
      {notice && <div className="dashboard-alert alert success" role="status">{notice}</div>}

      <section className="dashboard-card">
        <div className="task-toolbar">
          <div>
            <h2>Welcome{userName ? `, ${userName}` : ''}</h2>
            <p>{loading ? 'Loading your tasks...' : `${total} task${total === 1 ? '' : 's'}`}</p>
          </div>
          <button className="primary-button" type="button" onClick={openCreateForm}>
            Add task
          </button>
        </div>

        <form className="task-filters" onSubmit={applyFilters}>
          <label className="search-field">
            Search tasks
            <input
              type="search"
              placeholder="Search title or description"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters({
                ...filters,
                status: event.target.value as TaskStatus | '',
              })}
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label>
            Priority
            <select
              value={filters.priority}
              onChange={(event) => setFilters({
                ...filters,
                priority: event.target.value as TaskPriority | '',
              })}
            >
              <option value="">All priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <label>
            Assignee
            <input
              type="text"
              maxLength={120}
              placeholder="Any assignee"
              value={filters.assignee}
              onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}
            />
          </label>
          <label>
            Due on or after
            <input
              type="date"
              value={filters.dueAfter}
              onChange={(event) => setFilters({ ...filters, dueAfter: event.target.value })}
            />
          </label>
          <label>
            Due on or before
            <input
              type="date"
              value={filters.dueBefore}
              onChange={(event) => setFilters({ ...filters, dueBefore: event.target.value })}
            />
          </label>
          <div className="filter-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              Apply filters
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={clearFilters}
              disabled={loading && !hasActiveFilters(filters)}
            >
              Clear filters
            </button>
          </div>
        </form>

        {showForm && (
          <form className="task-form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit task' : 'Create task'}</h2>
            <div className="task-form-grid">
              <label>
                Title
                <input
                  type="text"
                  minLength={1}
                  maxLength={200}
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <label>
                Assignee
                <input
                  type="text"
                  maxLength={120}
                  value={form.assignee}
                  onChange={(event) => setForm({ ...form, assignee: event.target.value })}
                />
              </label>
              <label>
                Category
                <input
                  type="text"
                  maxLength={100}
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
              </label>
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(event) => setForm({
                    ...form,
                    priority: event.target.value as TaskPriority,
                  })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm({
                    ...form,
                    status: event.target.value as TaskStatus,
                  })}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
            </div>
            <div className="task-form-actions">
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Create task'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="task-empty" role="status">Loading tasks...</div>
        ) : error && tasks.length === 0 ? (
          <div className="task-empty">
            <h3>Could not load tasks</h3>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setError('')
                setLoading(true)
                setRefreshKey((current) => current + 1)
              }}
            >
              Try again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="task-empty">
            <h3>{resultIsFiltered ? 'No matching tasks' : 'No tasks yet'}</h3>
            <p>
              {resultIsFiltered
                ? 'Try another search or clear some filters.'
                : 'Create your first task to get started.'}
            </p>
          </div>
        ) : (
          <div className="task-list" aria-busy={loading}>
            {tasks.map((task) => (
              <article className="task-item" key={task.id}>
                <div className="task-item-main">
                  <h3>{task.title}</h3>
                  {task.description && <p>{task.description}</p>}
                  <div className="task-meta">
                    <span>{task.status}</span>
                    <span>{task.priority}</span>
                    {task.category && <span>{task.category}</span>}
                    {task.assignee && <span>Assigned to {task.assignee}</span>}
                    {task.dueDate && <span>Due {taskDate(task)}</span>}
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openEditForm(task)}
                    disabled={submitting || deletingId === task.id || loading}
                  >
                    Edit
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDelete(task)}
                    disabled={deletingId === task.id || loading}
                  >
                    {deletingId === task.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <nav className="pagination" aria-label="Task pages">
          <span>
            Page {totalPages === 0 ? 0 : page} of {totalPages} · {total} total
          </span>
          <div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={loading || page <= 1}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={loading || page >= totalPages}
            >
              Next
            </button>
          </div>
        </nav>
      </section>
    </main>
  )
}
