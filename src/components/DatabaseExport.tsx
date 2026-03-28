import { useSqlDatabase } from '../contexts/DatabaseContext'
import './DatabaseExport.css'

export default function DatabaseExport() {
  const { databases, activeDatabaseId, exportDatabase } = useSqlDatabase()
  
  const activeDb = databases.find(d => d.id === activeDatabaseId)

  const handleExport = () => {
    const data = exportDatabase()
    if (!data) {
      alert("Error al exportar la base de datos.")
      return
    }
    
    // Convertir a Blob y descargar
    const blob = new Blob([data as unknown as BlobPart], { type: 'application/x-sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // Usar el nombre actual de la BD, asegurando que tenga extensión
    let filename = activeDb?.name || 'database'
    if (!filename.endsWith('.sqlite') && !filename.endsWith('.db')) {
      filename += '.sqlite'
    }
    
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="db-export-container">
      <div className="db-export-header">
        <h2>📤 Exportar Base de Datos</h2>
        <p>Guarda tu progreso o transfiere tu base de datos descargando un archivo SQLite binario compatible con cualquier entorno o la herramienta SQL Path.</p>
      </div>
      
      <div className="db-export-card">
        <div className="export-icon">💾</div>
        <h3>{activeDb?.name || 'Base de datos'}</h3>
        <div className="export-meta">
          <span>{activeDb?.tableCount || 0} tablas</span>
        </div>
        
        <p className="export-desc">
          Al exportar, obtendrás un archivo binario <code>.sqlite</code> que contiene todo el esquema y los datos tal como están actualmente en memoria.
        </p>
        
        <button className="export-btn" onClick={handleExport}>
          <span className="btn-icon">⬇️</span> Descargar {activeDb?.name || 'BD'}
        </button>
      </div>

      <div className="export-info-box">
        <h4>¿Qué puedes hacer con este archivo?</h4>
        <ul>
          <li><strong>Importarlo aquí:</strong> Podrás subirlo después a SQL Path desde la pestaña "Importar".</li>
          <li><strong>Clientes externos:</strong> Ábrelo con DBeaver, DataGrip, DB Browser for SQLite u otro gestor.</li>
          <li><strong>Backend:</strong> Úsalo como base de datos en proyectos de NodeJS, Python o PHP.</li>
        </ul>
      </div>
    </div>
  )
}
