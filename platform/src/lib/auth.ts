import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PWD } from '@/lib/constants'

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
        const password = credentials?.password as string

        // Simple password check — same as the original StepLogin
        if (password !== PWD) {
          return null
        }

        const email = (credentials?.email as string) || 'user@zuiki.it'

        return {
          id: '1',
          email,
          role: 'ADMIN',
          companyId: null,
          firstName: email.split('@')[0],
          lastName: '',
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
