import { createFileRoute } from '@tanstack/react-router'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components/ui'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { config, updateConfig, resetConfig } = useAppStore()
  const { register, handleSubmit } = useForm({ defaultValues: config })

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h2 className="text-3xl font-black text-white tracking-tight">System Configuration</h2>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">Adjust Evaluation Parameters</p>
      </header>

      <Card className="p-8 border-white/5 bg-zinc-900/50 space-y-6">
        <form onSubmit={handleSubmit(updateConfig)} className="space-y-6">
          <Input label="Organization Name" {...register('organizationName')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Budget" type="number" {...register('maxBudget')} />
            <Input label="Currency" {...register('currency')} />
          </div>
          
          <div className="pt-6 flex gap-4">
            <Button variant="primary" className="flex-1" type="submit">Save Changes</Button>
            <Button variant="secondary" onClick={() => resetConfig()}>Reset to Default</Button>
          </div>
        </form>
      </Card>

      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
        <p className="text-xs text-blue-400 leading-relaxed italic text-center">
          "Sistem ini menggunakan algoritma Pulse-IQ untuk menghitung kecocokan kandidat secara real-time berdasarkan bobot kompetensi yang Anda tentukan."
        </p>
      </div>
    </div>
  )
}

