import { useState, useMemo } from 'react'
import { SQL_COMMANDS } from '../utils/sqlCommands'
import type { SqlEngine } from '../utils/sqlCommands'
import './SqlCommandsReference.css'

interface Props {
    onSelectExample?: (sql: string) => void;
}

const ENGINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    MySQL: { bg: '#fff8e1', text: '#e65100', border: '#ffb300' },
    MariaDB: { bg: '#fce4ec', text: '#880e4f', border: '#e91e63' },
    PostgreSQL: { bg: '#e8f5e9', text: '#1b5e20', border: '#43a047' },
    SQLServer: { bg: '#e3f2fd', text: '#0d47a1', border: '#1976d2' },
    SQLite: { bg: '#ede7f6', text: '#311b92', border: '#7e57c2' },
    Oracle: { bg: '#fbe9e7', text: '#bf360c', border: '#f4511e' },
    DB2: { bg: '#e0f7fa', text: '#006064', border: '#00838f' },
}

const ALL_ENGINES: SqlEngine[] = ['MySQL', 'MariaDB', 'PostgreSQL', 'SQLServer', 'SQLite', 'Oracle', 'DB2']

export default function SqlCommandsReference({ onSelectExample }: Props) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todos')
    const [selectedEngine, setSelectedEngine] = useState<SqlEngine | 'Todos'>('Todos')
    const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

    const categories = ['Todos', ...Array.from(new Set(SQL_COMMANDS.map(c => c.category)))]

    const filteredCommands = useMemo(() => {
        return SQL_COMMANDS.filter(cmd => {
            const matchesCategory =
                selectedCategory === 'Todos' || cmd.category === selectedCategory

            const searchLower = searchTerm.toLowerCase()
            const matchesSearch =
                cmd.command.toLowerCase().includes(searchLower) ||
                cmd.description.toLowerCase().includes(searchLower) ||
                cmd.category.toLowerCase().includes(searchLower)

            // Si hay motor seleccionado, solo mostramos comandos que tengan
            // variante para ese motor O que sean comandos estándar (sin variantes)
            const matchesEngine =
                selectedEngine === 'Todos' ||
                !cmd.motorVariants ||
                cmd.motorVariants.some(v => v.engines.includes(selectedEngine as SqlEngine))

            return matchesCategory && matchesSearch && matchesEngine
        })
    }, [searchTerm, selectedCategory, selectedEngine])

    const toggleCard = (idx: number) => {
        setExpandedCards(prev => {
            const next = new Set(prev)
            next.has(idx) ? next.delete(idx) : next.add(idx)
            return next
        })
    }

    // Devuelve la variante activa según el motor seleccionado
    const getActiveVariants = (cmd: typeof SQL_COMMANDS[0]) => {
        if (!cmd.motorVariants) return []
        if (selectedEngine === 'Todos') return cmd.motorVariants
        return cmd.motorVariants.filter(v => v.engines.includes(selectedEngine as SqlEngine))
    }

    return (
        <div className="sql-commands-container">
            <div className="commands-header">
                <h2>Referencia de Comandos SQL</h2>
                <p>Explora la sintaxis, descripción y ejemplos de los comandos SQL más utilizados.</p>

                <div className="commands-filters">
                    {/* Búsqueda */}
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar comando, descripción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filtro de categoría */}
                    <div className="category-filters">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* ── NUEVO: Filtro de motor ─────────────────────────── */}
                    <div className="engine-filters">
                        <span className="filter-label">Motor:</span>
                        <button
                            className={`engine-btn ${selectedEngine === 'Todos' ? 'active' : ''}`}
                            onClick={() => setSelectedEngine('Todos')}
                        >
                            Todos
                        </button>
                        {ALL_ENGINES.map(engine => {
                            const colors = ENGINE_COLORS[engine]
                            const isActive = selectedEngine === engine
                            return (
                                <button
                                    key={engine}
                                    className={`engine-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => setSelectedEngine(engine)}
                                    style={isActive ? {
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        borderColor: colors.border,
                                    } : undefined}
                                >
                                    {engine}
                                </button>
                            )
                        })}
                    </div>
                    {/* ──────────────────────────────────────────────────── */}
                </div>
            </div>

            {/* Contador */}
            <div className="commands-count">
                {filteredCommands.length} comando{filteredCommands.length !== 1 ? 's' : ''}
                {selectedEngine !== 'Todos' && (
                    <span className="engine-badge"
                        style={{
                            backgroundColor: ENGINE_COLORS[selectedEngine]?.bg,
                            color: ENGINE_COLORS[selectedEngine]?.text,
                            borderColor: ENGINE_COLORS[selectedEngine]?.border,
                        }}
                    >
                        {selectedEngine}
                    </span>
                )}
            </div>

            <div className="commands-grid">
                {filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd, idx) => {
                        const activeVariants = getActiveVariants(cmd)
                        const hasVariants = activeVariants.length > 0
                        const isExpanded = expandedCards.has(idx)

                        return (
                            <div key={idx} className={`command-card ${hasVariants ? 'has-variants' : ''}`}>
                                <div className="cmd-card-header">
                                    <h3 className="cmd-title">{cmd.command}</h3>
                                    <div className="cmd-badges">
                                        <span className="cmd-category">{cmd.category}</span>
                                        {hasVariants && (
                                            <span className="variants-badge">
                                                {activeVariants.length} variante{activeVariants.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="cmd-desc">{cmd.description}</p>

                                {/* Sintaxis y ejemplo estándar */}
                                <div className="cmd-section">
                                    <span className="cmd-section-title">Sintaxis estándar:</span>
                                    <code className="cmd-code">{cmd.usage}</code>
                                </div>

                                <div className="cmd-section example-section">
                                    <span className="cmd-section-title">Ejemplo:</span>
                                    <div className="example-code-box">
                                        <code className="cmd-code highlight">{cmd.example}</code>
                                        {onSelectExample && (
                                            <button
                                                className="try-btn"
                                                onClick={() => onSelectExample(cmd.example)}
                                                title="Probar en el editor"
                                            >
                                                ▶ Probar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── NUEVO: Variantes por motor ───────────── */}
                                {hasVariants && (
                                    <div className="cmd-variants-section">
                                        <button
                                            className="variants-toggle"
                                            onClick={() => toggleCard(idx)}
                                            aria-expanded={isExpanded}
                                        >
                                            <span>{isExpanded ? '▲' : '▼'}</span>
                                            {isExpanded ? 'Ocultar' : 'Ver'} variantes por motor
                                        </button>

                                        {isExpanded && (
                                            <div className="variants-list">
                                                {activeVariants.map((variant, vIdx) => (
                                                    <div key={vIdx} className="variant-block">
                                                        {/* Tags de motores */}
                                                        <div className="variant-engines">
                                                            {variant.engines.map(eng => (
                                                                <span
                                                                    key={eng}
                                                                    className="engine-tag"
                                                                    style={{
                                                                        backgroundColor: ENGINE_COLORS[eng]?.bg ?? '#f0f0f0',
                                                                        color: ENGINE_COLORS[eng]?.text ?? '#333',
                                                                        borderColor: ENGINE_COLORS[eng]?.border ?? '#ccc',
                                                                    }}
                                                                >
                                                                    {eng}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Sintaxis del motor */}
                                                        <div className="cmd-section">
                                                            <span className="cmd-section-title">Sintaxis:</span>
                                                            <code className="cmd-code">{variant.syntax}</code>
                                                        </div>

                                                        {/* Ejemplo del motor */}
                                                        <div className="cmd-section example-section">
                                                            <span className="cmd-section-title">Ejemplo:</span>
                                                            <div className="example-code-box">
                                                                <code className="cmd-code highlight">{variant.example}</code>
                                                                {onSelectExample && (
                                                                    <button
                                                                        className="try-btn"
                                                                        onClick={() => onSelectExample(variant.example)}
                                                                        title="Probar en el editor"
                                                                    >
                                                                        ▶ Probar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Nota aclaratoria */}
                                                        {variant.note && (
                                                            <p className="variant-note">
                                                                <span className="note-icon">💡</span>
                                                                {variant.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* ──────────────────────────────────────────── */}
                            </div>
                        )
                    })
                ) : (
                    <div className="commands-empty">
                        No se encontraron comandos que coincidan con tu búsqueda.
                    </div>
                )}
            </div>
        </div>
    )
}
