import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '@/store/appStore'
import { Card, Table, Badge, ScoreChip, Input } from '@/components/ui'
import { useState, useMemo } from 'react'

export const Route = createFileRoute('/candidates')({
  component: CandidatesPage,
})

function CandidatesPage() {
  const candidates = useAppStore((s) => s.candidates)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => 
    candidates.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())),
    [candidates, search]
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Talent Pool</h2>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">Verified Candidate Database</p>
        </div>
        <Input 
          placeholder="Quick search..." 
          className="w-72" 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="p-0 overflow-hidden border-white/5 bg-zinc-900/50">
        <Table>
          <thead className="bg-white/5 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="p-4 text-left">Candidate Name</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Neural Score</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="font-bold text-white">{c.firstName} {c.lastName}</div>
                  <div className="text-xs text-zinc-500">{c.email}</div>
                </td>
                <td className="p-4 text-sm font-mono">{c.position}</td>
                <td className="p-4"><ScoreChip score={c.weightedScore} size="sm" /></td>
                <td className="p-4">
                  <Badge variant={c.decision === 'STRONG_HIRE' ? 'success' : 'info'}>
                    {c.decision}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

