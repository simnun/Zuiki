export type SessionUser = {
  id: string
  email: string
  role: string
  companyId: string | null
  firstName: string
  lastName: string
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
