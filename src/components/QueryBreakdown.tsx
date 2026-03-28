import type { ParsedQuery } from '../utils/sqlParser'
import './QueryBreakdown.css'

interface Props {
  query: ParsedQuery
  hoveredZone: string | null
  onHoverZone: (id: string | null) => void
}

const CONDITION_COLORS: Record<string, string> = {
  comparison: '#89b4fa',
  subquery_in: '#a6e3a1',
  subquery_not_in: '#f38ba8',
  null_check: '#fab387',
  between: '#cba6f7',
  like: '#89dceb',
  exists: '#f9e2af',
}

const CONDITION_LABELS: Record<string, string> = {
  comparison: 'Comparación',
  subquery_in: 'IN (subquery)',
  subquery_not_in: 'NOT IN (subquery)',
  null_check: 'IS NULL',
  between: 'BETWEEN',
  like: 'LIKE',
  exists: 'EXISTS',
}

export default function QueryBreakdown({ query, hoveredZone, onHoverZone }: Props) {
  const { fromTable, joins, where, groupBy, having, orderBy, selectColumns } = query

  const aggs = selectColumns.filter(c => c.aggregate)
  const plain = selectColumns.filter(c => !c.aggregate && c.column !== '*')
  const isStar = selectColumns.some(c => c.column === '*')

  return (
    <div className="breakdown">
      {/* SELECT */}
      <ClauseBlock color="#cba6f7" label="SELECT" badge={`${selectColumns.length} col${selectColumns.length !== 1 ? 's' : ''}`}>
        <div className="col-list">
          {isStar && <span className="col-chip star">* (todas)</span>}
          {plain.map((c, i) => (
            <span key={i} className="col-chip plain" style={{ borderColor: 'rgba(203,166,247,0.3)' }}>
              {c.table && <span className="col-table">{c.table}.</span>}
              {c.column}
              {c.alias && <span className="col-alias"> → {c.alias}</span>}
            </span>
          ))}
          {aggs.map((c, i) => (
            <span key={i} className="col-chip agg">
              <span className="agg-fn">{c.aggregate!.fn}</span>
              <span className="agg-col">({c.aggregate!.column})</span>
              {c.alias && <span className="col-alias"> AS {c.alias}</span>}
            </span>
          ))}
        </div>
      </ClauseBlock>

      {/* FROM */}
      {fromTable && (
        <ClauseBlock color={fromTable.color} label="FROM" badge="tabla base">
          <TableBadge table={fromTable} hovered={hoveredZone === fromTable.alias} onHover={onHoverZone} />
        </ClauseBlock>
      )}

      {/* JOINs */}
      {joins.map((j, i) => (
        <ClauseBlock key={i} color={j.table.color} label={`${j.type} JOIN`} badge={j.resultZone.replace(/_/g, ' ')}>
          <div className="join-detail">
            <TableBadge table={j.table} hovered={hoveredZone === j.table.alias} onHover={onHoverZone} />
            {j.condition && (
              <div className="join-cond">
                <span className="cond-kw">ON</span>
                <code className="cond-code">{j.condition}</code>
              </div>
            )}
            {j.isNullFilter && (
              <div className="null-badge">⚠ Filtro IS NULL → solo registros sin pareja</div>
            )}
          </div>
        </ClauseBlock>
      ))}

      {/* WHERE */}
      {where && (
        <ClauseBlock color="#f59e0b" label="WHERE" badge={`${where.conditions.length} condición(es)`}>
          <div className="cond-list">
            {where.conditions.map((cond, i) => (
              <div key={i} className="cond-item" style={{ borderColor: CONDITION_COLORS[cond.type] + '44', background: CONDITION_COLORS[cond.type] + '0a' }}>
                <span className="cond-type" style={{ color: CONDITION_COLORS[cond.type], background: CONDITION_COLORS[cond.type] + '18' }}>
                  {CONDITION_LABELS[cond.type]}
                </span>
                <code className="cond-text">{cond.text.length > 90 ? cond.text.slice(0, 90) + '…' : cond.text}</code>
                {cond.subquery && (
                  <div className="subq-inline">
                    <span className="subq-label">↳ Subconsulta sobre: </span>
                    <strong>{cond.subquery.fromTable?.name || '?'}</strong>
                    {cond.subquery.where && <span> con filtro WHERE</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ClauseBlock>
      )}

      {/* GROUP BY */}
      {groupBy.length > 0 && (
        <ClauseBlock color="#10b981" label="GROUP BY" badge={`${groupBy.length} campo(s)`}>
          <div className="col-list">
            {groupBy.map((g, i) => <span key={i} className="col-chip plain" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>{g}</span>)}
          </div>
        </ClauseBlock>
      )}

      {/* HAVING */}
      {having && (
        <ClauseBlock color="#ef4444" label="HAVING" badge="filtro de grupos">
          <code className="having-code">{having}</code>
        </ClauseBlock>
      )}

      {/* ORDER BY */}
      {orderBy.length > 0 && (
        <ClauseBlock color="#06b6d4" label="ORDER BY" badge={`${orderBy.length} campo(s)`}>
          <div className="col-list">
            {orderBy.map((o, i) => (
              <span key={i} className="col-chip plain" style={{ borderColor: 'rgba(6,182,212,0.3)' }}>
                {o.column}
                <span className={`dir-badge ${o.direction === 'DESC' ? 'dir-desc' : 'dir-asc'}`}>{o.direction}</span>
              </span>
            ))}
          </div>
        </ClauseBlock>
      )}

      {/* Aggregations summary */}
      {aggs.length > 0 && (
        <div className="agg-summary">
          <div className="agg-sum-title">📊 Funciones de Agregación</div>
          <div className="agg-grid">
            {aggs.map((c, i) => (
              <div key={i} className="agg-card">
                <div className="agg-card-fn">{c.aggregate!.fn}</div>
                <div className="agg-card-col">{c.aggregate!.column}</div>
                {c.alias && <div className="agg-card-alias">→ {c.alias}</div>}
                <div className="agg-card-desc">{AGG_DESCRIPTIONS[c.aggregate!.fn] || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const AGG_DESCRIPTIONS: Record<string, string> = {
  COUNT: 'Cuenta filas',
  SUM: 'Suma valores',
  AVG: 'Promedio',
  MAX: 'Valor máximo',
  MIN: 'Valor mínimo',
  COALESCE: 'Primer no-NULL',
}

function ClauseBlock({ color, label, badge, children }: { color: string; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="clause-block" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="clause-header">
        <span className="clause-kw" style={{ color }}>{label}</span>
        {badge && <span className="clause-badge" style={{ color: color + 'cc', background: color + '15' }}>{badge}</span>}
      </div>
      <div className="clause-body">{children}</div>
    </div>
  )
}

function TableBadge({ table, hovered, onHover }: { table: { name: string; alias: string; color: string }; hovered: boolean; onHover: (id: string | null) => void }) {
  return (
    <div
      className={`table-badge ${hovered ? 'table-badge-hov' : ''}`}
      style={{ borderColor: table.color + (hovered ? 'aa' : '44'), background: table.color + '12', cursor: 'pointer' }}
      onMouseEnter={() => onHover(table.alias)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="tb-icon" style={{ color: table.color }}>⊡</span>
      <span className="tb-name" style={{ color: table.color }}>{table.name}</span>
      {table.alias !== table.name && <span className="tb-alias">alias: {table.alias}</span>}
    </div>
  )
}
