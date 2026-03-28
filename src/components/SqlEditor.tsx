import { useCallback, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { EXAMPLE_QUERIES } from '../utils/sqlParser'
import './SqlEditor.css'

const sqlDarkTheme = EditorView.theme({
  '&': { background: '#080814', color: '#cdd6f4', fontSize: '13.5px', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" },
  '.cm-content': { padding: '16px', caretColor: '#cba6f7', lineHeight: '1.7' },
  '.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0 2px' },
  '.cm-cursor': { borderLeftColor: '#cba6f7', borderLeftWidth: '2px' },
  '.cm-activeLine': { backgroundColor: 'rgba(203,166,247,0.04)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(137,180,250,0.15)' },
  '.cm-gutters': { background: '#060610', borderRight: '1px solid rgba(255,255,255,0.05)', color: '#45475a', minWidth: '40px' },
  '.cm-gutterElement': { padding: '0 8px 0 4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
  '.cm-tooltip': { background: '#1e1e2e', border: '1px solid rgba(203,166,247,0.3)', borderRadius: '8px' },
  '.cm-tooltip.cm-tooltip-autocomplete': { '& > ul > li[aria-selected]': { background: 'rgba(203,166,247,0.15)' } },
  // SQL keyword colors
  '.tok-keyword': { color: '#cba6f7', fontWeight: '600' },
  '.tok-number': { color: '#fab387' },
  '.tok-string': { color: '#a6e3a1' },
  '.tok-comment': { color: '#585b70', fontStyle: 'italic' },
  '.tok-operator': { color: '#89dceb' },
  '.tok-punctuation': { color: '#89b4fa' },
  '.tok-name': { color: '#cdd6f4' },
  '.tok-typeName': { color: '#f38ba8' },
}, { dark: true })

const categories = ['Todos', 'JOINs', 'Set Ops', 'Avanzado', 'Agregación', 'Subqueries']

interface Props {
  value: string
  onChange: (v: string) => void
  onRun: () => void
}

export default function SqlEditor({ value, onChange, onRun }: Props) {
  const [category, setCategory] = useState('Todos')

  const filteredExamples = EXAMPLE_QUERIES.filter(
    e => category === 'Todos' || e.category === category
  )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onRun()
    }
  }, [onRun])

  return (
    <div className="editor-panel">
      <div className="editor-topbar">
        <div className="editor-title">
          <span className="editor-dot red" />
          <span className="editor-dot yellow" />
          <span className="editor-dot green" />
          <span className="editor-filename">query.sql</span>
        </div>
        <button className="run-btn" onClick={onRun} title="Ctrl+Enter">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
            <path d="M1 1L11 7L1 13V1Z" fill="currentColor" />
          </svg>
          Ejecutar
        </button>
      </div>

      <div className="editor-wrap">
        <CodeMirror
          value={value}
          height="220px"
          extensions={[sql()]}
          theme={sqlDarkTheme}
          onChange={onChange}
          onKeyDown={handleKeyDown as any}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            foldGutter: false,
          }}
          placeholder="-- Escribe tu consulta SQL aquí..."
        />
      </div>

      <div className="examples-panel">
        <div className="examples-header">
          <span className="examples-title">Ejemplos</span>
          <div className="cat-tabs">
            {categories.map(c => (
              <button
                key={c}
                className={`cat-tab ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
          </div>
        </div>
        <div className="examples-scroll">
          {filteredExamples.map((ex, i) => (
            <button
              key={i}
              className={`example-item ${value.trim() === ex.sql.trim() ? 'active' : ''}`}
              onClick={() => { onChange(ex.sql); setTimeout(onRun, 50) }}
            >
              <span className="ex-cat">{ex.category}</span>
              <span className="ex-label">{ex.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
