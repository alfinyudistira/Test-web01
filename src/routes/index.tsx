import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Calculator } from '@/modules/Calculator'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/')({
  component: () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-3xl font-black text-white tracking-tight">Hiring Intelligence</h2>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">Neural Evaluation Engine v5.0</p>
      </header>
      
      <Calculator />
    </motion.div>
  ),
})

