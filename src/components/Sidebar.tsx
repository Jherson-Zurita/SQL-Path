import './Sidebar.css'

export type Section = 'editor' | 'challenges' | 'schema' | 'import' | 'commands' | 'dbdraw' | 'export' | 'segurity'

interface Props {
  active: Section
  onChange: (s: Section) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'editor', icon: '⌨', label: 'Editor SQL' },
  { id: 'schema', icon: '🗄', label: 'Schema' },
  { id: 'commands', icon: '📋', label: 'Comandos' },
  { id: 'dbdraw', icon: 'DB', label: 'DbDraw' },
  { id: 'segurity', icon: '🔒', label: 'Seguridad' },
  { id: 'challenges', icon: '🎯', label: 'Desafíos' },
  { id: 'import', icon: '📂', label: 'Importar' },
  { id: 'export', icon: '📤', label: 'Exportar' },
]

export default function Sidebar({ active, onChange, theme, onToggleTheme }: Props) {
  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <span className="sb-logo-bracket">[</span>
        <span className="sb-logo-sql">SQL</span>
        <span className="sb-logo-sep">·</span>
        <span className="sb-logo-path">P</span>
        <span className="sb-logo-bracket">]</span>
      </div>

      <div className="sb-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sb-nav-btn ${active === item.id ? 'sb-nav-active' : ''}`}
            onClick={() => onChange(item.id)}
            title={item.label}
          >
            <span className="sb-nav-icon">{item.icon}</span>
            <span className="sb-nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sb-bottom">
        <button className="sb-theme-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
