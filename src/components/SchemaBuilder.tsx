import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { useSqlDatabase } from '../contexts/DatabaseContext'
import ResultsTable from './ResultsTable'
import type { QueryResult } from '../contexts/DatabaseContext'
import './SchemaBuilder.css'

const sqlTheme = EditorView.theme({
  '&': { background: '#080814', color: '#cdd6f4', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { padding: '12px', caretColor: '#cba6f7', lineHeight: '1.7' },
  '.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#cba6f7', borderLeftWidth: '2px' },
  '.cm-activeLine': { backgroundColor: 'rgba(203,166,247,0.04)' },
  '.cm-gutters': { background: '#060610', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#45475a', minWidth: '36px' },
  '.tok-keyword': { color: '#cba6f7', fontWeight: '600' },
  '.tok-number': { color: '#fab387' },
  '.tok-string': { color: '#a6e3a1' },
  '.tok-comment': { color: '#585b70', fontStyle: 'italic' },
  '.tok-operator': { color: '#89dceb' },
  '.tok-name': { color: '#cdd6f4' },
}, { dark: true })

export default function SchemaBuilder() {
  const { 
    databases, 
    activeDatabaseId, 
    activeTables: tables, 
    executeQuery, 
    executeManyStatements, 
    refreshTables,
    selectDatabase,
    createDatabase,
    removeDatabase
  } = useSqlDatabase()
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<QueryResult | null>(null)
  const [sqlCode, setSqlCode] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [quickAdd, setQuickAdd] = useState({ tableName: '', columns: '' })
  const [newDbName, setNewDbName] = useState('')

  const activeDatabase = databases.find(db => db.id === activeDatabaseId)

  const viewTable = (name: string) => {
    setActiveTable(name)
    const result = executeQuery(`SELECT * FROM "${name}" LIMIT 100`)
    setTableData(result)
  }

  const runSQL = () => {
    if (!sqlCode.trim()) return
    const res = executeQuery(sqlCode)
    
    setFeedback({
      ok: !res.error,
      msg: res.error 
        ? `❌ ${res.error}` 
        : `✅ Ejecutado en ${res.timeMs.toFixed(2)}ms`
    })

    if (res.columns && res.columns.length > 0) {
      setTableData(res)
      setActiveTable(null)
    } else if (!res.error) {
      refreshTables()
      if (activeTable) {
        viewTable(activeTable)
      } else {
        setTableData(res) 
      }
    }
  }

  const handleQuickCreate = () => {
    if (!quickAdd.tableName.trim() || !quickAdd.columns.trim()) return
    const cols = quickAdd.columns.split(',').map(c => {
      const parts = c.trim().split(/\s+/)
      return `  ${parts[0]} ${parts[1] || 'TEXT'}${parts.slice(2).join(' ') ? ' ' + parts.slice(2).join(' ') : ''}`
    }).join(',\n')
    const createSQL = `CREATE TABLE ${quickAdd.tableName} (\n  id INTEGER PRIMARY KEY,\n${cols}\n);`
    setSqlCode(createSQL)
    setQuickAdd({ tableName: '', columns: '' })
  }

  const dropTable = (name: string) => {
    const res = executeManyStatements(`DROP TABLE IF EXISTS "${name}"`)
    setFeedback({ ok: res.success, msg: res.success ? `🗑️ Tabla "${name}" eliminada` : `❌ ${res.error}` })
    if (activeTable === name) { setActiveTable(null); setTableData(null) }
  }

  const handleCreateDb = () => {
    if (!newDbName.trim()) return
    createDatabase(newDbName)
    setNewDbName('')
  }

  return (
    <div className="schema-builder">
      <div className="sb-sidebar">
        {/* Database Selector */}
        <div className="sb-db-manager">
          <div className="sb-sidebar-title">
            <span>🔌 Bases de Datos</span>
            <span className="sb-count">{databases.length}</span>
          </div>
          <div className="sb-db-list">
            {databases.map(db => (
              <div key={db.id} className={`sb-db-item ${activeDatabaseId === db.id ? 'sb-db-active' : ''}`}>
                <button className="sb-db-btn" onClick={() => selectDatabase(db.id)}>
                  <span className="sb-db-icon">{db.isSample ? '🌟' : '📁'}</span>
                  <div className="sb-db-info">
                    <span className="sb-db-name">{db.name}</span>
                    <span className="sb-db-stats">{db.tableCount} tablas</span>
                  </div>
                </button>
                {databases.length > 1 && (
                  <button className="sb-drop-btn" onClick={(e) => { e.stopPropagation(); removeDatabase(db.id) }} title="Eliminar BD">×</button>
                )}
              </div>
            ))}
          </div>
          <div className="sb-db-create">
            <input 
              className="sb-input" 
              placeholder="Nueva Base de Datos..." 
              value={newDbName}
              onChange={e => setNewDbName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateDb()}
            />
            <button className="sb-db-add-btn" onClick={handleCreateDb}>Crear</button>
          </div>
        </div>

        <div className="sb-divider" />

        <div className="sb-sidebar-title">
          <span>🗄️ Tablas {activeDatabase && <small>({activeDatabase.name})</small>}</span>
          <span className="sb-count">{tables.length}</span>
        </div>
        <div className="sb-table-list">
          {tables.map((t: any) => (
            <div key={t.name} className={`sb-table-item ${activeTable === t.name ? 'sb-table-active' : ''}`}>
              <button className="sb-table-btn" onClick={() => viewTable(t.name)}>
                <span className="sb-table-icon">⊡</span>
                <div className="sb-table-info">
                  <span className="sb-table-name">{t.name}</span>
                  <span className="sb-table-stats">{t.columns.length} cols · {t.rowCount} filas</span>
                </div>
              </button>
              <button className="sb-drop-btn" onClick={() => dropTable(t.name)} title="Eliminar tabla">×</button>
            </div>
          ))}
        </div>


        {/* Quick create */}
        <div className="sb-quick">
          <div className="sb-quick-title">⚡ Crear Tabla Rápida</div>
          <input
            className="sb-input"
            placeholder="Nombre de tabla"
            value={quickAdd.tableName}
            onChange={e => setQuickAdd(q => ({ ...q, tableName: e.target.value }))}
          />
          <input
            className="sb-input"
            placeholder="col1 TEXT, col2 INT, ..."
            value={quickAdd.columns}
            onChange={e => setQuickAdd(q => ({ ...q, columns: e.target.value }))}
          />
          <button className="sb-quick-btn" onClick={handleQuickCreate}>Generar SQL</button>
        </div>
      </div>

      <div className="sb-main">
        {/* SQL Editor */}
        <div className="sb-editor-section">
          <div className="sb-editor-header">
            <span>✏️ Editor SQL</span>
            <div className="sb-editor-btns">
              <button className="sb-template-btn" onClick={() => setSqlCode("CREATE TABLE nueva_tabla (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT NOT NULL,\n  valor REAL DEFAULT 0\n);")}>
                📝 Plantilla CREATE
              </button>
              <button className="sb-template-btn" onClick={() => setSqlCode(activeTable ? `INSERT INTO ${activeTable} (col1, col2) VALUES ('valor1', 'valor2');` : "INSERT INTO tabla (col1, col2) VALUES ('v1', 'v2');")}>
                ➕ Plantilla INSERT
              </button>
              <button className="sb-template-btn" onClick={() => setSqlCode(activeTable ? ` SELECT * FROM ${activeTable};` : "SELECT * FROM tabla;")}>
                🔍 Plantlla SELECT
              </button>
              <button className="sb-template-btn" onClick={() => setSqlCode(activeTable ? ` UPDATE ${activeTable} SET col1 = 'valor1' WHERE col2 = 'valor2';` : "UPDATE tabla SET col1 = 'v1' WHERE col2 = 'v2';")}>
                ✏️ Plantlla UPDATE
              </button>
              <button className="sb-template-btn" onClick={() => setSqlCode(activeTable ? ` DELETE FROM ${activeTable} WHERE col1 = 'valor1';` : "DELETE FROM tabla WHERE col1 = 'v1';")}>
                🗑️ Plantlla DELETE
              </button>
              <button className="sb-run-btn" onClick={runSQL}>▶ Ejecutar</button>
            </div>
          </div>
          <CodeMirror
            value={sqlCode}
            height="150px"
            extensions={[sql()]}
            theme={sqlTheme}
            onChange={setSqlCode}
            basicSetup={{ lineNumbers: true, highlightActiveLine: true, autocompletion: true, bracketMatching: true }}
            placeholder="-- Escribe CREATE TABLE, INSERT, ALTER TABLE..."
          />
        </div>

        {feedback && (
          <div className={`sb-feedback ${feedback.ok ? 'sb-fb-ok' : 'sb-fb-err'}`}>
            {feedback.msg}
          </div>
        )}

        {/* Table View */}
        {(activeTable || tableData) && (
          <div className="sb-table-view">
            {activeTable && (
              <div className="sb-tv-header">
                <h3>📋 {activeTable}</h3>
                <div className="sb-tv-schema">
                  {tables.find(t => t.name === activeTable)?.columns.map(c => (
                    <span key={c.name} className={`sb-col-tag ${c.pk ? 'sb-col-pk' : ''}`}>
                      {c.pk && '🔑 '}{c.name} <span className="sb-col-type">{c.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <ResultsTable result={tableData} title={activeTable ? `Datos de ${activeTable}` : 'Resultados de consulta'} />
          </div>
        )}

        {!activeTable && !tableData && (
          <div className="sb-empty">
            <div className="sb-empty-icon">🏗️</div>
            <p>Selecciona una tabla del panel izquierdo o crea una nueva usando el editor SQL.</p>
          </div>
        )}
      </div>
    </div>

  )
}
