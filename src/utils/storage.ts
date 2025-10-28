// Unified storage utility for consistent storage operations
// Uses chrome.storage.local for all data persistence

export class StorageManager {
  private static instance: StorageManager

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  // Get data from storage
  async get<T = any>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(result[key] || null)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Set data in storage
  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Remove data from storage
  async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Clear all storage
  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Get multiple keys at once
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(result)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // Set multiple keys at once
  async setMultiple(data: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }
}

// Export singleton instance
export const storage = StorageManager.getInstance()

