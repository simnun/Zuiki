import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processSession, reprocessItem } from '@/lib/jobs/process-catalog'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processSession, reprocessItem],
})
