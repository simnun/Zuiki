'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

type CompanyDetail = {
  id: string; name: string; slug: string; isActive: boolean
  users: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean }[]
  _count: { shootingSessions: number }
}

export default function CompanyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<CompanyDetail | null>(null)

  useEffect(() => {
    fetch(`/api/companies/${id}`).then(r => r.json()).then(setCompany)
  }, [id])

  if (!company) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div className="animate-fadeUp">
      <button className="btn btn-s" onClick={() => router.push('/admin/companies')} style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }}>← Indietro</button>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{company.name}</h1>

      <div className="grid2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Sessioni</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{company._count.shootingSessions}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Utenti</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{company.users.length}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Utenti</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Attivo</th></tr></thead>
          <tbody>
            {company.users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                <td>{u.email}</td>
                <td><span className="tag-t">{u.role}</span></td>
                <td style={{ color: u.isActive ? 'var(--ok)' : 'var(--err)', fontWeight: 700, fontSize: 12 }}>{u.isActive ? 'Si' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
