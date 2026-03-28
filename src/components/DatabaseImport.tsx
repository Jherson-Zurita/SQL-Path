import { useState, useRef } from 'react'
import { useSqlDatabase } from '../contexts/DatabaseContext'
import './DatabaseImport.css'

export default function DatabaseImport() {
  const { importFullDatabase, activeTables: tables, resetDatabase, databases, activeDatabaseId, selectDatabase } = useSqlDatabase()
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [sqlPreview, setSqlPreview] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setResult(null)
    
    // Si es un archivo SQL, podemos mostrar vista previa
    if (file.name.endsWith('.sql') || file.name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (e) => setSqlPreview((e.target?.result as string).slice(0, 1000) + '...')
      reader.readAsText(file)
    } else {
      setSqlPreview('')
    }

    const res = await importFullDatabase(file)
    setIsProcessing(false)
    
    setResult({
      success: res.success,
      message: res.success
        ? `✅ Base de datos "${file.name}" importada correctamente`
        : `❌ Error al importar: ${res.error}`,
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="db-import">
      <div className="dbi-header">
        <h2>📂 Importar Base de Datos</h2>
        <p>Arrastra un archivo .sql o .sqlite para crear una nueva base de datos.</p>
      </div>

      <div className="dbi-db-selector">
        <h3>📍 Base de Datos Activa</h3>
        <div className="dbi-db-grid">
          {databases.map(db => (
            <button 
              key={db.id} 
              className={`dbi-db-item ${activeDatabaseId === db.id ? 'dbi-db-active' : ''}`}
              onClick={() => selectDatabase(db.id)}
            >
              <span className="dbi-db-icon">{db.isSample ? '🌟' : '📁'}</span>
              <span className="dbi-db-name">{db.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`dbi-drop-zone ${dragOver ? 'dbi-drag-over' : ''} ${isProcessing ? 'dbi-processing' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".sql,.sqlite,.db,.txt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />
        <div className="dbi-drop-icon">{isProcessing ? '⚙️' : dragOver ? '📥' : '📁'}</div>
        <div className="dbi-drop-text">
          {isProcessing ? 'Procesando base de datos...' : dragOver ? 'Suelta el archivo aquí...' : 'Arrastra un archivo SQL o SQLite aquí'}
        </div>
        <div className="dbi-drop-hint">Soportamos archivos .sql y binarios .sqlite / .db</div>
      </div>

      {result && (
        <div className={`dbi-result ${result.success ? 'dbi-result-ok' : 'dbi-result-err'}`}>
          {result.message}
        </div>
      )}

      {sqlPreview && (
        <div className="dbi-preview">
          <div className="dbi-preview-title">Vista previa del SQL:</div>
          <pre className="dbi-preview-code">{sqlPreview}</pre>
        </div>
      )}

      <div className="dbi-section">
        <h3>📊 Tablas en "{databases.find(d => d.id === activeDatabaseId)?.name}" ({tables.length})</h3>
        <div className="dbi-tables-grid">
          {tables.map((t: any) => (
            <div key={t.name} className="dbi-table-card">
              <div className="dbi-table-name">{t.name}</div>
              <div className="dbi-table-meta">
                <span>{t.columns.length} columnas</span>
                <span>·</span>
                <span>{t.rowCount} filas</span>
              </div>
              <div className="dbi-table-cols">
                {t.columns.map((c: any) => (
                  <span key={c.name} className={`dbi-col ${c.pk ? 'dbi-col-pk' : ''}`}>
                    {c.pk && '🔑 '}{c.name}
                    <span className="dbi-col-type">{c.type}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="dbi-actions">
        <button className="dbi-reset-btn" onClick={resetDatabase}>
          ↻ Restaurar BD de Ejemplo
        </button>
      </div>
    </div>
  )
}
