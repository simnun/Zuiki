import { auth } from '@/lib/auth'
import type { UserRole } from '@/generated/prisma/client'
import type { SessionUser } from '@/types'

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    companyId: session.user.companyId,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
  }
}

export async function authorize(allowedRoles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Not authenticated')
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }

  return user
}

export async function requireCompany(): Promise<string> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Not authenticated')
  }

  if (!user.companyId) {
    throw new Error('Forbidden: User does not belong to a company')
  }

  return user.companyId
}
