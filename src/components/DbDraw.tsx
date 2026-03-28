import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSqlDatabase } from '../contexts/DatabaseContext'
import './DbDraw.css'

interface Point { x: number; y: number }
interface Dims { w: number; h: number }

const STORAGE_KEY = (dbId: string) => `db-draw-positions-${dbId}`

// ─── helpers ────────────────────────────────────────────────────────────────

/** Punto donde la línea (x1,y1)→(x2,y2) intersecta el rectángulo con origen (rx,ry) y dimensiones (rw,rh) */
function rectEdgePoint(
  x1: number, y1: number,
  x2: number, y2: number,
  rx: number, ry: number,
  rw: number, rh: number
): Point {
  const cx = rx + rw / 2
  const cy = ry + rh / 2
  const dx = x2 - x1
  const dy = y2 - y1

  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const scaleX = dx !== 0 ? (rw / 2) / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? (rh / 2) / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)

  return { x: cx + dx * scale, y: cy + dy * scale }
}

// ─── component ──────────────────────────────────────────────────────────────

export default function DbDraw() {
  const { activeTables, databases, activeDatabaseId, selectDatabase } = useSqlDatabase()

  // Posiciones de las tablas
  const [positions, setPositions] = useState<Record<string, Point>>({})

  // Drag de tablas
  const [dragging, setDragging] = useState<string | null>(null)
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 })

  // Pan del canvas
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const panOrigin = useRef<Point>({ x: 0, y: 0 })

  // ─── helper: y-offset de una columna dentro de su tabla ───────────────────
  const HEADER_H = 36   // altura del header de la tabla (ajusta si cambia en CSS )
  const ROW_H = 28   // altura de cada fila de columna  

  function colY(table: typeof activeTables[0], colName: string): number {
    const idx = table.columns.findIndex(c => c.name === colName)
    return HEADER_H + ROW_H * (idx === -1 ? 0 : idx) + ROW_H / 2
  }

  // Zoom
  const [zoom, setZoom] = useState(1)

  const containerRef = useRef<HTMLDivElement>(null)
  const dimsRef = useRef<Record<string, Dims>>({})

  // ── Cargar posiciones desde localStorage al cambiar de DB ──────────────────
  useEffect(() => {
    if (!activeDatabaseId) return

    const saved = localStorage.getItem(STORAGE_KEY(activeDatabaseId))
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, Point>
        // Solo restaurar tablas que siguen existiendo
        const valid: Record<string, Point> = {}
        activeTables.forEach(t => {
          if (parsed[t.name]) valid[t.name] = parsed[t.name]
        })
        // Tablas nuevas que no tienen posición guardada → layout automático
        let x = 40; let y = 40
        activeTables.forEach(t => {
          if (!valid[t.name]) {
            valid[t.name] = { x, y }
            x += 280
            if (x > 800) { x = 40; y += 220 }
          }
        })
        setPositions(valid)
        return
      } catch { /* fall through */ }
    }

    // Sin datos guardados → layout automático
    const auto: Record<string, Point> = {}
    let x = 40; let y = 40
    activeTables.forEach(t => {
      auto[t.name] = { x, y }
      x += 280
      if (x > 800) { x = 40; y += 220 }
    })
    setPositions(auto)
  }, [activeDatabaseId, activeTables.length])

  // ── Guardar posiciones en localStorage cuando cambien ─────────────────────
  useEffect(() => {
    if (!activeDatabaseId || Object.keys(positions).length === 0) return
    localStorage.setItem(STORAGE_KEY(activeDatabaseId), JSON.stringify(positions))
  }, [positions, activeDatabaseId])

  // ── Drag de tablas ─────────────────────────────────────────────────────────
  const handleTableMouseDown = useCallback((e: React.MouseEvent, tableName: string) => {
    e.stopPropagation()
    const pos = positions[tableName] || { x: 0, y: 0 }
    dragOffsetRef.current = {
      x: e.clientX / zoom - pos.x,
      y: e.clientY / zoom - pos.y,
    }
    setDragging(tableName)
  }, [positions, zoom])

  // ── Pan del canvas ─────────────────────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragging) return
    isPanning.current = true
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
  }, [dragging, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      setPositions(prev => ({
        ...prev,
        [dragging]: {
          x: e.clientX / zoom - dragOffsetRef.current.x,
          y: e.clientY / zoom - dragOffsetRef.current.y,
        }
      }))
      return
    }
    if (isPanning.current) {
      setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      })
    }
  }, [dragging, zoom])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    isPanning.current = false
  }, [])

  // ── Zoom con rueda ─────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.min(2.5, Math.max(0.3, z - e.deltaY * 0.001)))
  }, [])


  // ── Medir nodos ───────────────────────────────────────────────────────────
  const handleRef = useCallback((node: HTMLDivElement | null, name: string) => {
    if (node) dimsRef.current[name] = { w: node.offsetWidth, h: node.offsetHeight }
  }, [])

  // ── Flechas precisas ──────────────────────────────────────────────────────
  const edges = useMemo(() => {
    const lines: React.ReactNode[] = []

    activeTables.forEach(table => {
      if (!table.foreignKeys) return

      table.foreignKeys.forEach((fk, idx) => {
        const fromPos = positions[table.name]
        const toPos = positions[fk.table]
        if (!fromPos || !toPos) return

        const fromDim = dimsRef.current[table.name] || { w: 250, h: 100 }
        const toDim = dimsRef.current[fk.table] || { w: 250, h: 100 }

        const toTable = activeTables.find(t => t.name === fk.table)

        // ── Y exacto de la columna en cada tabla ──────────────────────────
        const fromColY = fromPos.y + colY(table, fk.from)
        const toColY = toPos.y + colY(toTable ?? { columns: [] } as any, fk.to ?? fk.from)

        const fromCx = fromPos.x + fromDim.w / 2
        const toCx = toPos.x + toDim.w / 2

        // ── Elegir el lado más cercano (izquierda o derecha) ──────────────
        // Si la tabla destino está a la derecha, salimos por la derecha
        const exitRight = toCx >= fromCx
        const enterRight = fromCx >= toCx

        const start: Point = {
          x: exitRight ? fromPos.x + fromDim.w : fromPos.x,
          y: fromColY,
        }
        const end: Point = {
          x: enterRight ? toPos.x + toDim.w : toPos.x,
          y: toColY,
        }

        // ── Curva bezier: los handles salen horizontalmente ───────────────
        const handleLen = Math.max(40, Math.abs(end.x - start.x) * 0.4)
        const c1x = start.x + (exitRight ? handleLen : -handleLen)
        const c2x = end.x + (enterRight ? handleLen : -handleLen)

        lines.push(
          <path
            key={`${table.name}-${fk.table}-${idx}`}
            d={`M ${start.x} ${start.y} C ${c1x} ${start.y} ${c2x} ${end.y} ${end.x} ${end.y}`}
            stroke="#9f7aea"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow)"
            opacity="0.75"
          />
        )
      })
    })

    return lines
  }, [activeTables, positions])

  const activeDbName = databases.find(d => d.id === activeDatabaseId)?.name || 'Base de datos'

  // ── Botón reset posiciones ────────────────────────────────────────────────
  const resetLayout = () => {
    if (!activeDatabaseId) return
    localStorage.removeItem(STORAGE_KEY(activeDatabaseId))
    const auto: Record<string, Point> = {}
    let x = 40; let y = 40
    activeTables.forEach(t => {
      auto[t.name] = { x, y }
      x += 280
      if (x > 800) { x = 40; y += 220 }
    })
    setPositions(auto)
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="db-draw-container">
      <div className="db-draw-header">
        <div className="db-draw-title">
          <h2>🗂️ Diagrama Entidad-Relación</h2>
          <p>Esquema interactivo de <strong>{activeDbName}</strong>. Arrastra las tablas para organizar tu diagrama.</p>
        </div>
        <div className="db-draw-selectors">
          <button onClick={resetLayout} className="db-draw-reset" title="Reiniciar posiciones">
            ↺ Reset
          </button>
          <span className="db-draw-zoom-label">{Math.round(zoom * 100)}%</span>
          <span></span>
          <select
            value={activeDatabaseId || ''}
            onChange={e => selectDatabase(e.target.value)}
            className="db-draw-select"
          >
            {databases.map(db => (
              <option key={db.id} value={db.id}>{db.name} ({db.tableCount} tablas)</option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="db-draw-canvas"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        style={{ cursor: isPanning.current ? 'grabbing' : dragging ? 'grabbing' : 'grab' }}
      >
        {/* Mundo transformado: zoom + pan */}
        <div
          className="db-draw-world"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <svg className="db-draw-edges" style={{ overflow: 'visible', position: 'absolute', inset: 0, width: '4000px', height: '4000px', pointerEvents: 'none' }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9f7aea" />
              </marker>
            </defs>
            {edges}
          </svg>

          {activeTables.length === 0 && (
            <div className="db-draw-empty">No hay tablas en esta base de datos para dibujar.</div>
          )}

          {activeTables.map(table => {
            const pos = positions[table.name] || { x: 0, y: 0 }
            return (
              <div
                key={table.name}
                ref={n => handleRef(n, table.name)}
                className={`db-table-node ${dragging === table.name ? 'dragging' : ''}`}
                style={{ position: 'absolute', left: pos.x, top: pos.y }}
                onMouseDown={e => handleTableMouseDown(e, table.name)}
              >
                <div className="db-table-header">{table.name}</div>
                <div className="db-table-cols">
                  {table.columns.map(c => {
                    const isFk = table.foreignKeys?.some(fk => fk.from === c.name)
                    return (
                      <div key={c.name} className={`db-table-col ${c.pk ? 'pk' : ''} ${isFk ? 'fk' : ''}`}>
                        <div className="col-name">
                          {c.pk && <span className="key-icon" title="Primary Key">🔑</span>}
                          {isFk && <span className="key-icon fk-icon" title="Foreign Key">🔗</span>}
                          {c.name}
                        </div>
                        <div className="col-type">{c.type}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
