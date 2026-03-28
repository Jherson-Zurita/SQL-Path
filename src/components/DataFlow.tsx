import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ParsedQuery } from '../utils/sqlParser'
import './DataFlow.css'

interface Props {
  query: ParsedQuery
  hoveredZone: string | null
  onHover: (id: string | null) => void
}

export default function DataFlow({ query, hoveredZone, onHover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const animRef = useRef<number>(0)
  const { fromTable, joins, selectColumns, groupBy, having, orderBy, where } = query

  const startAnimation = () => {
    setIsAnimating(true)
    setActiveStep(0)
    let step = 0
    const totalSteps = getSteps().length + 1 // +1 for tables
    const tick = () => {
      step++
      if (step >= totalSteps) {
        setIsAnimating(false)
        setActiveStep(-1)
        return
      }
      setActiveStep(step)
      animRef.current = window.setTimeout(tick, 800)
    }
    animRef.current = window.setTimeout(tick, 800)
  }

  useEffect(() => {
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [])

  function getSteps() {
    const steps: { label: string; color: string; icon: string }[] = []
    if (where) steps.push({ label: 'WHERE', color: '#f59e0b', icon: '🔍' })
    if (groupBy.length) steps.push({ label: 'GROUP BY', color: '#10b981', icon: '📦' })
    if (having) steps.push({ label: 'HAVING', color: '#ef4444', icon: '🔎' })
    steps.push({ label: 'SELECT', color: '#cba6f7', icon: '📐' })
    if (orderBy.length) steps.push({ label: 'ORDER BY', color: '#06b6d4', icon: '↕' })
    return steps
  }

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = 600, H = 380
    svg.attr('viewBox', `0 0 ${W} ${H}`)

    const defs = svg.append('defs')

    // Glow filter
    const glow = defs.append('filter').attr('id', 'df-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'b')
    const glowMerge = glow.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'b')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Arrow markers
    const allTables = fromTable ? [fromTable, ...joins.map(j => j.table)] : []
    allTables.forEach(t => {
      defs.append('marker').attr('id', `arr-${t.alias}`).attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', t.color)
    })
    defs.append('marker').attr('id', 'arr-result').attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#cba6f7')
    defs.append('marker').attr('id', 'arr-flow').attr('viewBox', '0 -5 10 10').attr('refX', 10).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#89b4fa')

    if (!fromTable) return

    const n = allTables.length
    const nodeW = 120, nodeH = 48, nodeR = 10

    // Table nodes positions
    const spacing = Math.min(140, (W - 80) / (n + 1))
    const startX = (W - spacing * (n - 1) - nodeW) / 2

    const nodePos = allTables.map((t, i) => ({
      x: startX + i * spacing,
      y: 30,
      table: t,
    }))

    // JOIN connectors with animated dashes
    for (let i = 1; i < nodePos.length; i++) {
      const j = joins[i - 1]
      const src = nodePos[i - 1], dst = nodePos[i]
      const sx = src.x + nodeW / 2, sy = src.y + nodeH
      const dx = dst.x + nodeW / 2, dy = dst.y + nodeH
      const midY = sy + 44

      const path = svg.append('path')
        .attr('d', `M${sx},${sy} C${sx},${midY} ${dx},${midY} ${dx},${dy}`)
        .attr('fill', 'none').attr('stroke', j.table.color).attr('stroke-width', 2)
        .attr('stroke-opacity', activeStep === 0 ? 0.9 : 0.35)
        .attr('marker-end', `url(#arr-${j.table.alias})`)

      if (j.type === 'LEFT' || j.type === 'RIGHT') {
        path.attr('stroke-dasharray', '6,4')
      }

      // Animated particle on path
      if (isAnimating && activeStep === 0) {
        const pathNode = path.node()!
        const totalLen = pathNode.getTotalLength()
        const particle = svg.append('circle')
          .attr('r', 4).attr('fill', j.table.color).attr('filter', 'url(#df-glow)')
          .attr('opacity', 0.9)

        function animateParticle() {
          particle.attr('opacity', 0.9)
          particle.transition()
            .duration(1200)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t: number) => {
                const p = pathNode.getPointAtLength(t * totalLen)
                return `translate(${p.x},${p.y})`
              }
            })
            .attr('opacity', 0)
        }
        animateParticle()
      }

      // JOIN type label
      const lx = (sx + dx) / 2, ly = midY + 18
      svg.append('rect').attr('x', lx - 30).attr('y', ly - 11).attr('width', 60).attr('height', 22).attr('rx', 5)
        .attr('fill', '#1e1e2e').attr('stroke', j.table.color).attr('stroke-opacity', 0.4)
      svg.append('text').attr('x', lx).attr('y', ly + 4).attr('text-anchor', 'middle')
        .attr('fill', j.table.color).attr('font-size', 10).attr('font-weight', 700)
        .attr('font-family', "'JetBrains Mono', monospace").text(j.type)
    }

    // Draw table nodes with enter animation
    nodePos.forEach(({ x, y, table }, i) => {
      const isHov = hoveredZone === table.alias
      const isActive = isAnimating && activeStep === 0
      const g = svg.append('g').attr('cursor', 'pointer')
        .on('mouseenter', () => onHover(table.alias))
        .on('mouseleave', () => onHover(null))

      // Background glow for active
      if (isActive || isHov) {
        g.append('rect').attr('x', x - 3).attr('y', y - 3).attr('width', nodeW + 6).attr('height', nodeH + 6).attr('rx', nodeR + 2)
          .attr('fill', 'none').attr('stroke', table.color).attr('stroke-opacity', 0.3).attr('stroke-width', 2)
          .attr('filter', 'url(#df-glow)')
      }

      g.append('rect').attr('x', x).attr('y', y).attr('width', nodeW).attr('height', nodeH).attr('rx', nodeR)
        .attr('fill', table.color + (isHov || isActive ? '28' : '12'))
        .attr('stroke', table.color).attr('stroke-opacity', isHov || isActive ? 0.9 : 0.45).attr('stroke-width', isHov || isActive ? 2.5 : 1.2)
        .style('transition', 'all 0.3s')

      // Table icon
      g.append('text').attr('x', x + 12).attr('y', y + 20).attr('fill', table.color).attr('font-size', 14).text('⊡')

      g.append('text').attr('x', x + 28).attr('y', y + 19).attr('fill', table.color)
        .attr('font-size', 12).attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").text(table.alias)
      g.append('text').attr('x', x + 28).attr('y', y + 33).attr('fill', '#45475a')
        .attr('font-size', 9).attr('font-family', "'JetBrains Mono', monospace")
        .text(table.name !== table.alias ? table.name : '')

      // Row count indicator
      g.append('rect').attr('x', x + nodeW - 28).attr('y', y + 5).attr('width', 22).attr('height', 14).attr('rx', 3)
        .attr('fill', table.color + '18')
      g.append('text').attr('x', x + nodeW - 17).attr('y', y + 15).attr('text-anchor', 'middle')
        .attr('fill', table.color).attr('font-size', 8).attr('font-family', "'JetBrains Mono', monospace").text('n')
    })

    // Pipeline steps below
    const steps = getSteps()

    const pipeY = 175
    const pipeSpacing = Math.min(110, (W - 60) / steps.length)
    const pipeStartX = (W - pipeSpacing * (steps.length - 1) - 90) / 2

    // Arrow from tables to pipeline
    if (fromTable && steps.length > 0) {
      const tablesMidX = (nodePos[0].x + nodePos[nodePos.length - 1].x + nodeW) / 2
      const firstPipeX = pipeStartX + 45

      svg.append('path')
        .attr('d', `M${tablesMidX},${nodeH + 30} C${tablesMidX},${pipeY - 30} ${firstPipeX},${pipeY - 30} ${firstPipeX},${pipeY - 5}`)
        .attr('fill', 'none').attr('stroke', '#89b4fa').attr('stroke-opacity', 0.25).attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,4').attr('marker-end', 'url(#arr-flow)')

      // Animated particle on this path
      if (isAnimating && activeStep === 1) {
        const pathSel = svg.select('path:last-of-type')
        const pathNode = (pathSel.node() as SVGPathElement)
        if (pathNode) {
          const totalLen = pathNode.getTotalLength()
          const p = svg.append('circle').attr('r', 3).attr('fill', '#89b4fa').attr('filter', 'url(#df-glow)')
          p.transition().duration(800).ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t: number) => {
                const pt = pathNode.getPointAtLength(t * totalLen)
                return `translate(${pt.x},${pt.y})`
              }
            })
            .attr('opacity', 0)
        }
      }
    }

    // Draw pipeline steps
    steps.forEach((step, i) => {
      const sx = pipeStartX + i * pipeSpacing
      const sw = 90, sh = 38
      const isStepActive = isAnimating && activeStep === (i + 1)
      const isPast = isAnimating && activeStep > (i + 1)

      // Connector arrow
      if (i > 0) {
        const prevX = pipeStartX + (i - 1) * pipeSpacing + sw
        const line = svg.append('line')
          .attr('x1', prevX + 4).attr('y1', pipeY + sh / 2)
          .attr('x2', sx - 4).attr('y2', pipeY + sh / 2)
          .attr('stroke', step.color).attr('stroke-opacity', isPast || isStepActive ? 0.8 : 0.3)
          .attr('stroke-width', isPast || isStepActive ? 2 : 1.5)
          .attr('marker-end', 'url(#arr-result)')

        // Animated particle between steps
        if (isAnimating && activeStep === (i + 1)) {
          const particle = svg.append('circle')
            .attr('r', 3).attr('fill', step.color).attr('filter', 'url(#df-glow)')
            .attr('cx', prevX + 4).attr('cy', pipeY + sh / 2)
          particle.transition().duration(400).ease(d3.easeLinear)
            .attr('cx', sx - 4).attr('opacity', 0)
        }
      }

      // Step node with glow when active
      if (isStepActive) {
        svg.append('rect').attr('x', sx - 2).attr('y', pipeY - 2).attr('width', sw + 4).attr('height', sh + 4).attr('rx', 10)
          .attr('fill', 'none').attr('stroke', step.color).attr('stroke-opacity', 0.4).attr('stroke-width', 2)
          .attr('filter', 'url(#df-glow)')
      }

      svg.append('rect').attr('x', sx).attr('y', pipeY).attr('width', sw).attr('height', sh).attr('rx', 8)
        .attr('fill', step.color + (isStepActive ? '28' : isPast ? '1a' : '10'))
        .attr('stroke', step.color).attr('stroke-opacity', isStepActive ? 0.85 : isPast ? 0.6 : 0.4)
        .attr('stroke-width', isStepActive ? 2.5 : 1.2)
        .style('transition', 'all 0.3s')

      svg.append('text').attr('x', sx + 14).attr('y', pipeY + 16).attr('font-size', 12).text(step.icon)
      svg.append('text').attr('x', sx + sw / 2 + 4).attr('y', pipeY + 26)
        .attr('text-anchor', 'middle').attr('fill', step.color)
        .attr('font-size', 10).attr('font-weight', 700)
        .attr('font-family', "'JetBrains Mono', monospace").text(step.label)
    })

    // Result box
    const resX = W / 2 - 60, resY = 280
    const lastPipeX = pipeStartX + (steps.length - 1) * pipeSpacing + 45
    const isResultActive = isAnimating && activeStep >= steps.length + 1

    svg.append('path')
      .attr('d', `M${lastPipeX},${pipeY + 38} C${lastPipeX},${resY - 20} ${resX + 60},${resY - 20} ${resX + 60},${resY - 2}`)
      .attr('fill', 'none').attr('stroke', '#cba6f7').attr('stroke-opacity', 0.2).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4').attr('marker-end', 'url(#arr-result)')

    if (isResultActive) {
      svg.append('rect').attr('x', resX - 3).attr('y', resY - 3).attr('width', 126).attr('height', 46).attr('rx', 12)
        .attr('fill', 'none').attr('stroke', '#cba6f7').attr('stroke-opacity', 0.35).attr('stroke-width', 2)
        .attr('filter', 'url(#df-glow)')
    }

    svg.append('rect').attr('x', resX).attr('y', resY).attr('width', 120).attr('height', 40).attr('rx', 10)
      .attr('fill', 'rgba(203,166,247,0.1)').attr('stroke', '#cba6f7')
      .attr('stroke-opacity', isResultActive ? 0.8 : 0.5).attr('stroke-width', isResultActive ? 2.5 : 1.8)

    const colCount = selectColumns.filter(c => c.column !== '*').length || (selectColumns[0]?.column === '*' ? '∗' : 0)
    svg.append('text').attr('x', resX + 60).attr('y', resY + 16).attr('text-anchor', 'middle')
      .attr('fill', '#cba6f7').attr('font-size', 11).attr('font-weight', 700)
      .attr('font-family', "'JetBrains Mono', monospace").text('RESULTADO')
    svg.append('text').attr('x', resX + 60).attr('y', resY + 30).attr('text-anchor', 'middle')
      .attr('fill', '#45475a').attr('font-size', 9)
      .attr('font-family', "'JetBrains Mono', monospace").text(`${colCount} columna(s)`)

    // Data count indicator
    const countY = resY + 50
    svg.append('text').attr('x', W / 2).attr('y', countY + 10).attr('text-anchor', 'middle')
      .attr('fill', '#45475a').attr('font-size', 9)
      .attr('font-family', "'JetBrains Mono', monospace")
      .text(`Pipeline: ${allTables.length} tabla(s) → ${steps.length} operación(es) → resultado`)

  }, [query, hoveredZone, isAnimating, activeStep])

  return (
    <div className="dataflow">
      <div className="df-header">
        <div className="df-title">Flujo de Datos</div>
        <button
          className={`df-animate-btn ${isAnimating ? 'df-animating' : ''}`}
          onClick={startAnimation}
          disabled={isAnimating}
        >
          {isAnimating ? (
            <><span className="df-pulse">●</span> Animando...</>
          ) : (
            <>▶ Animar Ejecución</>
          )}
        </button>
      </div>
      <svg ref={svgRef} className="df-svg" />
      {isAnimating && (
        <div className="df-step-indicator">
          <span className="df-step-dot" /> Paso {activeStep + 1} de {getSteps().length + 1}
        </div>
      )}
    </div>
  )
}
