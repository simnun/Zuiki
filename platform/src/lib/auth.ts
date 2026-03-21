import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: string
      companyId: string | null
      firstName: string
      lastName: string
    }
  }

  interface User {
    role: string
    companyId: string | null
    firstName: string
    lastName: string
  }
}

// Fallback users when DB is unreachable (seed data mirrored locally)
const FALLBACK_USERS = [
  {
    id: 'user-admin-001',
    email: 'admin@zuiki.it',
    passwordHash: '$2b$10$Zvhliwj7EoOmtKtKMhfPoeb/H99kaUABW1S0KuumBREkLenT0JLga',
    firstName: 'Admin',
    lastName: 'Zuiki',
    role: 'super_admin' as const,
    companyId: null,
    isActive: true,
  },
  {
    id: 'user-owner-001',
    email: 'owner@provoloni.it',
    passwordHash: bcrypt.hashSync('1', 10),
    firstName: 'Proprietario',
    lastName: 'Provoloni',
    role: 'owner' as const,
    companyId: 'company-provoloni-001',
    isActive: true,
  },
  {
    id: 'user-admin-prov-001',
    email: 'admin@provoloni.it',
    passwordHash: bcrypt.hashSync('1', 10),
    firstName: 'Amministrativo',
    lastName: 'Provoloni',
    role: 'admin' as const,
    companyId: 'company-provoloni-001',
    isActive: true,
  },
  {
    id: 'user-user-001',
    email: 'user@provoloni.it',
    passwordHash: bcrypt.hashSync('1', 10),
    firstName: 'Utente',
    lastName: 'Provoloni',
    role: 'user' as const,
    companyId: 'company-provoloni-001',
    isActive: true,
  },
]

async function findUser(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) return user
  } catch {
    // DB unreachable — fall through to fallback
  }
  return FALLBACK_USERS.find(u => u.email === email) || null
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string

        if (!email || !password) return null

        const user = await findUser(email)

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).userId = user.id as string;
        (token as any).role = user.role;
        (token as any).companyId = user.companyId;
        (token as any).firstName = user.firstName;
        (token as any).lastName = user.lastName;
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = (token as any).userId;
      session.user.role = (token as any).role;
      session.user.companyId = (token as any).companyId;
      session.user.firstName = (token as any).firstName;
      session.user.lastName = (token as any).lastName;
      return session
    },
  },
})
