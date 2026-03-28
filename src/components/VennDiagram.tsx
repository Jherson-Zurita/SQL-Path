import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ParsedQuery, VennZone } from '../utils/sqlParser'
import './VennDiagram.css'

interface Props {
  query: ParsedQuery
  hoveredZone: string | null
  onHover: (id: string | null) => void
}

export default function VennDiagram({ query, hoveredZone, onHover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { diagram, vennZones, fromTable, joins, setOperation, rightQuery } = query

  useEffect(() => {
    if (!svgRef.current) return
    if (diagram === 'two-set') renderTwoSet()
    else if (diagram === 'multi-set') renderMultiSet()
    else if (diagram === 'set-op') renderSetOp()
    else renderSingle()
  }, [query, hoveredZone])

  const W = 560, H = 340

  function renderTwoSet() {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    if (!fromTable || !joins[0]) return
    const tA = fromTable, tB = joins[0].table
    const r = 115, cy = H / 2, cxA = W / 2 - 72, cxB = W / 2 + 72

    const defs = svg.append('defs')
    defs.append('clipPath').attr('id', 'clipA').append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r)
    defs.append('clipPath').attr('id', 'clipB').append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r)

    // Glow filter
    const filt = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    filt.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur')
    const merge = filt.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const zoneA = vennZones.find(z => z.id === 'A')
    const zoneAB = vennZones.find(z => z.id === 'AB')
    const zoneB = vennZones.find(z => z.id === 'B')

    const bg = svg.append('g').attr('class', 'venn-bg')

    // Zone A (left only region via clip)
    bg.append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r)
      .attr('fill', tA.color).attr('fill-opacity', zoneA?.active ? (hoveredZone === 'A' ? 0.75 : hoveredZone ? 0.12 : 0.45) : 0.05)
      .attr('clip-path', 'none')
      .style('cursor', zoneA?.active ? 'pointer' : 'default')
      .style('transition', 'fill-opacity 0.3s')
      .attr('filter', hoveredZone === 'A' && zoneA?.active ? 'url(#glow)' : null)
      .on('mousemove', function (event) {
        if (!zoneA?.active) return
        const [mx, my] = d3.pointer(event, svgRef.current)
        setTooltip({ x: mx, y: my, text: zoneA.description })
        onHover('A')
      })
      .on('mouseleave', () => { onHover(null); setTooltip(null) })

    // Zone B (right only)
    bg.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r)
      .attr('fill', tB.color).attr('fill-opacity', zoneB?.active ? (hoveredZone === 'B' ? 0.75 : hoveredZone ? 0.12 : 0.45) : 0.05)
      .style('cursor', zoneB?.active ? 'pointer' : 'default')
      .style('transition', 'fill-opacity 0.3s')
      .attr('filter', hoveredZone === 'B' && zoneB?.active ? 'url(#glow)' : null)
      .on('mousemove', function (event) {
        if (!zoneB?.active) return
        const [mx, my] = d3.pointer(event, svgRef.current)
        setTooltip({ x: mx, y: my, text: zoneB.description })
        onHover('B')
      })
      .on('mouseleave', () => { onHover(null); setTooltip(null) })

    // Intersection zone (AB) — clipped
    const intG = bg.append('g').style('cursor', zoneAB?.active ? 'pointer' : 'default')
      .on('mousemove', function (event) {
        if (!zoneAB?.active) return
        const [mx, my] = d3.pointer(event, svgRef.current)
        setTooltip({ x: mx, y: my, text: zoneAB.description })
        onHover('AB')
      })
      .on('mouseleave', () => { onHover(null); setTooltip(null) })

    intG.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r)
      .attr('clip-path', 'url(#clipA)')
      .attr('fill', '#8b5cf6')
      .attr('fill-opacity', zoneAB?.active ? (hoveredZone === 'AB' ? 0.85 : hoveredZone ? 0.2 : 0.6) : 0.06)
      .style('transition', 'fill-opacity 0.3s')
      .attr('filter', hoveredZone === 'AB' && zoneAB?.active ? 'url(#glow)' : null)

    // Outlines
    svg.append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r).attr('fill', 'none').attr('stroke', tA.color).attr('stroke-opacity', 0.7).attr('stroke-width', 1.8)
    svg.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r).attr('fill', 'none').attr('stroke', tB.color).attr('stroke-opacity', 0.7).attr('stroke-width', 1.8)

    // Active zone outline highlight
    if (hoveredZone === 'A' && zoneA?.active) svg.append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r).attr('fill', 'none').attr('stroke', tA.color).attr('stroke-opacity', 1).attr('stroke-width', 3).attr('pointer-events', 'none')
    if (hoveredZone === 'B' && zoneB?.active) svg.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r).attr('fill', 'none').attr('stroke', tB.color).attr('stroke-opacity', 1).attr('stroke-width', 3).attr('pointer-events', 'none')

    // Labels
    const labelG = svg.append('g').attr('pointer-events', 'none')
    labelG.append('text').attr('x', cxA - 50).attr('y', cy - r - 14).attr('text-anchor', 'middle').attr('fill', tA.color).attr('font-size', 14).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(tA.alias)
    labelG.append('text').attr('x', cxA - 50).attr('y', cy - r - 1).attr('text-anchor', 'middle').attr('fill', '#45475a').attr('font-size', 10).attr('font-family', "'JetBrains Mono', monospace").text(tA.name)
    labelG.append('text').attr('x', cxB + 50).attr('y', cy - r - 14).attr('text-anchor', 'middle').attr('fill', tB.color).attr('font-size', 14).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(tB.alias)
    labelG.append('text').attr('x', cxB + 50).attr('y', cy - r - 1).attr('text-anchor', 'middle').attr('fill', '#45475a').attr('font-size', 10).attr('font-family', "'JetBrains Mono', monospace").text(tB.name)

    // Active zone badge
    if (zoneA?.active) {
      labelG.append('text').attr('x', cxA - 50).attr('y', cy + 5).attr('text-anchor', 'middle').attr('fill', tA.color).attr('fill-opacity', hoveredZone === 'A' ? 1 : 0.5).attr('font-size', 22).attr('font-family', "'JetBrains Mono', monospace").text('A')
    }
    if (zoneAB?.active) {
      labelG.append('text').attr('x', W / 2).attr('y', cy + 5).attr('text-anchor', 'middle').attr('fill', '#cba6f7').attr('fill-opacity', hoveredZone === 'AB' ? 1 : 0.6).attr('font-size', 18).attr('font-family', "'JetBrains Mono', monospace").text('A ∩ B')
    }
    if (zoneB?.active) {
      labelG.append('text').attr('x', cxB + 50).attr('y', cy + 5).attr('text-anchor', 'middle').attr('fill', tB.color).attr('fill-opacity', hoveredZone === 'B' ? 1 : 0.5).attr('font-size', 22).attr('font-family', "'JetBrains Mono', monospace").text('B')
    }

    // "RESULT" indicator - arrow pointing to active zone
    const activeZone = vennZones.find(z => z.active && (hoveredZone === null || z.id === hoveredZone))
    if (activeZone && !hoveredZone) {
      // Draw dashed border around active zones
    }
  }

  function renderMultiSet() {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    if (!fromTable) return
    const allTables = [fromTable, ...joins.map(j => j.table)]
    const n = allTables.length
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    const defs = svg.append('defs')
    const filt = defs.append('filter').attr('id', 'glow2').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    filt.append('feGaussianBlur').attr('stdDeviation', '7').attr('result', 'b')
    const m = filt.append('feMerge')
    m.append('feMergeNode').attr('in', 'b')
    m.append('feMergeNode').attr('in', 'SourceGraphic')

    const cx = W / 2, cy = H / 2
    const dist = n <= 3 ? 68 : 75
    const r = n <= 3 ? 95 : 80

    allTables.forEach((t, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const tx = cx + dist * Math.cos(angle), ty = cy + dist * Math.sin(angle)
      const isHov = hoveredZone === t.alias
      const zone = vennZones.find(z => z.id === t.alias)

      svg.append('circle').attr('cx', tx).attr('cy', ty).attr('r', r)
        .attr('fill', t.color)
        .attr('fill-opacity', isHov ? 0.7 : hoveredZone ? 0.15 : 0.32)
        .attr('stroke', t.color).attr('stroke-opacity', 0.8).attr('stroke-width', isHov ? 3 : 1.8)
        .style('cursor', 'pointer').style('transition', 'all 0.3s')
        .attr('filter', isHov ? 'url(#glow2)' : null)
        .on('mousemove', function (event) {
          const [mx, my] = d3.pointer(event, svgRef.current)
          setTooltip({ x: mx, y: my, text: `${t.alias} → ${t.name}` })
          onHover(t.alias)
        })
        .on('mouseleave', () => { onHover(null); setTooltip(null) })

      const lx = cx + (dist + r * 0.65) * Math.cos(angle)
      const ly = cy + (dist + r * 0.65) * Math.sin(angle)
      svg.append('text').attr('x', lx).attr('y', ly - 7).attr('text-anchor', 'middle').attr('fill', t.color).attr('font-size', 13).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").attr('pointer-events', 'none').text(t.alias)
      svg.append('text').attr('x', lx).attr('y', ly + 8).attr('text-anchor', 'middle').attr('fill', '#45475a').attr('font-size', 10).attr('font-family', "'JetBrains Mono', monospace").attr('pointer-events', 'none').text(t.name)

      // JOIN type badge
      if (i > 0) {
        const j = joins[i - 1]
        const midAngle = (2 * Math.PI * (i - 0.5)) / n - Math.PI / 2
        const bx = cx + dist * 0.5 * Math.cos(midAngle)
        const by = cy + dist * 0.5 * Math.sin(midAngle)
        svg.append('rect').attr('x', bx - 24).attr('y', by - 10).attr('width', 48).attr('height', 20).attr('rx', 4).attr('fill', '#1e1e2e').attr('stroke', t.color).attr('stroke-opacity', 0.4).attr('pointer-events', 'none')
        svg.append('text').attr('x', bx).attr('y', by + 4).attr('text-anchor', 'middle').attr('fill', t.color).attr('font-size', 10).attr('font-family', "'JetBrains Mono', monospace").attr('pointer-events', 'none').text(j.type)
      }
    })
  }

  function renderSetOp() {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    if (!fromTable) return
    const tA = fromTable, tB = rightQuery?.fromTable || { name: 'B', alias: 'B', color: '#10b981' }
    const r = 110, cy = H / 2, cxA = W / 2 - 72, cxB = W / 2 + 72

    const defs = svg.append('defs')
    defs.append('clipPath').attr('id', 'clpA').append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r)
    defs.append('clipPath').attr('id', 'clpB').append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r)
    const f = defs.append('filter').attr('id', 'gso')
    f.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'b')
    const fm = f.append('feMerge')
    fm.append('feMergeNode').attr('in', 'b'); fm.append('feMergeNode').attr('in', 'SourceGraphic')

    const op = setOperation
    const showA = op === 'UNION' || op === 'UNION_ALL' || op === 'EXCEPT'
    const showAB = op === 'UNION' || op === 'UNION_ALL' || op === 'INTERSECT'
    const showB = op === 'UNION' || op === 'UNION_ALL'

    svg.append('circle').attr('cx', cxA).attr('cy', cy).attr('r', r).attr('fill', tA.color).attr('fill-opacity', showA ? 0.5 : 0.07).attr('stroke', tA.color).attr('stroke-opacity', 0.7).attr('stroke-width', 1.8)
    svg.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r).attr('fill', tB.color).attr('fill-opacity', showB ? 0.5 : 0.07).attr('stroke', tB.color).attr('stroke-opacity', 0.7).attr('stroke-width', 1.8)
    svg.append('circle').attr('cx', cxB).attr('cy', cy).attr('r', r).attr('clip-path', 'url(#clpA)').attr('fill', '#8b5cf6').attr('fill-opacity', showAB ? 0.65 : 0.05)

    const lb = svg.append('g').attr('pointer-events', 'none')
    lb.append('text').attr('x', cxA - 48).attr('y', cy - r - 14).attr('text-anchor', 'middle').attr('fill', tA.color).attr('font-size', 13).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(tA.alias)
    lb.append('text').attr('x', cxB + 48).attr('y', cy - r - 14).attr('text-anchor', 'middle').attr('fill', tB.color).attr('font-size', 13).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(tB.alias)

    const opLabel: Record<string, string> = { UNION: 'A ∪ B', UNION_ALL: 'A ∪ B (ALL)', INTERSECT: 'A ∩ B', EXCEPT: 'A − B' }
    lb.append('text').attr('x', W / 2).attr('y', H - 18).attr('text-anchor', 'middle').attr('fill', '#cba6f7').attr('font-size', 15).attr('font-family', "'JetBrains Mono', monospace").text(opLabel[op || 'UNION'] || '')
  }

  function renderSingle() {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    if (!fromTable) return
    const cx = W / 2, cy = H / 2, r = 110
    const defs = svg.append('defs')
    const f = defs.append('filter').attr('id', 'gs')
    f.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'b')
    const fm = f.append('feMerge'); fm.append('feMergeNode').attr('in', 'b'); fm.append('feMergeNode').attr('in', 'SourceGraphic')
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r).attr('fill', fromTable.color).attr('fill-opacity', 0.45).attr('stroke', fromTable.color).attr('stroke-width', 2).attr('filter', 'url(#gs)')
    svg.append('text').attr('x', cx).attr('y', cy - 10).attr('text-anchor', 'middle').attr('fill', fromTable.color).attr('font-size', 18).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(fromTable.alias)
    svg.append('text').attr('x', cx).attr('y', cy + 12).attr('text-anchor', 'middle').attr('fill', '#45475a').attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace").text(fromTable.name)
  }

  return (
    <div className="venn-wrap" onMouseLeave={() => { onHover(null); setTooltip(null) }}>
      <svg ref={svgRef} className="venn-svg" />
      {tooltip && (
        <div className="venn-tt" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
      <div className="venn-legend">
        {vennZones.map(z => (
          <div key={z.id} className={`vz-item ${z.active ? 'vz-active' : 'vz-dim'} ${hoveredZone === z.id ? 'vz-hov' : ''}`} onMouseEnter={() => z.active && onHover(z.id)} onMouseLeave={() => onHover(null)}>
            <span className="vz-dot" style={{ background: z.color, opacity: z.active ? 1 : 0.3 }} />
            <span className="vz-label" style={{ color: z.active ? z.color : '#45475a' }}>{z.label}</span>
            <span className="vz-desc">{z.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
