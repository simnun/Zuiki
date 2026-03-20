'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type Company = { id: string; name: string; slug: string; isActive: boolean; createdAt: string; _count: { users: number; shootingSessions: number } }

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(d => { setCompanies(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  return (
    <div className="animate-fadeUp">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 32 }}>Aziende</h1>
      {loading ? <div className="spinner" /> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Slug</th><th>Utenti</th><th>Sessioni</th><th>Stato</th><th></th></tr></thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td><code style={{ fontSize: 12 }}>{c.slug}</code></td>
                  <td>{c._count.users}</td>
                  <td>{c._count.shootingSessions}</td>
                  <td><span style={{ fontSize: 11, fontWeight: 700, color: c.isActive ? 'var(--ok)' : 'var(--err)' }}>{c.isActive ? 'Attiva' : 'Disattiva'}</span></td>
                  <td><Link href={`/admin/companies/${c.id}`} className="btn btn-s" style={{ textDecoration: 'none', padding: '4px 12px', fontSize: 11 }}>Dettagli</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
