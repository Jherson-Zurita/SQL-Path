import { useState } from 'react'
import './DatabaseSecurity.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Command { cmd: string; desc: string; example: string; engines?: string[] }

interface SecurityTopic {
    id: string
    title: string
    icon: string
    description: string
    type: 'security' | 'transaction' | 'isolation' | 'error' | 'lock'
    commands: Command[]
    tip?: string
}

interface EngineRow { feature: string; mysql: string; postgres: string; sqlite: string; sqlserver: string }

// ─── Data ────────────────────────────────────────────────────────────────────

const TOPICS: SecurityTopic[] = [
    /* ── TRANSACCIONES ─────────────────────────────────────────────────────── */
    {
        id: 't-begin', title: 'Inicio de Transacción', icon: '🏁', type: 'transaction',
        description: 'Abre un bloque atómico. Todas las operaciones posteriores son temporales y solo visibles para la sesión actual hasta confirmarse con COMMIT o cancelarse con ROLLBACK.',
        tip: 'En MySQL el autocommit está activo por defecto. BEGIN lo suspende para esa sesión.',
        commands: [
            { cmd: 'BEGIN', desc: 'Inicia la transacción (PostgreSQL / SQLite).', example: 'BEGIN;', engines: ['postgres', 'sqlite'] },
            { cmd: 'START TRANSACTION', desc: 'Equivalente en MySQL / MariaDB.', example: 'START TRANSACTION;', engines: ['mysql'] },
            { cmd: 'BEGIN TRAN', desc: 'SQL Server — nombre opcional.', example: 'BEGIN TRAN transferencia_saldo;', engines: ['sqlserver'] },
            { cmd: 'SET AUTOCOMMIT = 0', desc: 'Desactiva autocommit en MySQL para toda la sesión.', example: 'SET AUTOCOMMIT = 0;\nINSERT INTO pedidos VALUES (1, \'activo\');\nCOMMIT;', engines: ['mysql'] },
        ]
    },
    {
        id: 't-commit', title: 'COMMIT — Confirmar', icon: '💾', type: 'transaction',
        description: 'Persiste permanentemente todos los cambios de la transacción en disco. Una vez ejecutado no puede deshacerse. El motor garantiza durabilidad incluso ante caídas del sistema.',
        tip: 'Haz COMMIT solo en el camino feliz. Nunca dentro de un bloque catch.',
        commands: [
            { cmd: 'COMMIT', desc: 'Confirma todos los cambios pendientes.', example: 'BEGIN;\n  UPDATE cuentas SET saldo = saldo - 500 WHERE id = 1;\n  UPDATE cuentas SET saldo = saldo + 500 WHERE id = 2;\nCOMMIT;' },
            { cmd: 'COMMIT AND CHAIN', desc: 'Confirma e inicia una nueva TX inmediatamente (PostgreSQL).', example: 'COMMIT AND CHAIN;', engines: ['postgres'] },
        ]
    },
    {
        id: 't-rollback', title: 'ROLLBACK — Revertir', icon: '⏪', type: 'transaction',
        description: 'Deshace todos los cambios desde el inicio de la transacción (o hasta un SAVEPOINT), dejando la base de datos exactamente en el estado previo.',
        tip: 'Siempre incluye ROLLBACK en el bloque de manejo de errores de tu aplicación.',
        commands: [
            { cmd: 'ROLLBACK', desc: 'Revierte toda la transacción.', example: 'BEGIN;\n  DELETE FROM facturas WHERE año < 2018;\n  -- Oops, demasiados registros borrados\nROLLBACK; -- sin daños' },
            { cmd: 'ROLLBACK TO SAVEPOINT', desc: 'Revierte solo hasta el punto intermedio.', example: 'ROLLBACK TO SAVEPOINT antes_del_borrado;' },
        ]
    },
    {
        id: 't-savepoint', title: 'Savepoints', icon: '📍', type: 'transaction',
        description: 'Crean puntos de restauración intermedios dentro de una transacción. Puedes revertir hasta ese punto sin cancelar la operación completa.',
        tip: 'Ideal en procesos por lotes: si un lote falla, reviertes solo ese lote y continúas con el siguiente.',
        commands: [
            { cmd: 'SAVEPOINT', desc: 'Crea un punto de guardado nombrado.', example: 'BEGIN;\n  INSERT INTO log VALUES (\'inicio proceso\');\n  SAVEPOINT sp_antes_pedido;\n\n  INSERT INTO pedidos VALUES (99, \'datos incorrectos\');\n  ROLLBACK TO SAVEPOINT sp_antes_pedido; -- deshace solo el pedido\n\n  INSERT INTO pedidos VALUES (99, \'datos correctos\');\nCOMMIT;' },
            { cmd: 'RELEASE SAVEPOINT', desc: 'Elimina el punto (libera recursos de memoria).', example: 'RELEASE SAVEPOINT sp_antes_pedido;' },
        ]
    },

    /* ── SEGURIDAD ─────────────────────────────────────────────────────────── */
    {
        id: 's-users', title: 'Gestión de Usuarios', icon: '👤', type: 'security',
        description: 'Creación, modificación y eliminación de usuarios del motor de base de datos. Principio fundamental: mínimo privilegio — cada usuario solo debe tener acceso a lo estrictamente necesario.',
        tip: 'Nunca uses root/admin en la aplicación. Crea un usuario específico con permisos acotados a las tablas que realmente necesita.',
        commands: [
            { cmd: 'CREATE USER (MySQL)', desc: 'Crea usuario con contraseña y host específico.', example: "CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'S3cur3P@ss!';\nCREATE USER 'reportes'@'%' IDENTIFIED BY 'R3p0rtP@ss!';", engines: ['mysql'] },
            { cmd: 'CREATE USER (PostgreSQL)', desc: 'Sin host — la autenticación usa pg_hba.conf.', example: "CREATE USER app_user WITH PASSWORD 'S3cur3P@ss!';\nCREATE USER readonly_user WITH PASSWORD 'R34dOnly!'  VALID UNTIL '2025-12-31';", engines: ['postgres'] },
            { cmd: 'ALTER USER', desc: 'Cambia contraseña, expira sesión u otros atributos.', example: "ALTER USER 'app_user'@'localhost' IDENTIFIED BY 'NuevaPass2024!';\nALTER USER 'app_user'@'localhost' PASSWORD EXPIRE;", engines: ['mysql'] },
            { cmd: 'DROP USER', desc: 'Elimina el usuario (usar IF EXISTS para evitar errores).', example: "DROP USER IF EXISTS 'ex_empleado'@'%';" },
            { cmd: 'SHOW GRANTS', desc: 'Lista todos los permisos de un usuario.', example: "SHOW GRANTS FOR 'app_user'@'localhost';\nSELECT * FROM information_schema.USER_PRIVILEGES;", engines: ['mysql'] },
            { cmd: '\\du (psql)', desc: 'Lista usuarios y roles en PostgreSQL.', example: '\\du\n-- O en SQL:\nSELECT usename, usesuper, usecreatedb FROM pg_user;', engines: ['postgres'] },
        ]
    },
    {
        id: 's-grant', title: 'GRANT — Otorgar Privilegios', icon: '✅', type: 'security',
        description: 'Asigna permisos específicos a usuarios o roles. Se pueden otorgar a nivel de servidor, base de datos, tabla o incluso columna individual.',
        tip: 'Prefiere GRANT sobre tablas específicas, nunca sobre toda la base de datos. Menos superficie de ataque = menos riesgo.',
        commands: [
            { cmd: 'GRANT SELECT', desc: 'Solo lectura — ideal para usuarios de reportes.', example: "GRANT SELECT ON tienda.productos TO 'reportes'@'%';" },
            { cmd: 'GRANT SELECT, INSERT, UPDATE', desc: 'Lectura y escritura sin poder borrar.', example: "GRANT SELECT, INSERT, UPDATE\n  ON tienda.pedidos\n  TO 'app_user'@'localhost';" },
            { cmd: 'GRANT ALL PRIVILEGES', desc: 'Control total sobre la BD (solo admins).', example: "GRANT ALL PRIVILEGES\n  ON tienda.*\n  TO 'admin'@'localhost'\n  WITH GRANT OPTION;" },
            { cmd: 'GRANT por columna', desc: 'Restricción a columnas específicas.', example: "GRANT SELECT (id, nombre, email)\n  ON tienda.usuarios\n  TO 'lectura_parcial'@'%';", engines: ['mysql', 'postgres'] },
            { cmd: 'FLUSH PRIVILEGES', desc: 'Recarga la tabla de permisos en memoria (MySQL).', example: 'FLUSH PRIVILEGES;', engines: ['mysql'] },
        ]
    },
    {
        id: 's-revoke', title: 'REVOKE — Revocar Privilegios', icon: '❌', type: 'security',
        description: 'Retira permisos previamente otorgados. Si el usuario tenía WITH GRANT OPTION, también se revocan los permisos que ese usuario haya delegado a otros.',
        commands: [
            { cmd: 'REVOKE', desc: 'Quita un permiso específico.', example: "REVOKE INSERT ON tienda.pedidos FROM 'app_user'@'localhost';" },
            { cmd: 'REVOKE ALL PRIVILEGES', desc: 'Quita todos los permisos sobre el objeto.', example: "REVOKE ALL PRIVILEGES ON tienda.*\n  FROM 'ex_empleado'@'%';" },
            { cmd: 'REVOKE GRANT OPTION', desc: 'Solo quita la capacidad de delegar (PostgreSQL).', example: "REVOKE GRANT OPTION FOR SELECT\n  ON tienda.*\n  FROM 'supervisor';", engines: ['postgres'] },
        ]
    },
    {
        id: 's-roles', title: 'Gestión de Roles', icon: '🎭', type: 'security',
        description: 'Los roles agrupan permisos reutilizables. Al modificar un rol afectas a todos sus miembros. Patrón recomendado: roles por función (lector, editor, admin), no permisos directos sobre usuarios.',
        tip: 'Crea roles con nombres descriptivos del negocio: ventas_lector, contabilidad_editor, sistema_admin.',
        commands: [
            { cmd: 'CREATE ROLE', desc: 'Crea roles vacíos con función específica.', example: 'CREATE ROLE lector;\nCREATE ROLE editor;\nCREATE ROLE administrador;' },
            { cmd: 'GRANT permisos al rol', desc: 'Define qué puede hacer cada rol.', example: 'GRANT SELECT ON tienda.* TO lector;\nGRANT SELECT, INSERT, UPDATE ON tienda.* TO editor;\nGRANT ALL PRIVILEGES ON tienda.* TO administrador;' },
            { cmd: 'GRANT rol al usuario', desc: 'Asigna uno o varios roles a un usuario.', example: 'GRANT lector TO usuario_reportes;\nGRANT editor TO usuario_app;\nGRANT lector, editor TO usuario_mixto;' },
            { cmd: 'REVOKE / DROP ROLE', desc: 'Quita el rol o lo elimina del sistema.', example: 'REVOKE editor FROM usuario_app;\nDROP ROLE IF EXISTS lector;' },
        ]
    },

    /* ── NIVELES DE AISLAMIENTO ─────────────────────────────────────────────── */
    {
        id: 'i-read-uncommitted', title: 'READ UNCOMMITTED', icon: '👁️', type: 'isolation',
        description: 'Nivel más bajo. Permite leer datos no confirmados de otras transacciones (dirty read). Una transacción puede tomar decisiones basadas en datos que luego desaparecen con un ROLLBACK.',
        tip: '⚠️ Casi nunca se usa en producción. Solo para reportes aproximados donde la velocidad supera la necesidad de precisión.',
        commands: [
            { cmd: 'SET ISOLATION LEVEL', desc: 'Activa el nivel de mínimo aislamiento.', example: 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;\nBEGIN;\n  -- Puede leer precio=50 aunque otra TX aún no hizo COMMIT\n  SELECT precio FROM productos WHERE id = 1;\nCOMMIT;' },
        ]
    },
    {
        id: 'i-read-committed', title: 'READ COMMITTED', icon: '✔️', type: 'isolation',
        description: 'Solo lee datos ya confirmados. Evita dirty reads pero permite non-repeatable reads: el mismo SELECT puede devolver resultados distintos dentro de la misma transacción si otra TX confirma cambios entre medio.',
        tip: 'Nivel por defecto en PostgreSQL y SQL Server. Buen balance para la mayoría de aplicaciones web.',
        commands: [
            { cmd: 'SET ISOLATION LEVEL', desc: 'Default en PostgreSQL y SQL Server.', example: 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED;\nBEGIN;\n  SELECT precio FROM productos WHERE id = 1;  -- 100\n  -- Otra TX actualiza precio a 120 y hace COMMIT\n  SELECT precio FROM productos WHERE id = 1;  -- 120 ← non-repeatable read\nCOMMIT;' },
        ]
    },
    {
        id: 'i-repeatable-read', title: 'REPEATABLE READ', icon: '🔁', type: 'isolation',
        description: 'Garantiza que si lees una fila, siempre obtendrás el mismo valor dentro de la transacción. Evita dirty y non-repeatable reads. MySQL/InnoDB lo implementa con MVCC eliminando además los phantom reads.',
        tip: 'Nivel por defecto en MySQL/InnoDB. Usa snapshots para dar lecturas consistentes sin bloquear escrituras.',
        commands: [
            { cmd: 'SET ISOLATION LEVEL', desc: 'Default en MySQL. Lecturas estables en la TX.', example: 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\nBEGIN;\n  SELECT precio FROM productos WHERE id = 1;  -- 100\n  -- Otra TX actualiza precio a 120 → esta TX sigue viendo 100\n  SELECT precio FROM productos WHERE id = 1;  -- 100 (consistente)\nCOMMIT;' },
        ]
    },
    {
        id: 'i-serializable', title: 'SERIALIZABLE', icon: '🔒', type: 'isolation',
        description: 'Máximo aislamiento. Las transacciones se comportan como si fueran estrictamente secuenciales. Elimina todos los fenómenos de concurrencia. Ideal para operaciones donde la integridad es crítica.',
        tip: 'Úsalo para transferencias bancarias, reservas únicas, inventario exacto. El costo en rendimiento es significativo.',
        commands: [
            { cmd: 'SET ISOLATION LEVEL', desc: 'Máximo aislamiento. TX concurrentes se serializan.', example: 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\nBEGIN;\n  -- Verifica y reserva el último asiento disponible\n  SELECT COUNT(*) FROM asientos\n    WHERE vuelo_id = 99 AND estado = \'libre\';  -- 1\n  UPDATE asientos SET estado = \'reservado\'\n    WHERE vuelo_id = 99 AND estado = \'libre\' LIMIT 1;\nCOMMIT;\n-- Si dos TX hacen esto simultáneamente → una falla automáticamente' },
        ]
    },

    /* ── BLOQUEOS ─────────────────────────────────────────────────────────── */
    {
        id: 'l-select-for-update', title: 'SELECT FOR UPDATE', icon: '🔐', type: 'lock',
        description: 'Bloqueo pesimista a nivel de fila. Bloquea las filas seleccionadas para que ninguna otra transacción pueda modificarlas hasta que la actual haga COMMIT o ROLLBACK.',
        tip: 'Patrón clásico para reservas y saldos: lee y bloquea en un paso para evitar condiciones de carrera.',
        commands: [
            { cmd: 'FOR UPDATE', desc: 'Bloquea filas para escritura exclusiva.', example: 'BEGIN;\n  SELECT saldo FROM cuentas\n  WHERE id = 1\n  FOR UPDATE;  -- nadie más puede modificar esta fila\n\n  UPDATE cuentas\n  SET saldo = saldo - 200\n  WHERE id = 1;\nCOMMIT;' },
            { cmd: 'SKIP LOCKED', desc: 'Salta filas bloqueadas — ideal para colas de trabajo.', example: 'SELECT * FROM tareas\nWHERE estado = \'pendiente\'\nFOR UPDATE SKIP LOCKED\nLIMIT 1;\n-- Múltiples workers procesan la cola sin conflictos', engines: ['postgres', 'mysql'] },
            { cmd: 'NOWAIT', desc: 'Falla inmediatamente si la fila está bloqueada.', example: 'SELECT * FROM reservas\nWHERE id = 5\nFOR UPDATE NOWAIT;\n-- ERROR si otra TX tiene el bloqueo → falla rápido', engines: ['postgres', 'mysql'] },
        ]
    },
    {
        id: 'l-lock-table', title: 'LOCK TABLE', icon: '🚫', type: 'lock',
        description: 'Bloquea una tabla completa. Útil para migraciones, mantenimientos o cargas masivas donde necesitas exclusividad total. En producción puede degradar seriamente el rendimiento.',
        tip: '⚠️ Prefiere SELECT FOR UPDATE cuando sea posible. LOCK TABLE es un arma de último recurso.',
        commands: [
            { cmd: 'LOCK TABLE (PostgreSQL)', desc: 'Bloqueo con modo explícito.', example: 'BEGIN;\n  LOCK TABLE productos IN EXCLUSIVE MODE;\n  -- carga masiva o migración\n  COPY productos FROM \'/tmp/nuevos.csv\' CSV;\nCOMMIT;', engines: ['postgres'] },
            { cmd: 'LOCK TABLES (MySQL)', desc: 'Bloqueo explícito de lectura/escritura.', example: 'LOCK TABLES productos WRITE, clientes READ;\n-- operaciones que requieren exclusividad\nUNLOCK TABLES;', engines: ['mysql'] },
            { cmd: 'WITH (TABLOCKX) (SQL Server)', desc: 'Table lock hint en SQL Server.', example: 'SELECT * FROM productos WITH (TABLOCKX);\n-- o en UPDATE:\nUPDATE productos WITH (TABLOCKX)\nSET precio = precio * 1.1;', engines: ['sqlserver'] },
        ]
    },

    /* ── ERRORES COMUNES ─────────────────────────────────────────────────── */
    {
        id: 'e-deadlock', title: 'Deadlock (Interbloqueo)', icon: '💀', type: 'error',
        description: 'Dos o más transacciones se bloquean mutuamente esperando un recurso que la otra retiene. El motor detecta el ciclo y termina la transacción con menor costo de rollback.',
        tip: '✅ Solución: accede siempre a tablas y filas en el mismo orden desde todas las transacciones.',
        commands: [
            { cmd: 'Escenario', desc: 'TX-A y TX-B se esperan mutuamente.', example: '-- TX-A:                        -- TX-B:\nBEGIN;                         BEGIN;\nUPDATE cuentas                 UPDATE cuentas\n  SET saldo = saldo-100           SET saldo = saldo+100\n  WHERE id = 1; -- BLOQUEA        WHERE id = 2; -- BLOQUEA\n\nUPDATE cuentas  -- ESPERA...   UPDATE cuentas  -- ESPERA...\n  SET saldo = saldo+100           SET saldo = saldo-100\n  WHERE id = 2;                   WHERE id = 1;\n-- Motor detecta ciclo → mata la TX de menor costo' },
            { cmd: 'Prevención', desc: 'Mismo orden de acceso en todas las TX.', example: '-- Regla: siempre id=1 primero, luego id=2\nBEGIN;\n  UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;\n  UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;\nCOMMIT; -- nunca deadlock con este orden' },
        ]
    },
    {
        id: 'e-dirty-read', title: 'Dirty Read', icon: '🫧', type: 'error',
        description: 'Una transacción lee datos modificados por otra que aún no confirmó. Si esa otra hace ROLLBACK, la primera tomó decisiones basadas en datos que nunca existieron en la BD.',
        tip: '✅ Solución: usar READ COMMITTED o superior como nivel de aislamiento.',
        commands: [
            { cmd: 'Escenario', desc: 'TX-B lee datos fantasma de TX-A.', example: '-- TX-A:                     -- TX-B (READ UNCOMMITTED):\nBEGIN;                        BEGIN;\nUPDATE productos              SELECT precio\n  SET precio = 50               FROM productos\n  WHERE id = 1;                 WHERE id = 1; -- Lee 50!\n                              -- Toma decisión basada en 50\nROLLBACK; -- nunca fue 50    COMMIT; -- decisión incorrecta' },
        ]
    },
    {
        id: 'e-phantom', title: 'Phantom Read', icon: '👻', type: 'error',
        description: 'Una transacción ejecuta la misma consulta dos veces y obtiene filas diferentes porque otra transacción insertó o eliminó filas que coinciden con la condición WHERE.',
        tip: '✅ Solución: SERIALIZABLE, o REPEATABLE READ con InnoDB (MySQL previene phantoms via MVCC).',
        commands: [
            { cmd: 'Escenario', desc: 'Nuevas filas aparecen entre dos SELECTs.', example: '-- TX-A:                     -- TX-B:\nBEGIN;                        BEGIN;\nSELECT COUNT(*)               INSERT INTO pedidos\n  FROM pedidos                  VALUES (4, \'nuevo\', ...);\n  WHERE estado = \'nuevo\';\n  -- Resultado: 3              COMMIT;\n\nSELECT COUNT(*)\n  FROM pedidos\n  WHERE estado = \'nuevo\';\n  -- Resultado: 4 ← PHANTOM\nCOMMIT;' },
        ]
    },
    {
        id: 'e-lost-update', title: 'Lost Update', icon: '🕳️', type: 'error',
        description: 'Dos transacciones leen el mismo valor, lo modifican independientemente y lo guardan. La segunda escritura sobreescribe la primera sin saber de sus cambios, perdiendo trabajo.',
        tip: '✅ Solución: SELECT FOR UPDATE (pesimista) o campo version con control optimista.',
        commands: [
            { cmd: 'Escenario', desc: 'TX-B sobreescribe los cambios de TX-A.', example: '-- TX-A lee stock=10       -- TX-B lee stock=10\n-- TX-A calcula 10 - 3 = 7  -- TX-B calcula 10 - 5 = 5\n-- TX-A escribe stock = 7   -- TX-B escribe stock = 5\n--                          -- Los -3 de TX-A se perdieron!' },
            { cmd: 'Fix optimista', desc: 'Columna version — falla si alguien más actualizó.', example: '-- Leer con versión actual\nSELECT stock, version FROM productos WHERE id = 1;\n-- → stock=10, version=4\n\n-- Actualizar solo si la versión no cambió\nUPDATE productos\n  SET stock = 7, version = version + 1\nWHERE id = 1 AND version = 4;\n\n-- Si rowsAffected = 0 → conflicto, reintentar' },
        ]
    },
]

const ENGINE_ROWS: EngineRow[] = [
    { feature: 'Transacciones ACID', mysql: '✅ InnoDB', postgres: '✅ Nativo', sqlite: '✅ Nativo', sqlserver: '✅ Nativo' },
    { feature: 'Nivel aislamiento default', mysql: 'REPEATABLE READ', postgres: 'READ COMMITTED', sqlite: 'SERIALIZABLE', sqlserver: 'READ COMMITTED' },
    { feature: 'SAVEPOINTS', mysql: '✅', postgres: '✅', sqlite: '✅', sqlserver: '✅ SAVE TRAN' },
    { feature: 'SELECT FOR UPDATE', mysql: '✅', postgres: '✅ + SKIP LOCKED', sqlite: '⚠️ Bloquea BD', sqlserver: '✅ UPDLOCK' },
    { feature: 'Roles', mysql: '✅ MySQL 8+', postgres: '✅ Nativo', sqlite: '❌', sqlserver: '✅ Nativo' },
    { feature: 'Row-Level Locking', mysql: '✅ InnoDB', postgres: '✅', sqlite: '❌ Solo tabla', sqlserver: '✅' },
    { feature: 'MVCC', mysql: '✅ InnoDB', postgres: '✅', sqlite: '✅ WAL mode', sqlserver: '⚠️ Con RCSI' },
    { feature: 'DDL transaccional', mysql: '❌ Auto-commit', postgres: '✅', sqlite: '✅', sqlserver: '✅' },
    { feature: 'GRANT por columna', mysql: '✅', postgres: '✅', sqlite: '❌', sqlserver: '✅' },
]

const ISOLATION_MATRIX = [
    { level: 'READ UNCOMMITTED', dirty: true, nonRepeatable: true, phantom: true, default: '' },
    { level: 'READ COMMITTED', dirty: false, nonRepeatable: true, phantom: true, default: 'PostgreSQL · SQL Server' },
    { level: 'REPEATABLE READ', dirty: false, nonRepeatable: false, phantom: true, default: 'MySQL (InnoDB evita phantoms)' },
    { level: 'SERIALIZABLE', dirty: false, nonRepeatable: false, phantom: false, default: 'SQLite' },
]

// ─── Sub-sections ────────────────────────────────────────────────────────────

type Section = 'all' | 'transaction' | 'security' | 'isolation' | 'lock' | 'error' | 'engines' | 'diagram'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
    { id: 'all', label: 'Todo', icon: '📚' },
    { id: 'transaction', label: 'Transacciones', icon: '⏱️' },
    { id: 'security', label: 'Seguridad', icon: '🔐' },
    { id: 'isolation', label: 'Aislamiento', icon: '🧱' },
    { id: 'lock', label: 'Bloqueos', icon: '🔒' },
    { id: 'error', label: 'Errores', icon: '⚠️' },
    { id: 'engines', label: 'Motores', icon: '⚙️' },
    { id: 'diagram', label: 'Diagrama TX', icon: '🗺️' },
]

const TYPE_BADGE: Record<string, string> = {
    transaction: 'badge-transaction', security: 'badge-security',
    isolation: 'badge-isolation', lock: 'badge-lock', error: 'badge-error',
}
const TYPE_LABEL: Record<string, string> = {
    transaction: 'Transacción', security: 'Seguridad',
    isolation: 'Aislamiento', lock: 'Bloqueo', error: 'Error común',
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            className="copy-btn"
            title="Copiar"
            onClick={() => {
                navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
            }}
        >
            {copied ? '✅' : '📋'}
        </button>
    )
}

// ─── IsolationMatrix ─────────────────────────────────────────────────────────

function IsolationMatrix() {
    return (
        <div className="isolation-matrix">
            <h3>🧱 Matriz de Fenómenos por Nivel de Aislamiento</h3>
            <p>Cada nivel elimina ciertos problemas de concurrencia a cambio de mayor costo en rendimiento.</p>
            <div className="isolation-table-wrap">
                <table className="isolation-table">
                    <thead>
                        <tr>
                            <th>Nivel</th>
                            <th>Dirty Read</th>
                            <th>Non-Repeatable</th>
                            <th>Phantom Read</th>
                            <th>Default en</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ISOLATION_MATRIX.map(r => (
                            <tr key={r.level}>
                                <td>{r.level}</td>
                                <td className={r.dirty ? 'bad' : 'ok'}>{r.dirty ? '❌ Posible' : '✅ Evitado'}</td>
                                <td className={r.nonRepeatable ? 'bad' : 'ok'}>{r.nonRepeatable ? '❌ Posible' : '✅ Evitado'}</td>
                                <td className={r.phantom ? 'bad' : 'ok'}>{r.phantom ? '❌ Posible' : '✅ Evitado'}</td>
                                <td style={{ color: '#888', fontSize: '0.78rem' }}>{r.default || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── EnginesTable ────────────────────────────────────────────────────────────

function EnginesTable() {
    return (
        <div className="engines-section">
            <h3>⚙️ Comparativa de Motores SQL</h3>
            <p>Diferencias clave en soporte de transacciones, seguridad y bloqueos entre los cuatro motores principales.</p>
            <div className="engines-table-wrap">
                <table className="engines-table">
                    <thead>
                        <tr>
                            <th>Característica</th>
                            <th><span className="engine-badge mysql">MySQL</span></th>
                            <th><span className="engine-badge postgres">PostgreSQL</span></th>
                            <th><span className="engine-badge sqlite">SQLite</span></th>
                            <th><span className="engine-badge sqlserver">SQL Server</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ENGINE_ROWS.map((r, i) => (
                            <tr key={i}>
                                <td className="feature-col">{r.feature}</td>
                                <td>{r.mysql}</td>
                                <td>{r.postgres}</td>
                                <td>{r.sqlite}</td>
                                <td>{r.sqlserver}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── TransactionDiagram ──────────────────────────────────────────────────────

function TransactionDiagram() {
    const [step, setStep] = useState(0)
    const [outcome, setOutcome] = useState<'commit' | 'rollback' | null>(null)

    const reset = () => { setStep(0); setOutcome(null) }

    return (
        <div className="tx-diagram">
            <h3>🗺️ Flujo de una Transacción</h3>
            <p className="diagram-subtitle">Avanza paso a paso para ver el ciclo de vida completo de una transacción.</p>

            <div className="diagram-flow">
                {/* BEGIN */}
                <div className={`diagram-node ${step >= 0 ? 'active' : ''}`} style={{ borderColor: step >= 0 ? '#FCA048' : '#333' }}>
                    <span className="dnode-icon">🏁</span>
                    <strong>BEGIN</strong>
                    <span>Abre la transacción</span>
                    {step >= 0 && <code className="diagram-code">Buffer temporal activo</code>}
                </div>

                <div className={`diagram-arrow ${step >= 1 ? 'active' : ''}`}>↓</div>

                {/* Operaciones */}
                <div className={`diagram-node ${step >= 1 ? 'active' : ''}`} style={{ borderColor: step >= 1 ? '#63b3ed' : '#333' }}>
                    <span className="dnode-icon">⚡</span>
                    <strong>Operaciones SQL</strong>
                    <span>INSERT · UPDATE · DELETE</span>
                    {step >= 1 && <code className="diagram-code">Cambios visibles solo en esta sesión</code>}
                </div>

                <div className={`diagram-arrow ${step >= 2 ? 'active' : ''}`}>↓</div>

                {/* Decisión */}
                <div className={`diagram-node decision ${step >= 2 ? 'active' : ''}`} style={{ borderColor: step >= 2 ? '#FCA048' : '#333' }}>
                    <span className="dnode-icon">❓</span>
                    <strong>¿Todo correcto?</strong>
                </div>

                {/* Branches */}
                {step >= 2 && (
                    <div className="diagram-branches">
                        <div className="branch">
                            <div className={`diagram-arrow ${outcome === 'commit' ? 'active' : ''}`}>↙ Sí</div>
                            <div
                                className={`diagram-node outcome commit ${outcome === 'commit' ? 'active glow-commit' : ''}`}
                                onClick={() => !outcome && setOutcome('commit')}
                                style={{ borderColor: outcome === 'commit' ? '#48bb78' : '#333', cursor: outcome ? 'default' : 'pointer' }}
                            >
                                <span className="dnode-icon">💾</span>
                                <strong>COMMIT</strong>
                                <span>Cambios en disco</span>
                                {outcome === 'commit' && <code className="diagram-code">✅ Transacción confirmada</code>}
                            </div>
                        </div>

                        <div className="branch">
                            <div className={`diagram-arrow ${outcome === 'rollback' ? 'active' : ''}`}>↘ No</div>
                            <div
                                className={`diagram-node outcome rollback ${outcome === 'rollback' ? 'active glow-rollback' : ''}`}
                                onClick={() => !outcome && setOutcome('rollback')}
                                style={{ borderColor: outcome === 'rollback' ? '#e53e3e' : '#333', cursor: outcome ? 'default' : 'pointer' }}
                            >
                                <span className="dnode-icon">⏪</span>
                                <strong>ROLLBACK</strong>
                                <span>Buffer descartado</span>
                                {outcome === 'rollback' && <code className="diagram-code">↩️ Estado restaurado</code>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Controles */}
            <div className="diagram-controls">
                {step < 2 && (
                    <button className="diag-btn next" onClick={() => setStep(s => s + 1)}>
                        Siguiente paso →
                    </button>
                )}
                {step === 2 && !outcome && (
                    <p className="diagram-hint">👆 Haz clic en COMMIT o ROLLBACK para ver el resultado</p>
                )}
                {outcome && (
                    <button className="diag-btn reset" onClick={reset}>↺ Reiniciar diagrama</button>
                )}
            </div>

            {/* ACID */}
            <div className="acid-box">
                <h4>📐 Propiedades ACID</h4>
                <div className="acid-grid">
                    {[
                        { l: 'A', t: 'Atomicidad', d: 'Todo o nada. Si falla una operación, se revierte todo el bloque.' },
                        { l: 'C', t: 'Consistencia', d: 'La BD siempre pasa de un estado válido a otro estado válido.' },
                        { l: 'I', t: 'Aislamiento', d: 'Las transacciones concurrentes no se interfieren entre sí.' },
                        { l: 'D', t: 'Durabilidad', d: 'Un COMMIT sobrevive a reinicios y fallos del sistema.' },
                    ].map(({ l, t, d }) => (
                        <div className="acid-item" key={l}>
                            <span className="acid-letter">{l}</span>
                            <div><strong>{t}</strong><p>{d}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DatabaseSecurity() {
    const [section, setSection] = useState<Section>('all')
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const toggle = (id: string) =>
        setExpanded(prev => ({ ...prev, [id]: prev[id] === false }))

    const showTopics = section !== 'diagram' && section !== 'engines'
    const showEngines = section === 'engines' || section === 'all'
    const showDiagram = section === 'diagram' || section === 'all'
    const showMatrix = section === 'isolation' || section === 'all'

    const filtered = TOPICS.filter(t => {
        const matchSection = section === 'all' || section === 'engines' || section === 'diagram' || t.type === section
        const q = search.toLowerCase()
        const matchSearch = !search ||
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.commands.some(c => c.cmd.toLowerCase().includes(q) || c.example.toLowerCase().includes(q))
        return matchSection && matchSearch
    })

    return (
        <div className="security-container">

            {/* Header */}
            <div className="security-header">
                <h2>🔐 Seguridad y Transacciones SQL</h2>
                <p>
                    Referencia completa de transacciones, permisos, niveles de aislamiento,
                    bloqueos y errores de concurrencia en los principales motores SQL.
                </p>

                <div className="security-search">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Buscar comando, concepto o ejemplo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="search-clear" onClick={() => setSearch('')}>✕</button>
                    )}
                </div>

                <div className="security-filters">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            className={`filter-btn ${section === s.id ? 'active' : ''}`}
                            onClick={() => { setSection(s.id); setSearch('') }}
                        >
                            {s.icon} {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Diagrama */}
            {showDiagram && <TransactionDiagram />}

            {/* Matriz de aislamiento */}
            {showMatrix && <IsolationMatrix />}

            {/* Tabla de motores */}
            {showEngines && <EnginesTable />}

            {/* Cards */}
            {showTopics && (
                <div className="security-grid">
                    {filtered.length === 0 && (
                        <div className="no-results">
                            No hay resultados para "<strong>{search}</strong>"
                        </div>
                    )}

                    {filtered.map(topic => {
                        const isOpen = expanded[topic.id] !== false
                        return (
                            <div
                                key={topic.id}
                                className={`topic-card ${topic.type}`}
                            >
                                {/* Header colapsable */}
                                <div className="topic-header" onClick={() => toggle(topic.id)}>
                                    <div className="topic-icon">{topic.icon}</div>
                                    <h3>{topic.title}</h3>
                                    <span className={`topic-badge ${TYPE_BADGE[topic.type]}`}>
                                        {TYPE_LABEL[topic.type]}
                                    </span>
                                    <span className="topic-toggle">{isOpen ? '▲' : '▼'}</span>
                                </div>

                                {isOpen && (
                                    <>
                                        <p className="topic-desc">{topic.description}</p>
                                        {topic.tip && <div className="topic-tip">💡 {topic.tip}</div>}

                                        <div className="topic-commands">
                                            {topic.commands.map((cmd, i) => (
                                                <div key={i} className="sc-command-item">
                                                    <div className="scc-header">
                                                        <code>{cmd.cmd}</code>
                                                        <span className="scc-desc">{cmd.desc}</span>
                                                        {cmd.engines && (
                                                            <div className="cmd-engines">
                                                                {cmd.engines.map(e => (
                                                                    <span key={e} className={`engine-badge sm ${e}`}>{e}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="scc-example-wrap">
                                                        <pre className="scc-example">{cmd.example}</pre>
                                                        <CopyButton text={cmd.example} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}