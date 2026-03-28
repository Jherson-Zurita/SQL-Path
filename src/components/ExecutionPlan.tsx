import { useState } from 'react'
import type { ParsedQuery } from '../utils/sqlParser'
import './ExecutionPlan.css'

interface Props {
  query: ParsedQuery
}

export default function ExecutionPlan({ query }: Props) {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const steps = query.executionSteps

  return (
    <div className="exec-plan">
      <div className="exec-title">Orden de Ejecución SQL</div>
      <div className="exec-subtitle">SQL no se ejecuta en el orden que se escribe</div>

      <div className="exec-steps">
        {steps.map((step, i) => (
          <div key={step.step} className={`exec-step ${activeStep === i ? 'step-active' : ''}`} onMouseEnter={() => setActiveStep(i)} onMouseLeave={() => setActiveStep(null)}>
            <div className="step-connector">
              <div className="step-num" style={{ background: step.color + '22', border: `1px solid ${step.color}66`, color: step.color }}>
                {step.step}
              </div>
              {i < steps.length - 1 && <div className="step-line" style={{ background: step.color + '33' }} />}
            </div>
            <div className="step-body" style={{ borderColor: activeStep === i ? step.color + '66' : 'rgba(255,255,255,0.06)' }}>
              <div className="step-header">
                <span className="step-icon">{step.icon}</span>
                <span className="step-name" style={{ color: step.color }}>{step.name}</span>
                {step.affectedTables?.length ? (
                  <div className="step-tables">
                    {step.affectedTables.map(t => (
                      <span key={t} className="step-table-badge" style={{ background: step.color + '18', color: step.color }}>{t}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <code className="step-clause">{step.clause}</code>
              {activeStep === i && <p className="step-desc">{step.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {query.subqueries.length > 0 && (
        <div className="subquery-section">
          <div className="subquery-title">🔄 Subconsultas detectadas</div>
          {query.subqueries.map((sq, i) => (
            <div key={i} className="subquery-item">
              <div className="subquery-label">Subconsulta {i + 1}</div>
              <code className="subquery-code">{sq.raw.length > 120 ? sq.raw.slice(0, 120) + '…' : sq.raw}</code>
              {sq.fromTable && <div className="subquery-meta">Tabla: <strong style={{ color: sq.fromTable.color }}>{sq.fromTable.name}</strong></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
