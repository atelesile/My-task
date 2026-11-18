import { apiRequest } from './api'

export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export interface Task {
  id: string
  title: string
  description?: string | null
  assignee?: string | null
  category?: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface TaskInput {
  title: string
  description?: string
  assignee?: string
  category?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
}

export type TaskUpdate = Partial<Omit<TaskInput, 'title'>> & { title?: string }

export interface TaskPage {
  tasks: Task[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TaskQuery {
  search?: string
  status?: TaskStatus | ''
  priority?: TaskPriority | ''
  assignee?: string
  dueAfter?: string
  dueBefore?: string
  page?: number
  limit?: number
}

export async function getTasks(
  query: TaskQuery = {},
  signal?: AbortSignal,
): Promise<TaskPage> {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.assignee?.trim()) params.set('assignee', query.assignee.trim())
  if (query.dueAfter) params.set('dueAfter', query.dueAfter)
  if (query.dueBefore) params.set('dueBefore', query.dueBefore)
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 10))

  const result = await apiRequest<Task[] | TaskPage>(`/tasks?${params.toString()}`, {
    method: 'GET',
  }, signal)

  if (Array.isArray(result)) {
    return {
      tasks: result,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      total: result.length,
      totalPages: 1,
    }
  }
  return result
}

export async function getTaskById(id: string, signal?: AbortSignal): Promise<Task> {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'GET',
  }, signal)
}

export async function createTask(data: TaskInput, signal?: AbortSignal): Promise<Task> {
  return apiRequest<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }, signal)
}

export async function updateTask(
  id: string,
  data: TaskUpdate,
  signal?: AbortSignal,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, signal)
}

export async function deleteTask(id: string, signal?: AbortSignal): Promise<void> {
  await apiRequest<void>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, signal)
}
