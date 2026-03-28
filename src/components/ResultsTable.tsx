import { useState, useEffect } from 'react'
import type { QueryResult } from '../contexts/DatabaseContext'
import './ResultsTable.css'

interface Props {
  result: QueryResult | null
  title?: string
}

export default function ResultsTable({ result, title }: Props) {
  const [visibleRows, setVisibleRows] = useState(0)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setVisibleRows(0)
    setSortCol(null)
    if (!result || !result.values.length) return
    const total = Math.min(result.values.length, 200)
    let i = 0
    const step = () => {
      i = Math.min(i + 8, total)
      setVisibleRows(i)
      if (i < total) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [result])

  if (!result) return null

  if (result.error) {
    return (
      <div className="rt-error">
        <span className="rt-error-icon">⚠</span>
        <span>{result.error}</span>
      </div>
    )
  }

  if (!result.columns.length) {
    if (result.rowCount === 0) {
      return <div className="rt-error">
        <span className="rt-error-icon">⚠</span>
        <span>No se encontraron filas</span>
      </div>
    }
    return (
      <div className="rt-success">
        <span className="rt-success-icon">✓</span>
        <span>Consulta ejecutada correctamente ({result.timeMs.toFixed(1)}ms)</span>
      </div>
    )
  }

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colIdx)
      setSortDir('asc')
    }
  }

  let displayValues = [...result.values]
  if (sortCol !== null) {
    displayValues.sort((a, b) => {
      const va = a[sortCol!]
      const vb = b[sortCol!]
      if (va === null) return 1
      if (vb === null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }

  return (
    <div className="rt-container">
      <div className="rt-header">
        <span className="rt-title">{title || 'Resultados'}</span>
        <div className="rt-meta">
          <span className="rt-badge rt-rows">{result.rowCount} fila{result.rowCount !== 1 ? 's' : ''}</span>
          <span className="rt-badge rt-cols">{result.columns.length} col{result.columns.length !== 1 ? 's' : ''}</span>
          <span className="rt-badge rt-time">{result.timeMs.toFixed(1)}ms</span>
        </div>
      </div>
      <div className="rt-scroll">
        <table className="rt-table">
          <thead>
            <tr>
              <th className="rt-row-num">#</th>
              {result.columns.map((col, i) => (
                <th key={i} onClick={() => handleSort(i)} className={sortCol === i ? 'rt-sorted' : ''}>
                  <span>{col}</span>
                  {sortCol === i && <span className="rt-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayValues.slice(0, visibleRows).map((row, ri) => (
              <tr key={ri} className="rt-row" style={{ animationDelay: `${Math.min(ri * 15, 300)}ms` }}>
                <td className="rt-row-num">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className={cell === null ? 'rt-null' : typeof cell === 'number' ? 'rt-num' : ''}>
                    {cell === null ? <span className="rt-null-tag">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
