import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const stats = useAppStore((s) => s.stats)
  
  const chartData = [
    { name: 'Strong Hire', value: stats.strongHires, color: '#10b981' },
    { name: 'Standard Hire', value: stats.hires, color: '#3b82f6' },
    { name: 'No Hire', value: stats.noHires, color: '#ef4444' },
  ]

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tight">Recruitment Insights</h2>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">Data-Driven Talent Metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Evaluated" value={stats.total} color="blue" />
        <StatCard label="Avg. Neural Score" value={stats.avgScore.toFixed(2)} color="emerald" />
        <StatCard label="Strong Hire Rate" value={`${((stats.strongHires / (stats.total || 1)) * 100).toFixed(0)}%`} color="purple" />
      </div>

      <Card className="p-8 bg-zinc-900/50 border-white/5">
        <h3 className="font-bold text-white mb-8 font-mono text-sm uppercase tracking-widest text-center">Decision Distribution</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px'}}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ label, value, color }: any) {
  return (
    <Card className="p-6 border-white/5 bg-zinc-900/50 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 bg-${color}-500`} />
      <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-4xl font-black text-white">{value}</p>
    </Card>
  )
}

