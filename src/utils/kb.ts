import { KBEntry } from '@common/types'

const KB_KEY = 'kbEntries'

export async function getKBEntries(): Promise<KBEntry[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([KB_KEY], (result) => {
      resolve((result[KB_KEY] as KBEntry[]) || [])
    })
  })
}

export async function saveKBEntry(entry: KBEntry): Promise<void> {
  const entries = await getKBEntries()
  const idx = entries.findIndex(e => e.id === entry.id)
  if (idx >= 0) entries[idx] = entry
  else entries.push(entry)
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KB_KEY]: entries }, () => resolve())
  })
}

export async function deleteKBEntry(entryId: string): Promise<void> {
  const entries = await getKBEntries()
  const filtered = entries.filter(e => e.id !== entryId)
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KB_KEY]: filtered }, () => resolve())
  })
}

