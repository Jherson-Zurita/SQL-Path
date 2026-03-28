import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import initSqlJs, { type Database } from 'sql.js'
import { SAMPLE_DB_SQL } from '../utils/sampleDatabase'

export interface QueryResult {
  columns: string[]
  values: any[][]
  rowCount: number
  timeMs: number
  error?: string
}

export interface TableInfo {
  name: string
  columns: { name: string; type: string; notnull: boolean; pk: boolean }[]
  foreignKeys: { table: string; from: string; to: string }[]
  rowCount: number
}

export interface DatabaseMetadata {
  id: string
  name: string
  tableCount: number
  isSample?: boolean
}

interface DatabaseContextType {
  databases: DatabaseMetadata[]
  activeDatabaseId: string | null
  activeTables: TableInfo[]
  isReady: boolean
  executeQuery: (sql: string) => QueryResult
  executeManyStatements: (sql: string) => { success: boolean; error?: string; affectedStatements: number }
  refreshTables: () => void
  resetDatabase: () => void
  importSQL: (sql: string) => { success: boolean; error?: string }
  importFullDatabase: (file: File) => Promise<{ success: boolean; error?: string }>
  exportDatabase: () => Uint8Array | null
  createDatabase: (name: string) => void
  removeDatabase: (id: string) => void
  selectDatabase: (id: string) => void
  queryHistory: { sql: string; timestamp: number; success: boolean }[]
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function useSqlDatabase() {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useSqlDatabase must be used inside DatabaseProvider')
  return ctx
}

interface DatabaseInstance {
  id: string
  name: string
  db: Database
  isSample?: boolean
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [SQL, setSQL] = useState<any>(null)
  const dbInstances = useRef<DatabaseInstance[]>([])
  const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(null)
  const [databasesMetadata, setDatabasesMetadata] = useState<DatabaseMetadata[]>([])
  const [activeTables, setActiveTables] = useState<TableInfo[]>([])
  const [isReady, setIsReady] = useState(false)
  const [queryHistory, setQueryHistory] = useState<{ sql: string; timestamp: number; success: boolean }[]>([])

  const getActiveDB = () => {
    return dbInstances.current.find(d => d.id === activeDatabaseId)?.db || null
  }

  const refreshTables = useCallback(() => {
    const db = getActiveDB()
    if (!db) { setActiveTables([]); return }

    try {
      const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      if (!res.length) { setActiveTables([]); return }

      const tableNames = res[0].values.map((r: any) => r[0] as string)
      const infos: TableInfo[] = tableNames.map((name: string) => {
        const cols = db.exec(`PRAGMA table_info("${name}")`)
        const count = db.exec(`SELECT COUNT(*) FROM "${name}"`)
        const fks = db.exec(`PRAGMA foreign_key_list("${name}")`)

        return {
          name,
          columns: cols.length ? cols[0].values.map((c: any) => ({
            name: c[1] as string,
            type: c[2] as string || 'TEXT',
            notnull: c[3] === 1,
            pk: c[5] === 1,
          })) : [],
          foreignKeys: fks.length ? fks[0].values.map((f: any) => ({
            table: f[2] as string,
            from: f[3] as string,
            to: f[4] as string
          })) : [],
          rowCount: count.length ? (count[0].values[0][0] as number) : 0,
        }
      })
      setActiveTables(infos)

      // Update metadata for all databases
      setDatabasesMetadata(dbInstances.current.map(inst => {
        let count = 0
        try {
          const r = inst.db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          count = r.length ? (r[0].values[0][0] as number) : 0
        } catch { }
        return { id: inst.id, name: inst.name, tableCount: count, isSample: inst.isSample }
      }))
    } catch {
      setActiveTables([])
    }
  }, [activeDatabaseId])

  useEffect(() => {
    let cancelled = false
    initSqlJs({
      locateFile: () => `sql-wasm.wasm`,
    }).then((sqlInstance: any) => {
      if (cancelled) return
      setSQL(sqlInstance)

      // Create initial sample database
      const db = new sqlInstance.Database()
      db.run(SAMPLE_DB_SQL)
      const id = crypto.randomUUID()
      dbInstances.current = [{ id, name: 'Base de Ejemplo', db, isSample: true }]
      setActiveDatabaseId(id)
      setIsReady(true)
    }).catch((err: unknown) => {
      console.error('Failed to init sql.js:', err)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (isReady) refreshTables()
  }, [isReady, refreshTables])

  const selectDatabase = (id: string) => {
    setActiveDatabaseId(id)
  }

  const createDatabase = (name: string) => {
    if (!SQL) return
    const db = new SQL.Database()
    const id = crypto.randomUUID()
    dbInstances.current.push({ id, name, db })
    setActiveDatabaseId(id)
    refreshTables()
  }

  const removeDatabase = (id: string) => {
    if (dbInstances.current.length <= 1) return // Keep at least one
    const index = dbInstances.current.findIndex(d => d.id === id)
    if (index !== -1) {
      dbInstances.current[index].db.close()
      dbInstances.current.splice(index, 1)
      if (activeDatabaseId === id) {
        setActiveDatabaseId(dbInstances.current[0].id)
      } else {
        refreshTables()
      }
    }
  }

  const importFullDatabase = async (file: File): Promise<{ success: boolean; error?: string }> => {
    if (!SQL) return { success: false, error: 'SQL engine not ready' }

    return new Promise((resolve) => {
      const isSqlFile = file.name.endsWith('.sql') || file.name.endsWith('.txt')
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          let db: Database
          if (isSqlFile) {
            db = new SQL.Database()
            db.run(e.target?.result as string)
          } else {
            // Assume binary SQLite
            const u8 = new Uint8Array(e.target?.result as ArrayBuffer)
            db = new SQL.Database(u8)
          }

          const id = crypto.randomUUID()
          dbInstances.current.push({ id, name: file.name, db })
          setActiveDatabaseId(id)
          refreshTables()
          resolve({ success: true })
        } catch (err: any) {
          resolve({ success: false, error: err.message })
        }
      }

      if (isSqlFile) {
        reader.readAsText(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    })
  }

  const executeQuery = useCallback((sql: string): QueryResult => {
    const db = getActiveDB()
    if (!db) return { columns: [], values: [], rowCount: 0, timeMs: 0, error: 'Base de datos no seleccionada' }
    const t0 = performance.now()
    try {
      const results = db.exec(sql)
      const timeMs = performance.now() - t0
      setQueryHistory(h => [{ sql, timestamp: Date.now(), success: true }, ...h].slice(0, 50))
      if (!results.length) {
        refreshTables()
        return { columns: [], values: [], rowCount: 0, timeMs }
      }
      const r = results[0]
      return { columns: r.columns, values: r.values, rowCount: r.values.length, timeMs }
    } catch (e: any) {
      const timeMs = performance.now() - t0
      setQueryHistory(h => [{ sql, timestamp: Date.now(), success: false }, ...h].slice(0, 50))
      return { columns: [], values: [], rowCount: 0, timeMs, error: e.message }
    }
  }, [refreshTables, activeDatabaseId])

  const executeManyStatements = useCallback((sql: string) => {
    const db = getActiveDB()
    if (!db) return { success: false, error: 'Base de datos no seleccionada', affectedStatements: 0 }
    try {
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
      let count = 0
      for (const stmt of statements) {
        db.run(stmt)
        count++
      }
      refreshTables()
      return { success: true, affectedStatements: count }
    } catch (e: any) {
      refreshTables()
      return { success: false, error: e.message, affectedStatements: 0 }
    }
  }, [refreshTables, activeDatabaseId])

  const resetDatabase = useCallback(() => {
    const db = getActiveDB()
    if (!db) return
    try {
      const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      if (res.length) {
        for (const row of res[0].values) {
          db.run(`DROP TABLE IF EXISTS "${row[0]}"`)
        }
      }
      db.run(SAMPLE_DB_SQL)
      refreshTables()
    } catch (e) {
      console.error('Reset failed:', e)
    }
  }, [refreshTables, activeDatabaseId])

  const importSQL = useCallback((sql: string) => {
    const db = getActiveDB()
    if (!db) return { success: false, error: 'Base de datos no seleccionada' }
    try {
      db.run(sql)
      refreshTables()
      return { success: true }
    } catch (e: any) {
      refreshTables()
      return { success: false, error: e.message }
    }
  }, [refreshTables, activeDatabaseId])

  const exportDatabase = useCallback(() => {
    const db = getActiveDB()
    if (!db) return null
    return db.export()
  }, [activeDatabaseId])

  return (
    <DatabaseContext.Provider value={{
      databases: databasesMetadata,
      activeDatabaseId,
      activeTables,
      isReady,
      executeQuery,
      executeManyStatements,
      refreshTables,
      resetDatabase,
      importSQL,
      importFullDatabase,
      exportDatabase,
      createDatabase,
      removeDatabase,
      selectDatabase,
      queryHistory,
    }}>
      {children}
    </DatabaseContext.Provider>
  )
}
