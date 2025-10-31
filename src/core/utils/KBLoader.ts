import { DataPoint } from '@common/types'
import { getKBEntries } from '@utils/kb'

/**
 * Loads KB entries from storage and converts them to data points
 * This utility can be used in service worker context
 * Reuses getKBEntries() from utils/kb.ts to avoid duplication
 */
export async function loadKBDataPoints(): Promise<DataPoint[]> {
  const kbEntries = await getKBEntries()
  
  return kbEntries.map(entry => ({
    id: `kb_${entry.id}`, // Match the format used in UI: kb_${entry.id}
    name: `KB: ${entry.name}`,
    type: 'context' as const,
    value: {
      text: entry.content,
      title: entry.name,
      source: 'kb'
    },
    source: 'kb',
    timestamp: entry.updatedAt || entry.createdAt || Date.now()
  }))
}

