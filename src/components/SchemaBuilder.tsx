import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { useSqlDatabase } from '../contexts/DatabaseContext'
import ResultsTable from './ResultsTable'
import type { QueryResult } from '../contexts/DatabaseContext'
import './SchemaBuilder.css'

const sqlTheme = EditorView.theme({
  '&': { background: '#080814', color: '#cdd6f4', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", height: '100%' },
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
  '.cm-scroller': { overflow: 'auto' }
}, { dark: true })

interface QueryTab {
  id: string;
  name: string;
  content: string;
}

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
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [newDbName, setNewDbName] = useState('')

  const [tabs, setTabs] = useState<QueryTab[]>([
    { id: '1', name: 'query_1.sql', content: '-- Escribe tus consultas SQL aquí...\nSELECT sqlite_version();' }
  ])
  const [activeTabId, setActiveTabId] = useState('1')
  const [tabCounter, setTabCounter] = useState(2)

  const activeDatabase = databases.find(db => db.id === activeDatabaseId)
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const updateTabContent = (val: string) => {
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, content: val } : t))
  }

  const addTab = () => {
    const newTab = { id: String(tabCounter), name: `query_${tabCounter}.sql`, content: '' }
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
    setTabCounter(prev => prev + 1)
  }

  const removeTab = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation()
    if (tabs.length === 1) return // Keep at least one tab
    const newTabs = tabs.filter(t => t.id !== idToRemove)
    if (activeTabId === idToRemove) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
    setTabs(newTabs)
  }

  const viewTable = (name: string) => {
    setActiveTable(name)
    const result = executeQuery(`SELECT * FROM "${name}" LIMIT 100`)
    setTableData(result)
  }

  const runSQL = () => {
    const sqlCode = activeTab.content;
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

  const dropTable = (name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la tabla "${name}"?`)) return;
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
        <div className="sb-table-list sb-table-list-extended">
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
          {tables.length === 0 && (
            <div className="sb-table-empty">No hay tablas. Crea una en el editor.</div>
          )}
        </div>
      </div>

      <div className="sb-main">
        {/* Playground Editor */}
        <div className="sb-editor-section">
          <div className="sb-tabs-header">
            <div className="sb-tabs-list">
              {tabs.map(tab => (
                <div 
                  key={tab.id} 
                  className={`sb-tab ${tab.id === activeTabId ? 'sb-tab-active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <span className="sb-tab-icon">📄</span>
                  <span className="sb-tab-name">{tab.name}</span>
                  {tabs.length > 1 && (
                    <button className="sb-tab-close" onClick={(e) => removeTab(e, tab.id)}>×</button>
                  )}
                </div>
              ))}
              <button className="sb-tab-add" onClick={addTab} title="Nuevo archivo de consulta">+</button>
            </div>
            
            <div className="sb-editor-actions">
               <button className="sb-run-btn" onClick={runSQL}>
                 <span className="sb-play-icon">▶</span> Ejecutar
               </button>
            </div>
          </div>
          
          <div className="sb-codemirror-wrapper">
            <CodeMirror
              value={activeTab.content}
              height="200px"
              extensions={[sql()]}
              theme={sqlTheme}
              onChange={updateTabContent}
              basicSetup={{ lineNumbers: true, highlightActiveLine: true, autocompletion: true, bracketMatching: true }}
              placeholder="-- Escribe tus consultas SQL aquí..."
            />
          </div>
        </div>

        {feedback && (
          <div className={`sb-feedback ${feedback.ok ? 'sb-fb-ok' : 'sb-fb-err'}`}>
            {feedback.msg}
          </div>
        )}

        {/* Results View */}
        <div className="sb-results-area">
          {(activeTable || tableData) ? (
            <div className="sb-table-view">
              {activeTable && (
                <div className="sb-tv-header">
                  <h3>📋 {activeTable}</h3>
                  <div className="sb-tv-schema">
                    {tables.find((t: any) => t.name === activeTable)?.columns.map((c: any) => (
                      <span key={c.name} className={`sb-col-tag ${c.pk ? 'sb-col-pk' : ''}`}>
                        {c.pk && '🔑 '}{c.name} <span className="sb-col-type">{c.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <ResultsTable result={tableData} title={activeTable ? `Datos de ${activeTable}` : 'Resultados de consulta'} />
            </div>
          ) : (
            <div className="sb-empty">
              <div className="sb-empty-icon">🛝</div>
              <p>El Playground de Base de Datos está listo.<br/>Escribe una consulta arriba y presiona Ejecutar, o selecciona una tabla para explorarla.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
