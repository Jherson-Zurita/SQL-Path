import { useState, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { CHALLENGES } from '../utils/challenges'
import { useSqlDatabase } from '../contexts/DatabaseContext'
import ResultsTable from './ResultsTable'
import type { QueryResult } from '../contexts/DatabaseContext'
import './Challenges.css'

const sqlDarkTheme = EditorView.theme({
  '&': { background: '#080814', color: '#cdd6f4', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" },
  '.cm-content': { padding: '12px', caretColor: '#cba6f7', lineHeight: '1.7' },
  '.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#cba6f7', borderLeftWidth: '2px' },
  '.cm-activeLine': { backgroundColor: 'rgba(203,166,247,0.04)' },
  '.cm-gutters': { background: '#060610', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#45475a', minWidth: '36px' },
  '.cm-gutterElement': { padding: '0 6px 0 4px', fontSize: '11px' },
  '.tok-keyword': { color: '#cba6f7', fontWeight: '600' },
  '.tok-number': { color: '#fab387' },
  '.tok-string': { color: '#a6e3a1' },
  '.tok-comment': { color: '#585b70', fontStyle: 'italic' },
  '.tok-operator': { color: '#89dceb' },
  '.tok-name': { color: '#cdd6f4' },
}, { dark: true })

export default function Challenges() {
  const { executeQuery, activeTables } = useSqlDatabase()
  const [selectedId, setSelectedId] = useState(1)
  const [userCode, setUserCode] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, { result: QueryResult; passed: boolean } | null>>({})
  const [showHint, setShowHint] = useState(false)
  const [showTables, setShowTables] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('sql-path-completed-challenges')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const challenge = CHALLENGES.find(c => c.id === selectedId)!
  const code = userCode[selectedId] ?? challenge.starterCode

  // Identificar tablas relacionadas comparando los nombres con la consulta o descripción del desafío
  const relevantTables = activeTables.filter(t =>
    new RegExp(`\\b${t.name}\\b`, 'i').test(challenge.validationQuery) ||
    new RegExp(`\\b${t.name}\\b`, 'i').test(challenge.description)
  )

  const handleRun = useCallback(() => {
    const userResult = executeQuery(code)
    const expectedResult = executeQuery(challenge.validationQuery)

    let passed = false
    if (!userResult.error && !expectedResult.error) {
      passed = challenge.expectedCheck(userResult.values, expectedResult.values)
    }

    setResults(r => ({ ...r, [selectedId]: { result: userResult, passed } }))

    if (passed) {
      setCompleted(c => {
        const next = new Set([...c, selectedId])
        try {
          localStorage.setItem('sql-path-completed-challenges', JSON.stringify([...next]))
        } catch { }
        return next
      })
    }
  }, [code, challenge, selectedId, executeQuery])

  const currentResult = results[selectedId]
  const difficultyColors: Record<string, string> = { 'fácil': '#a6e3a1', 'medio': '#f9e2af', 'difícil': '#f38ba8' }

  return (
    <div className="challenges-layout">
      {/* Left side - challenge list */}
      <div className="ch-list">
        <div className="ch-list-title">
          <span>🎯 Desafíos SQL</span>
          <span className="ch-progress">{completed.size}/{CHALLENGES.length}</span>
        </div>
        <div className="ch-progress-bar">
          <div className="ch-progress-fill" style={{ width: `${(completed.size / CHALLENGES.length) * 100}%` }} />
        </div>
        <div className="ch-items">
          {CHALLENGES.map(c => (
            <button
              key={c.id}
              className={`ch-item ${selectedId === c.id ? 'ch-selected' : ''} ${completed.has(c.id) ? 'ch-done' : ''}`}
              onClick={() => { setSelectedId(c.id); setShowHint(false) }}
            >
              <span className="ch-item-status">{completed.has(c.id) ? '✅' : `${c.id}`}</span>
              <div className="ch-item-info">
                <span className="ch-item-title">{c.title}</span>
                <span className="ch-item-diff" style={{ color: difficultyColors[c.difficulty] }}>{c.difficulty}</span>
              </div>
              <span className="ch-item-cat">{c.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right side - challenge workspace */}
      <div className="ch-workspace">
        <div className="ch-desc-box">
          <div className="ch-desc-header">
            <div className="ch-desc-title-row">
              <span className="ch-num">#{challenge.id}</span>
              <h3>{challenge.title}</h3>
              <span className="ch-diff-badge" style={{ background: difficultyColors[challenge.difficulty] + '20', color: difficultyColors[challenge.difficulty], borderColor: difficultyColors[challenge.difficulty] + '50' }}>
                {challenge.difficulty}
              </span>
              <span className="ch-type-badge">
                {challenge.type === 'write' ? '✍️ Escribir' : challenge.type === 'complete' ? '🧩 Completar' : '🔧 Arreglar'}
              </span>
            </div>
            <p className="ch-desc-text">{challenge.description}</p>
            <div className="ch-hint-area">
              <button className="ch-hint-btn" onClick={() => setShowTables(h => !h)}>
                {showTables ? 'Ocultar Tablas' : 'Mostrar Tablas'}
              </button>
              {showTables && relevantTables.length > 0 && (
                <div className="ch-schema-area">
                  <span className="ch-schema-title">📋 Tablas de Referencia</span>
                  <div className="ch-schema-tables">
                    {relevantTables.map(t => (
                      <div key={t.name} className="ch-schema-table">
                        <strong>{t.name}</strong>
                        <div className="ch-schema-columns">
                          {t.columns.map(c => (
                            <span key={c.name} className="ch-schema-col" title={`${c.type}${c.pk ? ' (PK)' : ''}`}>
                              <span className="ch-col-icon">{c.pk ? '🔑' : '▪'}</span>
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ch-hint-area">
            <button className="ch-hint-btn" onClick={() => setShowHint(h => !h)}>
              {showHint ? '🙈 Ocultar pista' : '💡 Mostrar pista'}
            </button>
            {showHint && <div className="ch-hint-text">{challenge.hint}</div>}
          </div>
        </div>

        <div className="ch-editor-box">
          <div className="ch-editor-header">
            <span>Tu Solución</span>
            <div className="ch-editor-actions">
              <button className="ch-reset-btn" onClick={() => setUserCode(u => ({ ...u, [selectedId]: challenge.starterCode }))}>↻ Reset</button>
              <button className="ch-run-btn" onClick={handleRun}>▶ Ejecutar & Verificar</button>
            </div>
          </div>
          <CodeMirror
            value={code}
            height="140px"
            extensions={[sql()]}
            theme={sqlDarkTheme}
            onChange={v => setUserCode(u => ({ ...u, [selectedId]: v }))}
            basicSetup={{ lineNumbers: true, highlightActiveLine: true, autocompletion: true, bracketMatching: true }}
            placeholder="-- Escribe tu consulta SQL..."
          />
        </div>

        {/* Result feedback */}
        {currentResult && (
          <div className="ch-feedback">
            {currentResult.passed ? (
              <div className="ch-pass">
                <span className="ch-pass-icon">🎉</span>
                <div>
                  <strong>¡Correcto!</strong>
                  <span> Tu consulta produce el resultado esperado.</span>
                </div>
              </div>
            ) : (
              <div className="ch-fail">
                <span className="ch-fail-icon">❌</span>
                <div>
                  <strong>Incorrecto</strong>
                  <span> — {currentResult.result.error ? `Error: ${currentResult.result.error}` : 'El resultado no coincide con lo esperado. Inténtalo de nuevo.'}</span>
                </div>
              </div>
            )}
            <ResultsTable result={currentResult.result} title="Tu Resultado" />
          </div>
        )}
      </div>
    </div>
  )
}
