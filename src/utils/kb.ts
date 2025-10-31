import { KBEntry } from '@common/types'
import { storage } from './storage'

const KB_KEY = 'kbEntries'

export async function getKBEntries(): Promise<KBEntry[]> {
  return (await storage.get<KBEntry[]>(KB_KEY)) || []
}

export async function saveKBEntry(entry: KBEntry): Promise<void> {
  const entries = await getKBEntries()
  const idx = entries.findIndex(e => e.id === entry.id)
  if (idx >= 0) {
    entries[idx] = entry
  } else {
    entries.push(entry)
  }
  await storage.set(KB_KEY, entries)
}

export async function deleteKBEntry(entryId: string): Promise<void> {
  const entries = await getKBEntries()
  const filtered = entries.filter(e => e.id !== entryId)
  await storage.set(KB_KEY, filtered)
}
