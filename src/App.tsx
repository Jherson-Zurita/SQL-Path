import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import type { Section } from './components/Sidebar'
import SqlEditor from './components/SqlEditor'
import VennDiagram from './components/VennDiagram'
import ExecutionPlan from './components/ExecutionPlan'
import QueryBreakdown from './components/QueryBreakdown'
import DataFlow from './components/DataFlow'
import SqlCommandsReference from './components/SqlCommandsReference'
import ResultsTable from './components/ResultsTable'
import Challenges from './components/Challenges'
import SchemaBuilder from './components/SchemaBuilder'
import DatabaseImport from './components/DatabaseImport'
import DatabaseExport from './components/DatabaseExport'
import DbDraw from './components/DbDraw'
import DatabaseSecurity from './components/DatabaseSecurity'
import { useSqlDatabase } from './contexts/DatabaseContext'
import type { QueryResult } from './contexts/DatabaseContext'
import { parseSQL, type ParsedQuery, EXAMPLE_QUERIES } from './utils/sqlParser'
import './App.css'

const INITIAL_SQL = EXAMPLE_QUERIES[0].sql

type Tab = 'venn' | 'results' | 'breakdown' | 'execution' | 'dataflow'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'venn', label: 'Diagrama Venn', icon: '◎' },
  { id: 'breakdown', label: 'Análisis SQL', icon: '⊞' },
  { id: 'execution', label: 'Plan Ejecución', icon: '▶' },
  { id: 'dataflow', label: 'Flujo de Datos', icon: '⇢' },
  { id: 'results', label: 'Resultados', icon: '▦' },
]

export default function App() {
  const [sql, setSql] = useState(INITIAL_SQL)
  const [query, setQuery] = useState<ParsedQuery>(() => parseSQL(INITIAL_SQL))
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('venn')
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('editor')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('sqlpath-theme') as 'dark' | 'light') || 'dark'
  })
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)

  const { executeQuery, isReady } = useSqlDatabase()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sqlpath-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const handleRun = () => {
    try {
      const q = parseSQL(sql)
      setQuery(q)
      setError(null)
      // Execute real SQL
      if (isReady) {
        const result = executeQuery(sql)
        setQueryResult(result)
        if (result.error) {
          setError(result.error)
        }
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleSelectExample = (newSql: string) => {
    setSql(newSql)
    setSection('editor')
    setTab('venn')
    setTimeout(() => {
      try {
        const q = parseSQL(newSql)
        setQuery(q)
        setError(null)
        if (isReady) {
          const result = executeQuery(newSql)
          setQueryResult(result)
          if (result.error) setError(result.error)
        }
      } catch (e: any) {
        setError(e.message)
      }
    }, 100)
  }

  const diagramTitle: Record<string, string> = {
    'two-set': 'JOIN de 2 tablas',
    'multi-set': `JOIN de ${(query?.joins?.length || 0) + 1} tablas`,
    'single': 'Tabla única',
    'set-op': `Operación: ${query?.setOperation?.replace('_', ' ') || ''}`,
  }

  return (
    <div className="app" data-theme={theme}>
      {/* Animated background grid */}
      <div className="bg-grid" aria-hidden />

      {/* Sidebar Navigation */}
      <Sidebar active={section} onChange={setSection} theme={theme} onToggleTheme={toggleTheme} />

      <div className="app-content">
        {/* SECTION: Editor + Visualizations (main mode) */}
        {section === 'editor' && (
          <>
            <header className="app-header">
              <div className="logo">
                <span className="logo-bracket">[</span>
                <span className="logo-sql">SQL</span>
                <span className="logo-sep">·</span>
                <span className="logo-path">Path</span>
                <span className="logo-bracket">]</span>
              </div>
              <div className="header-meta">
                {query && (
                  <>
                    <span className="meta-pill meta-diagram">{diagramTitle[query.diagram]}</span>
                    {query.fromTable && <span className="meta-pill meta-tables">{1 + query.joins.length} tabla{query.joins.length !== 0 ? 's' : ''}</span>}
                    {query.hasAggregate && <span className="meta-pill meta-agg">Agregación</span>}
                    {query.subqueries.length > 0 && <span className="meta-pill meta-sub">{query.subqueries.length} subquery</span>}
                    {query.where && <span className="meta-pill meta-where">WHERE</span>}
                  </>
                )}
              </div>
              <div className="header-right">
                {!isReady && <span className="loading-badge">⏳ Cargando BD...</span>}
                {isReady && <span className="ready-badge">⚡ BD Lista</span>}
              </div>
            </header>

            <div className="app-body">
              {/* LEFT: Editor */}
              <aside className="left-col">
                <SqlEditor value={sql} onChange={setSql} onRun={handleRun} />
                {error && <div className="err-box">⚠ {error}</div>}
              </aside>

              {/* RIGHT: Visualization */}
              <main className="right-col">
                {/* Tab bar */}
                <div className="tab-bar">
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      className={`tab-btn ${tab === t.id ? 'tab-active' : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      <span className="tab-icon">{t.icon}</span>
                      <span className="tab-label">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="tab-content">
                  {tab === 'results' && (
                    <div className="results-section">
                      {queryResult ? (
                        <ResultsTable result={queryResult} />
                      ) : (
                        <div className="empty-state">
                          <div className="empty-glyph">▶</div>
                          <p>Ejecuta una consulta para ver los resultados reales</p>
                          <p className="empty-hint">Presiona Ctrl+Enter o el botón "Ejecutar"</p>
                        </div>
                      )}
                    </div>
                  )}
                  {tab === 'venn' && query && (
                    <VennDiagram query={query} hoveredZone={hoveredZone} onHover={setHoveredZone} />
                  )}
                  {tab === 'breakdown' && query && (
                    <QueryBreakdown query={query} hoveredZone={hoveredZone} onHoverZone={setHoveredZone} />
                  )}
                  {tab === 'execution' && query && (
                    <ExecutionPlan query={query} />
                  )}
                  {tab === 'dataflow' && query && (
                    <DataFlow query={query} hoveredZone={hoveredZone} onHover={setHoveredZone} />
                  )}
                  {!query && tab !== 'results' && (
                    <div className="empty-state">
                      <div className="empty-glyph">∅</div>
                      <p>Escribe o selecciona una consulta SQL</p>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </>
        )}

        {/* SECTION: Challenges */}
        {section === 'challenges' && (
          <div className="section-full">
            <Challenges />
          </div>
        )}

        {/* SECTION: Schema Builder */}
        {section === 'schema' && (
          <div className="section-full">
            <SchemaBuilder />
          </div>
        )}

        {/* SECTION: Import */}
        {section === 'import' && (
          <div className="section-padded">
            <DatabaseImport />
          </div>
        )}

        {/* SECTION: DbDraw */}
        {section === 'dbdraw' && (
          <div className="section-full">
            <DbDraw />
          </div>
        )}

        {/* SECTION: Export */}
        {section === 'export' && (
          <div className="section-padded">
            <DatabaseExport />
          </div>
        )}

        {/* SECTION: Commands */}
        {section === 'commands' && (
          <div className="section-full">
            <SqlCommandsReference onSelectExample={handleSelectExample} />
          </div>
        )}

        {/* SECTION: Security */}
        {section === 'segurity' && (
          <div className="section-full" style={{ overflowY: 'auto', background: 'var(--app-bg)' }}>
            <DatabaseSecurity />
          </div>
        )}
      </div>
    </div>
  )
}
