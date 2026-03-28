// ─────────────────────────────────────────────
//  SQL Commands — Multi-engine reference
//  Motores cubiertos: MySQL, PostgreSQL, SQL Server, SQLite, Oracle, MariaDB, DB2
// ─────────────────────────────────────────────

export type SqlEngine =
    | 'MySQL'
    | 'PostgreSQL'
    | 'SQLServer'
    | 'SQLite'
    | 'Oracle'
    | 'MariaDB'
    | 'DB2';

export interface EngineVariant {
    /** Motores donde aplica esta variante */
    engines: SqlEngine[];
    /** Sintaxis específica del motor */
    syntax: string;
    /** Ejemplo ejecutable en ese motor */
    example: string;
    /** Nota aclaratoria opcional */
    note?: string;
}

export interface SqlCommandInfo {
    command: string;
    category: string;
    description: string;
    /** Sintaxis estándar ANSI (funciona en la mayoría de motores) */
    usage: string;
    /** Ejemplo estándar */
    example: string;
    /**
     * Variantes específicas por motor.
     * Solo se incluye cuando la sintaxis difiere del estándar.
     */
    motorVariants?: EngineVariant[];
}

export const SQL_COMMANDS: SqlCommandInfo[] = [

    // ── DML ──────────────────────────────────────────────────────────────────

    {
        command: 'SELECT',
        category: 'DML',
        description: 'Selecciona datos de una base de datos. Los datos devueltos se almacenan en una tabla de resultados llamada conjunto de resultados.',
        usage: 'SELECT columna1, columna2 FROM nombre_tabla;',
        example: 'SELECT id, nombre, email FROM usuarios;',
    },
    {
        command: 'INSERT INTO',
        category: 'DML',
        description: 'Inserta nuevos registros en una tabla.',
        usage: 'INSERT INTO tabla (col1, col2) VALUES (valor1, valor2);',
        example: "INSERT INTO usuarios (nombre, email) VALUES ('Juan', 'juan@example.com');",
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'INSERT INTO tabla (col1, col2) VALUES (v1, v2) RETURNING *;',
                example: "INSERT INTO usuarios (nombre, email) VALUES ('Ana', 'ana@mail.com') RETURNING id, nombre;",
                note: 'RETURNING devuelve las filas insertadas sin necesidad de un SELECT posterior.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'INSERT INTO tabla (col1, col2) VALUES (v1, v2) ON DUPLICATE KEY UPDATE col1 = v1;',
                example: "INSERT INTO usuarios (id, email) VALUES (1, 'nuevo@mail.com') ON DUPLICATE KEY UPDATE email = 'nuevo@mail.com';",
                note: 'ON DUPLICATE KEY UPDATE actualiza si hay conflicto de clave única.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'INSERT INTO tabla (col1, col2) OUTPUT INSERTED.* VALUES (v1, v2);',
                example: "INSERT INTO usuarios (nombre, email) OUTPUT INSERTED.id, INSERTED.nombre VALUES ('Luis', 'luis@mail.com');",
                note: 'OUTPUT es el equivalente de RETURNING en SQL Server.',
            },
            {
                engines: ['Oracle'],
                syntax: 'INSERT INTO tabla (col1, col2) VALUES (v1, v2) RETURNING col1 INTO :variable;',
                example: "INSERT INTO usuarios (nombre) VALUES ('María') RETURNING id INTO :nuevo_id;",
                note: 'Requiere variable de bind (:variable) para recibir el valor retornado.',
            },
        ],
    },
    {
        command: 'UPDATE',
        category: 'DML',
        description: 'Modifica registros existentes en una tabla.',
        usage: 'UPDATE tabla SET col1 = valor1 WHERE condicion;',
        example: "UPDATE usuarios SET email = 'nuevo@ejemplo.com' WHERE id = 1;",
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'UPDATE tabla SET col = val WHERE cond RETURNING *;',
                example: "UPDATE usuarios SET activo = true WHERE id = 5 RETURNING id, activo;",
                note: 'RETURNING disponible igual que en INSERT.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'UPDATE tabla SET col = val OUTPUT DELETED.col, INSERTED.col WHERE cond;',
                example: 'UPDATE productos SET precio = precio * 1.1 OUTPUT DELETED.precio AS precio_viejo, INSERTED.precio AS precio_nuevo WHERE cat_id = 3;',
                note: 'OUTPUT puede acceder tanto al valor anterior (DELETED) como al nuevo (INSERTED).',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'UPDATE tabla1 JOIN tabla2 ON cond SET tabla1.col = val WHERE cond2;',
                example: 'UPDATE pedidos p JOIN clientes c ON p.cliente_id = c.id SET p.descuento = 10 WHERE c.tipo = \'VIP\';',
                note: 'MySQL permite hacer UPDATE con JOIN directamente.',
            },
        ],
    },
    {
        command: 'DELETE',
        category: 'DML',
        description: 'Elimina registros existentes en una tabla.',
        usage: 'DELETE FROM tabla WHERE condicion;',
        example: 'DELETE FROM usuarios WHERE estado = 0;',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'DELETE FROM tabla WHERE cond RETURNING *;',
                example: 'DELETE FROM sesiones WHERE expiracion < NOW() RETURNING id;',
            },
            {
                engines: ['SQLServer'],
                syntax: 'DELETE FROM tabla OUTPUT DELETED.* WHERE cond;',
                example: 'DELETE FROM logs OUTPUT DELETED.id, DELETED.fecha WHERE fecha < \'2023-01-01\';',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'DELETE tabla1 FROM tabla1 JOIN tabla2 ON cond WHERE cond2;',
                example: 'DELETE p FROM pedidos p JOIN clientes c ON p.cliente_id = c.id WHERE c.bloqueado = 1;',
                note: 'Permite DELETE con JOIN en MySQL.',
            },
            {
                engines: ['Oracle'],
                syntax: 'DELETE FROM tabla WHERE cond RETURNING col INTO :var;',
                example: "DELETE FROM tokens WHERE expiracion < SYSDATE RETURNING id INTO :ids_borrados;",
            },
        ],
    },
    {
        command: 'MERGE',
        category: 'DML',
        description: 'Combina INSERT, UPDATE y DELETE en una sola operación según si el registro existe o no (Upsert).',
        usage: 'MERGE INTO destino USING origen ON (cond) WHEN MATCHED THEN UPDATE... WHEN NOT MATCHED THEN INSERT...;',
        example: `MERGE INTO empleados AS dest
USING nuevos_datos AS src ON dest.id = src.id
WHEN MATCHED THEN UPDATE SET dest.salario = src.salario
WHEN NOT MATCHED THEN INSERT (id, nombre, salario) VALUES (src.id, src.nombre, src.salario);`,
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'INSERT INTO tabla (cols) VALUES (vals) ON DUPLICATE KEY UPDATE col = val;',
                example: "INSERT INTO empleados (id, salario) VALUES (1, 5000) ON DUPLICATE KEY UPDATE salario = 5000;",
                note: 'MySQL no soporta MERGE. La alternativa es ON DUPLICATE KEY UPDATE.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'INSERT INTO tabla (cols) VALUES (vals) ON CONFLICT (col) DO UPDATE SET col = EXCLUDED.col;',
                example: "INSERT INTO empleados (id, salario) VALUES (1, 5000) ON CONFLICT (id) DO UPDATE SET salario = EXCLUDED.salario;",
                note: 'PostgreSQL usa ON CONFLICT (disponible desde v9.5). Desde v15 también soporta MERGE estándar.',
            },
            {
                engines: ['SQLite'],
                syntax: 'INSERT OR REPLACE INTO tabla (cols) VALUES (vals);',
                example: 'INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (\'tema\', \'oscuro\');',
                note: 'SQLite no soporta MERGE. Usa INSERT OR REPLACE o INSERT OR IGNORE.',
            },
        ],
    },

    // ── DDL ──────────────────────────────────────────────────────────────────

    {
        command: 'CREATE TABLE',
        category: 'DDL',
        description: 'Crea una nueva tabla en la base de datos.',
        usage: 'CREATE TABLE tabla (col1 tipo, col2 tipo, ...);',
        example: 'CREATE TABLE clientes (id INT PRIMARY KEY, nombre VARCHAR(100));',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'CREATE TABLE tabla (id INT AUTO_INCREMENT PRIMARY KEY, ...) ENGINE=InnoDB;',
                example: 'CREATE TABLE pedidos (id INT AUTO_INCREMENT PRIMARY KEY, total DECIMAL(10,2)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
                note: 'AUTO_INCREMENT para IDs autoincrementales. ENGINE especifica el motor de almacenamiento.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'CREATE TABLE tabla (id SERIAL PRIMARY KEY, ...);',
                example: 'CREATE TABLE pedidos (id SERIAL PRIMARY KEY, total NUMERIC(10,2), datos JSONB);',
                note: 'SERIAL es equivalente a AUTO_INCREMENT. BIGSERIAL para IDs grandes. También soporta GENERATED ALWAYS AS IDENTITY (estándar SQL).',
            },
            {
                engines: ['SQLServer'],
                syntax: 'CREATE TABLE tabla (id INT IDENTITY(1,1) PRIMARY KEY, ...);',
                example: 'CREATE TABLE pedidos (id INT IDENTITY(1,1) PRIMARY KEY, total DECIMAL(10,2), fecha DATETIME2);',
                note: 'IDENTITY(semilla, incremento) es el equivalente de AUTO_INCREMENT.',
            },
            {
                engines: ['SQLite'],
                syntax: 'CREATE TABLE tabla (id INTEGER PRIMARY KEY AUTOINCREMENT, ...);',
                example: 'CREATE TABLE pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, total REAL);',
                note: 'SQLite usa tipado dinámico. INTEGER PRIMARY KEY activa el autoincremento automáticamente sin AUTOINCREMENT.',
            },
            {
                engines: ['Oracle'],
                syntax: 'CREATE TABLE tabla (id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ...);',
                example: 'CREATE TABLE pedidos (id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, total NUMBER(10,2));',
                note: 'Antes de Oracle 12c se usaban secuencias + triggers para autoincremento.',
            },
            {
                engines: ['DB2'],
                syntax: 'CREATE TABLE tabla (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, ...);',
                example: 'CREATE TABLE pedidos (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, total DECIMAL(10,2));',
            },
        ],
    },
    {
        command: 'ALTER TABLE',
        category: 'DDL',
        description: 'Agrega, elimina o modifica columnas en una tabla existente.',
        usage: 'ALTER TABLE tabla ADD columna tipo;',
        example: 'ALTER TABLE usuarios ADD fecha_registro DATE;',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'ALTER TABLE tabla MODIFY columna nuevo_tipo;',
                example: 'ALTER TABLE usuarios MODIFY nombre VARCHAR(200) NOT NULL;',
                note: 'MySQL usa MODIFY para cambiar tipo o restricciones de una columna existente.',
            },
            {
                engines: ['PostgreSQL', 'DB2'],
                syntax: 'ALTER TABLE tabla ALTER COLUMN columna TYPE nuevo_tipo;',
                example: 'ALTER TABLE usuarios ALTER COLUMN nombre TYPE VARCHAR(200);',
            },
            {
                engines: ['SQLServer'],
                syntax: 'ALTER TABLE tabla ALTER COLUMN columna nuevo_tipo;',
                example: 'ALTER TABLE usuarios ALTER COLUMN nombre NVARCHAR(200) NOT NULL;',
            },
            {
                engines: ['Oracle'],
                syntax: 'ALTER TABLE tabla MODIFY columna nuevo_tipo;',
                example: 'ALTER TABLE usuarios MODIFY nombre VARCHAR2(200) NOT NULL;',
            },
            {
                engines: ['SQLite'],
                syntax: 'ALTER TABLE tabla ADD COLUMN columna tipo;',
                example: 'ALTER TABLE usuarios ADD COLUMN fecha_registro TEXT;',
                note: 'SQLite solo soporta ADD COLUMN y RENAME. No permite DROP COLUMN ni MODIFY en versiones anteriores a 3.35.',
            },
        ],
    },
    {
        command: 'DROP TABLE',
        category: 'DDL',
        description: 'Elimina una tabla existente en la base de datos.',
        usage: 'DROP TABLE tabla;',
        example: 'DROP TABLE logs_antiguos;',
        motorVariants: [
            {
                engines: ['PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'DB2'],
                syntax: 'DROP TABLE IF EXISTS tabla;',
                example: 'DROP TABLE IF EXISTS logs_antiguos;',
                note: 'IF EXISTS evita el error si la tabla no existe. Estándar en la mayoría de motores.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'DROP TABLE tabla CASCADE;',
                example: 'DROP TABLE categorias CASCADE;',
                note: 'CASCADE elimina automáticamente las tablas dependientes y sus relaciones.',
            },
            {
                engines: ['Oracle'],
                syntax: 'DROP TABLE tabla PURGE;',
                example: 'DROP TABLE logs_antiguos PURGE;',
                note: 'Sin PURGE, Oracle mueve la tabla a la Papelera de reciclaje (RECYCLEBIN). PURGE la elimina definitivamente.',
            },
        ],
    },
    {
        command: 'CREATE INDEX',
        category: 'DDL',
        description: 'Crea un índice en una tabla para acelerar las consultas de búsqueda.',
        usage: 'CREATE INDEX nombre_idx ON tabla (columna);',
        example: 'CREATE INDEX idx_email ON usuarios (email);',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'CREATE INDEX CONCURRENTLY nombre_idx ON tabla (columna);',
                example: 'CREATE INDEX CONCURRENTLY idx_email ON usuarios (email);',
                note: 'CONCURRENTLY crea el índice sin bloquear escrituras en la tabla. Proceso más lento pero sin downtime.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'CREATE INDEX nombre_idx ON tabla USING GIN (columna_jsonb);',
                example: 'CREATE INDEX idx_metadata ON productos USING GIN (metadata);',
                note: 'PostgreSQL soporta índices GIN para JSONB y arrays, y GiST para datos geométricos y de texto completo.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'CREATE FULLTEXT INDEX nombre_idx ON tabla (columna);',
                example: 'CREATE FULLTEXT INDEX idx_descripcion ON productos (descripcion);',
                note: 'Índice FULLTEXT para búsquedas de texto completo con MATCH...AGAINST.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'CREATE COLUMNSTORE INDEX nombre_idx ON tabla (col1, col2);',
                example: 'CREATE COLUMNSTORE INDEX idx_ventas ON ventas (fecha, monto, region);',
                note: 'COLUMNSTORE es ideal para consultas analíticas sobre grandes volúmenes de datos.',
            },
            {
                engines: ['Oracle'],
                syntax: 'CREATE BITMAP INDEX nombre_idx ON tabla (columna);',
                example: 'CREATE BITMAP INDEX idx_estado ON pedidos (estado);',
                note: 'Índice BITMAP eficiente para columnas con baja cardinalidad (pocos valores distintos).',
            },
        ],
    },
    {
        command: 'CREATE VIEW',
        category: 'DDL',
        description: 'Crea una tabla virtual basada en el resultado de una consulta SQL.',
        usage: 'CREATE VIEW nombre_vista AS SELECT ...;',
        example: "CREATE VIEW VistaClientesBrasil AS SELECT * FROM clientes WHERE pais = 'Brasil';",
        motorVariants: [
            {
                engines: ['PostgreSQL', 'MySQL', 'MariaDB', 'SQLServer', 'Oracle', 'DB2'],
                syntax: 'CREATE OR REPLACE VIEW nombre_vista AS SELECT ...;',
                example: "CREATE OR REPLACE VIEW VistaClientesActivos AS SELECT * FROM clientes WHERE activo = 1;",
                note: 'OR REPLACE evita errores si la vista ya existe.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'CREATE MATERIALIZED VIEW nombre_vista AS SELECT ...;',
                example: 'CREATE MATERIALIZED VIEW resumen_ventas AS SELECT region, SUM(total) FROM ventas GROUP BY region;',
                note: 'Vista materializada: almacena físicamente los resultados. Requiere REFRESH MATERIALIZED VIEW para actualizar.',
            },
            {
                engines: ['Oracle'],
                syntax: 'CREATE MATERIALIZED VIEW nombre_vista REFRESH FAST ON COMMIT AS SELECT ...;',
                example: 'CREATE MATERIALIZED VIEW mv_ventas REFRESH FAST ON COMMIT AS SELECT region, SUM(total) FROM ventas GROUP BY region;',
                note: 'Oracle soporta vistas materializadas con diferentes modos de refresco: FAST, COMPLETE, FORCE.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'CREATE VIEW nombre_vista WITH SCHEMABINDING AS SELECT ...;',
                example: 'CREATE VIEW dbo.VentasPorRegion WITH SCHEMABINDING AS SELECT region, SUM(total) AS total FROM dbo.ventas GROUP BY region;',
                note: 'WITH SCHEMABINDING vincula la vista al esquema de las tablas base, necesario para índices sobre vistas.',
            },
        ],
    },

    // ── JOIN ─────────────────────────────────────────────────────────────────

    {
        command: 'INNER JOIN',
        category: 'JOIN',
        description: 'Devuelve registros que tienen valores coincidentes en ambas tablas.',
        usage: 'SELECT columnas FROM tabla1 INNER JOIN tabla2 ON tabla1.col = tabla2.col;',
        example: 'SELECT p.nombre, p.precio, c.nombre FROM productos p INNER JOIN categorias c ON p.cat_id = c.id;',
    },
    {
        command: 'LEFT JOIN',
        category: 'JOIN',
        description: 'Devuelve todos los registros de la tabla izquierda y los registros coincidentes de la tabla derecha.',
        usage: 'SELECT columnas FROM tabla1 LEFT JOIN tabla2 ON tabla1.col = tabla2.col;',
        example: 'SELECT c.nombre, p.fecha FROM clientes c LEFT JOIN pedidos p ON c.id = p.cliente_id;',
    },
    {
        command: 'RIGHT JOIN',
        category: 'JOIN',
        description: 'Devuelve todos los registros de la tabla derecha y los registros coincidentes de la tabla izquierda.',
        usage: 'SELECT columnas FROM tabla1 RIGHT JOIN tabla2 ON tabla1.col = tabla2.col;',
        example: 'SELECT e.nombre, d.nombre_depto FROM empleados e RIGHT JOIN departamentos d ON e.depto_id = d.id;',
        motorVariants: [
            {
                engines: ['SQLite'],
                syntax: 'SELECT columnas FROM tabla2 LEFT JOIN tabla1 ON tabla1.col = tabla2.col;',
                example: 'SELECT e.nombre, d.nombre_depto FROM departamentos d LEFT JOIN empleados e ON e.depto_id = d.id;',
                note: 'SQLite no soporta RIGHT JOIN ni FULL OUTER JOIN. Se simulan invirtiendo el orden de las tablas con LEFT JOIN.',
            },
        ],
    },
    {
        command: 'FULL OUTER JOIN',
        category: 'JOIN',
        description: 'Devuelve todos los registros cuando hay una coincidencia en la tabla izquierda o derecha.',
        usage: 'SELECT columnas FROM tabla1 FULL OUTER JOIN tabla2 ON tabla1.col = tabla2.col;',
        example: 'SELECT c.nombre, p.id FROM clientes c FULL OUTER JOIN pedidos p ON c.id = p.cliente_id;',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'SELECT ... FROM t1 LEFT JOIN t2 ON cond UNION SELECT ... FROM t1 RIGHT JOIN t2 ON cond;',
                example: `SELECT c.nombre, p.id FROM clientes c LEFT JOIN pedidos p ON c.id = p.cliente_id
UNION
SELECT c.nombre, p.id FROM clientes c RIGHT JOIN pedidos p ON c.id = p.cliente_id;`,
                note: 'MySQL no soporta FULL OUTER JOIN. Se simula con UNION de LEFT JOIN y RIGHT JOIN.',
            },
            {
                engines: ['SQLite'],
                syntax: 'SELECT ... FROM t1 LEFT JOIN t2 ON cond UNION SELECT ... FROM t2 LEFT JOIN t1 ON cond;',
                example: `SELECT c.nombre, p.id FROM clientes c LEFT JOIN pedidos p ON c.id = p.cliente_id
UNION
SELECT c.nombre, p.id FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id;`,
                note: 'SQLite tampoco soporta FULL OUTER JOIN. Misma técnica con UNION.',
            },
        ],
    },
    {
        command: 'CROSS JOIN',
        category: 'JOIN',
        description: 'Devuelve el producto cartesiano de dos tablas: todas las combinaciones posibles de filas.',
        usage: 'SELECT columnas FROM tabla1 CROSS JOIN tabla2;',
        example: 'SELECT t.talla, c.color FROM tallas t CROSS JOIN colores c;',
    },
    {
        command: 'SELF JOIN',
        category: 'JOIN',
        description: 'Une una tabla consigo misma usando alias. Útil para datos jerárquicos.',
        usage: 'SELECT a.col, b.col FROM tabla a JOIN tabla b ON a.col = b.col;',
        example: 'SELECT e.nombre AS empleado, j.nombre AS jefe FROM empleados e LEFT JOIN empleados j ON e.jefe_id = j.id;',
    },

    // ── Agregación ───────────────────────────────────────────────────────────

    {
        command: 'GROUP BY',
        category: 'Agregación',
        description: 'Agrupa filas con los mismos valores en filas de resumen.',
        usage: 'SELECT col_agrupar, COUNT(*) FROM tabla GROUP BY col_agrupar;',
        example: 'SELECT pais, COUNT(cliente_id) FROM clientes GROUP BY pais;',
        motorVariants: [
            {
                engines: ['PostgreSQL', 'SQLServer', 'Oracle', 'DB2'],
                syntax: 'SELECT col1, col2, SUM(val) FROM tabla GROUP BY ROLLUP(col1, col2);',
                example: 'SELECT region, producto, SUM(ventas) FROM ventas GROUP BY ROLLUP(region, producto);',
                note: 'ROLLUP genera subtotales por cada nivel de agrupación. CUBE genera todas las combinaciones posibles.',
            },
            {
                engines: ['PostgreSQL', 'SQLServer', 'Oracle', 'DB2'],
                syntax: 'SELECT col1, col2, SUM(val) FROM tabla GROUP BY GROUPING SETS((col1), (col2), ());',
                example: 'SELECT region, producto, SUM(ventas) FROM ventas GROUP BY GROUPING SETS((region), (producto), ());',
                note: 'GROUPING SETS permite definir explícitamente qué combinaciones de agrupación calcular.',
            },
        ],
    },
    {
        command: 'HAVING',
        category: 'Agregación',
        description: 'Filtra grupos después de aplicar GROUP BY. WHERE no puede usarse con funciones de agregación.',
        usage: 'SELECT col, COUNT(*) FROM tabla GROUP BY col HAVING COUNT(*) > valor;',
        example: 'SELECT pais, COUNT(cliente_id) FROM clientes GROUP BY pais HAVING COUNT(cliente_id) > 5;',
    },
    {
        command: 'Funciones de ventana (OVER)',
        category: 'Agregación',
        description: 'Realizan cálculos sobre un conjunto de filas relacionadas con la fila actual, sin colapsar las filas como GROUP BY.',
        usage: 'SELECT col, funcion() OVER (PARTITION BY col ORDER BY col) FROM tabla;',
        example: 'SELECT nombre, salario, AVG(salario) OVER (PARTITION BY depto_id) AS salario_promedio_depto FROM empleados;',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'Disponible desde MySQL 8.0 / MariaDB 10.2',
                example: 'SELECT nombre, salario, RANK() OVER (PARTITION BY depto_id ORDER BY salario DESC) AS ranking FROM empleados;',
                note: 'ROW_NUMBER(), RANK(), DENSE_RANK(), LAG(), LEAD(), SUM() OVER() disponibles desde MySQL 8.0.',
            },
            {
                engines: ['SQLite'],
                syntax: 'Disponible desde SQLite 3.25',
                example: 'SELECT nombre, salario, ROW_NUMBER() OVER (ORDER BY salario DESC) AS fila FROM empleados;',
                note: 'Soporta ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, FIRST_VALUE, LAST_VALUE, SUM/AVG OVER.',
            },
        ],
    },

    // ── Cláusulas ─────────────────────────────────────────────────────────────

    {
        command: 'ORDER BY',
        category: 'Cláusula',
        description: 'Ordena el conjunto de resultados en orden ascendente o descendente.',
        usage: 'SELECT columnas FROM tabla ORDER BY columna ASC|DESC;',
        example: 'SELECT nombre, edad FROM usuarios ORDER BY edad DESC;',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'SELECT columnas FROM tabla ORDER BY columna ASC NULLS LAST;',
                example: 'SELECT nombre, fecha_baja FROM empleados ORDER BY fecha_baja ASC NULLS LAST;',
                note: 'NULLS FIRST / NULLS LAST controla la posición de los valores NULL en el ordenamiento.',
            },
            {
                engines: ['Oracle'],
                syntax: 'SELECT columnas FROM tabla ORDER BY columna ASC NULLS LAST;',
                example: 'SELECT nombre, fecha_baja FROM empleados ORDER BY fecha_baja ASC NULLS LAST;',
                note: 'Oracle también soporta NULLS FIRST / NULLS LAST.',
            },
        ],
    },
    {
        command: 'WHERE',
        category: 'Cláusula',
        description: 'Filtra registros que cumplen una condición especificada.',
        usage: 'SELECT columnas FROM tabla WHERE condicion;',
        example: "SELECT * FROM productos WHERE precio > 50 AND categoria = 'Electrónicos';",
    },
    {
        command: 'LIMIT / TOP / FETCH FIRST',
        category: 'Cláusula',
        description: 'Limita el número máximo de filas devueltas por una consulta.',
        usage: 'Varía según el motor (ver variantes).',
        example: 'SELECT * FROM empleados ORDER BY salario DESC LIMIT 10;',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'SQLite'],
                syntax: 'SELECT columnas FROM tabla [ORDER BY col] LIMIT num [OFFSET inicio];',
                example: 'SELECT * FROM empleados ORDER BY salario DESC LIMIT 10 OFFSET 20;',
                note: 'OFFSET permite paginación. LIMIT 10 OFFSET 20 devuelve filas 21–30.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'SELECT TOP (num) columnas FROM tabla [ORDER BY col]; -- o con paginación: ORDER BY col OFFSET n ROWS FETCH NEXT m ROWS ONLY;',
                example: `-- Sin paginación:
SELECT TOP (10) * FROM empleados ORDER BY salario DESC;
-- Con paginación:
SELECT * FROM empleados ORDER BY salario DESC OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;`,
                note: 'TOP es la sintaxis clásica de SQL Server. OFFSET/FETCH es la forma estándar disponible desde SQL Server 2012.',
            },
            {
                engines: ['Oracle'],
                syntax: `-- Oracle 12c+:
SELECT columnas FROM tabla ORDER BY col FETCH FIRST num ROWS ONLY;
-- Oracle anterior a 12c:
SELECT * FROM (SELECT columnas FROM tabla ORDER BY col) WHERE ROWNUM <= num;`,
                example: `-- Oracle 12c+:
SELECT * FROM empleados ORDER BY salario DESC FETCH FIRST 10 ROWS ONLY;
-- Oracle 11g y anteriores:
SELECT * FROM (SELECT * FROM empleados ORDER BY salario DESC) WHERE ROWNUM <= 10;`,
                note: 'ROWNUM se aplica antes del ORDER BY, por lo que se necesita una subconsulta para ordenar correctamente en versiones antiguas.',
            },
            {
                engines: ['DB2'],
                syntax: 'SELECT columnas FROM tabla ORDER BY col FETCH FIRST num ROWS ONLY;',
                example: 'SELECT * FROM empleados ORDER BY salario DESC FETCH FIRST 10 ROWS ONLY;',
            },
        ],
    },
    {
        command: 'WITH (CTE)',
        category: 'Cláusula',
        description: 'Common Table Expression: define una consulta temporal nombrada reutilizable dentro de la misma sentencia. Mejora la legibilidad y permite recursividad.',
        usage: 'WITH nombre_cte AS (SELECT ...) SELECT ... FROM nombre_cte;',
        example: `WITH ventas_regionales AS (
    SELECT region, SUM(total) AS total_ventas FROM ventas GROUP BY region
)
SELECT region, total_ventas FROM ventas_regionales WHERE total_ventas > 10000;`,
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'Disponible desde MySQL 8.0 / MariaDB 10.2',
                example: `WITH top_clientes AS (
    SELECT cliente_id, COUNT(*) AS num_pedidos FROM pedidos GROUP BY cliente_id
)
SELECT c.nombre, t.num_pedidos FROM clientes c JOIN top_clientes t ON c.id = t.cliente_id ORDER BY t.num_pedidos DESC LIMIT 5;`,
                note: 'CTE recursivo también disponible desde MySQL 8.0 con WITH RECURSIVE.',
            },
            {
                engines: ['SQLite'],
                syntax: 'Disponible desde SQLite 3.8.3',
                example: `WITH RECURSIVE conteo(n) AS (
    SELECT 1 UNION ALL SELECT n + 1 FROM conteo WHERE n < 10
)
SELECT n FROM conteo;`,
                note: 'WITH RECURSIVE permite recorrer estructuras jerárquicas como árboles.',
            },
        ],
    },
    {
        command: 'DISTINCT',
        category: 'Cláusula',
        description: 'Elimina filas duplicadas del resultado de una consulta.',
        usage: 'SELECT DISTINCT columna FROM tabla;',
        example: 'SELECT DISTINCT pais FROM clientes;',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'SELECT DISTINCT ON (columna) columna1, columna2 FROM tabla ORDER BY columna;',
                example: 'SELECT DISTINCT ON (depto_id) nombre, salario FROM empleados ORDER BY depto_id, salario DESC;',
                note: 'DISTINCT ON es exclusivo de PostgreSQL: devuelve la primera fila de cada grupo definido por la columna especificada.',
            },
        ],
    },

    // ── Operadores ───────────────────────────────────────────────────────────

    {
        command: 'IN',
        category: 'Operador',
        description: 'Permite especificar múltiples valores en una cláusula WHERE.',
        usage: 'SELECT columnas FROM tabla WHERE columna IN (valor1, valor2, ...);',
        example: "SELECT * FROM clientes WHERE pais IN ('España', 'México', 'Argentina');",
    },
    {
        command: 'BETWEEN',
        category: 'Operador',
        description: 'Selecciona valores dentro de un rango dado (inclusivo en ambos extremos).',
        usage: 'SELECT columnas FROM tabla WHERE columna BETWEEN valor1 AND valor2;',
        example: 'SELECT * FROM productos WHERE precio BETWEEN 10 AND 20;',
    },
    {
        command: 'LIKE / ILIKE',
        category: 'Operador',
        description: 'Busca un patrón en una columna. % = cualquier secuencia de caracteres. _ = un solo carácter.',
        usage: 'SELECT columnas FROM tabla WHERE columna LIKE patron;',
        example: "SELECT * FROM clientes WHERE nombre LIKE 'A%';",
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: "SELECT columnas FROM tabla WHERE columna ILIKE patron;",
                example: "SELECT * FROM clientes WHERE nombre ILIKE 'ana%';",
                note: 'ILIKE es exclusivo de PostgreSQL: búsqueda de patrón case-insensitive sin necesidad de LOWER().',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: "SELECT columnas FROM tabla WHERE columna LIKE patron COLLATE utf8_general_ci;",
                example: "SELECT * FROM clientes WHERE nombre LIKE 'ana%' COLLATE utf8_general_ci;",
                note: 'MySQL hace búsquedas case-insensitive por defecto según el collation de la columna. Se puede forzar con COLLATE.',
            },
            {
                engines: ['SQLServer'],
                syntax: "SELECT columnas FROM tabla WHERE columna LIKE patron COLLATE Latin1_General_CI_AI;",
                example: "SELECT * FROM clientes WHERE nombre LIKE 'ana%' COLLATE Latin1_General_CI_AI;",
                note: 'CI = case insensitive, AI = accent insensitive en el collation de SQL Server.',
            },
        ],
    },
    {
        command: 'EXISTS',
        category: 'Operador',
        description: 'Verifica si una subconsulta devuelve al menos una fila.',
        usage: 'SELECT columnas FROM tabla WHERE EXISTS (SELECT 1 FROM tabla2 WHERE cond);',
        example: 'SELECT nombre FROM clientes c WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);',
    },
    {
        command: 'ANY / ALL',
        category: 'Operador',
        description: 'ANY devuelve true si al menos un valor de la subconsulta cumple la condición. ALL requiere que todos los valores la cumplan.',
        usage: 'SELECT columnas FROM tabla WHERE col operador ANY|ALL (subconsulta);',
        example: `SELECT nombre FROM productos WHERE precio > ANY (SELECT precio FROM productos WHERE categoria = 'B');`,
    },

    // ── Operadores Set ────────────────────────────────────────────────────────

    {
        command: 'UNION',
        category: 'Operador Set',
        description: 'Combina resultados de dos o más SELECT eliminando duplicados.',
        usage: 'SELECT col FROM tabla1 UNION SELECT col FROM tabla2;',
        example: 'SELECT ciudad FROM clientes UNION SELECT ciudad FROM proveedores;',
    },
    {
        command: 'UNION ALL',
        category: 'Operador Set',
        description: 'Combina resultados de dos o más SELECT incluyendo duplicados. Más eficiente que UNION.',
        usage: 'SELECT col FROM tabla1 UNION ALL SELECT col FROM tabla2;',
        example: 'SELECT ciudad FROM clientes UNION ALL SELECT ciudad FROM proveedores;',
    },
    {
        command: 'INTERSECT',
        category: 'Operador Set',
        description: 'Devuelve solo las filas que aparecen en ambos conjuntos de resultados.',
        usage: 'SELECT col FROM tabla1 INTERSECT SELECT col FROM tabla2;',
        example: 'SELECT ciudad FROM clientes INTERSECT SELECT ciudad FROM proveedores;',
        motorVariants: [
            {
                engines: ['MySQL'],
                syntax: 'Disponible desde MySQL 8.0.31',
                example: 'SELECT ciudad FROM clientes INTERSECT SELECT ciudad FROM proveedores;',
                note: 'MySQL no soportaba INTERSECT hasta la versión 8.0.31. Para versiones anteriores se usa INNER JOIN o subconsultas.',
            },
            {
                engines: ['SQLite'],
                syntax: 'Disponible desde SQLite 3.0',
                example: 'SELECT ciudad FROM clientes INTERSECT SELECT ciudad FROM proveedores;',
            },
        ],
    },
    {
        command: 'EXCEPT / MINUS',
        category: 'Operador Set',
        description: 'Devuelve las filas del primer SELECT que no aparecen en el segundo.',
        usage: 'SELECT col FROM tabla1 EXCEPT SELECT col FROM tabla2;',
        example: 'SELECT ciudad FROM clientes EXCEPT SELECT ciudad FROM proveedores;',
        motorVariants: [
            {
                engines: ['Oracle'],
                syntax: 'SELECT col FROM tabla1 MINUS SELECT col FROM tabla2;',
                example: 'SELECT ciudad FROM clientes MINUS SELECT ciudad FROM proveedores;',
                note: 'Oracle usa MINUS en lugar de EXCEPT.',
            },
            {
                engines: ['MySQL'],
                syntax: 'Disponible desde MySQL 8.0.31',
                example: 'SELECT ciudad FROM clientes EXCEPT SELECT ciudad FROM proveedores;',
                note: 'MySQL no soportaba EXCEPT hasta la versión 8.0.31.',
            },
        ],
    },

    // ── Expresiones ──────────────────────────────────────────────────────────

    {
        command: 'CASE',
        category: 'Expresión',
        description: 'Evalúa condiciones y devuelve un valor cuando se cumple la primera condición (equivalente a if-then-else).',
        usage: 'CASE WHEN cond THEN res [WHEN cond2 THEN res2] ELSE res_default END',
        example: "SELECT nombre, CASE WHEN edad < 18 THEN 'Menor' ELSE 'Mayor' END AS edad_grupo FROM personas;",
    },
    {
        command: 'COALESCE',
        category: 'Expresión',
        description: 'Devuelve el primer valor no NULL de la lista de argumentos.',
        usage: 'COALESCE(valor1, valor2, ..., valor_por_defecto)',
        example: "SELECT nombre, COALESCE(telefono, email, 'Sin contacto') AS contacto FROM clientes;",
    },
    {
        command: 'NULLIF',
        category: 'Expresión',
        description: 'Devuelve NULL si los dos argumentos son iguales; de lo contrario devuelve el primer argumento.',
        usage: 'NULLIF(expresion1, expresion2)',
        example: 'SELECT nombre, ventas / NULLIF(visitas, 0) AS tasa_conversion FROM campañas;',
        motorVariants: [
            {
                engines: ['Oracle'],
                syntax: 'NVL(expresion, valor_si_null)',
                example: "SELECT nombre, NVL(telefono, 'Sin teléfono') FROM clientes;",
                note: 'Oracle también tiene NVL (equivalente a COALESCE con 2 argumentos) y NVL2.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'IFNULL(expresion, valor_si_null)',
                example: "SELECT nombre, IFNULL(telefono, 'Sin teléfono') FROM clientes;",
                note: 'IFNULL es el equivalente de NVL en MySQL. COALESCE también está disponible.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'ISNULL(expresion, valor_si_null)',
                example: "SELECT nombre, ISNULL(telefono, 'Sin teléfono') FROM clientes;",
                note: 'ISNULL es el equivalente de NVL en SQL Server. COALESCE también está disponible.',
            },
        ],
    },
    {
        command: 'CAST / CONVERT',
        category: 'Expresión',
        description: 'Convierte un valor de un tipo de datos a otro.',
        usage: 'CAST(expresion AS tipo)',
        example: "SELECT CAST(precio AS VARCHAR(10)) FROM productos;",
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB', 'SQLServer'],
                syntax: 'CONVERT(tipo, expresion) -- SQL Server / CONVERT(expresion, tipo) -- MySQL',
                example: `-- SQL Server:
SELECT CONVERT(VARCHAR(10), GETDATE(), 103); -- dd/mm/yyyy
-- MySQL:
SELECT CONVERT('123.45', DECIMAL(10,2));`,
                note: 'SQL Server: CONVERT acepta un tercer argumento de estilo para formatear fechas. MySQL usa el orden inverso.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: "expresion::tipo",
                example: "SELECT precio::TEXT FROM productos;",
                note: 'PostgreSQL tiene el operador :: como atajo de CAST.',
            },
        ],
    },

    // ── TCL (Control de transacciones) ────────────────────────────────────────

    {
        command: 'BEGIN / START TRANSACTION',
        category: 'TCL',
        description: 'Inicia una transacción explícita. Las operaciones siguientes se confirman o revierten juntas.',
        usage: 'BEGIN; -- o START TRANSACTION;',
        example: `BEGIN;
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;`,
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB', 'SQLServer', 'SQLite'],
                syntax: 'START TRANSACTION;',
                example: `START TRANSACTION;
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
COMMIT;`,
                note: 'MySQL y SQL Server usan START TRANSACTION. PostgreSQL acepta ambas formas.',
            },
            {
                engines: ['Oracle'],
                syntax: '-- Oracle inicia transacciones automáticamente. No existe BEGIN explícito.',
                example: `UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;`,
                note: 'En Oracle cada DML inicia una transacción implícita. COMMIT o ROLLBACK la finaliza.',
            },
        ],
    },
    {
        command: 'COMMIT',
        category: 'TCL',
        description: 'Confirma y persiste todos los cambios de la transacción actual.',
        usage: 'COMMIT;',
        example: 'COMMIT;',
    },
    {
        command: 'ROLLBACK',
        category: 'TCL',
        description: 'Deshace todos los cambios realizados en la transacción actual.',
        usage: 'ROLLBACK;',
        example: 'ROLLBACK;',
        motorVariants: [
            {
                engines: ['PostgreSQL', 'Oracle', 'SQLServer', 'MySQL', 'MariaDB', 'DB2'],
                syntax: 'SAVEPOINT nombre; ... ROLLBACK TO SAVEPOINT nombre;',
                example: `BEGIN;
INSERT INTO pedidos (cliente_id, total) VALUES (1, 200);
SAVEPOINT antes_detalle;
INSERT INTO detalle_pedido (pedido_id, producto_id) VALUES (1, 999); -- error potencial
ROLLBACK TO SAVEPOINT antes_detalle;
COMMIT;`,
                note: 'SAVEPOINT permite rollback parcial a un punto intermedio dentro de la transacción.',
            },
        ],
    },

    // ── DCL (Control de acceso) ───────────────────────────────────────────────

    {
        command: 'GRANT',
        category: 'DCL',
        description: 'Otorga privilegios sobre objetos de la base de datos a usuarios o roles.',
        usage: 'GRANT privilegio ON objeto TO usuario;',
        example: 'GRANT SELECT, INSERT ON productos TO usuario_app;',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'GRANT privilegio ON TABLE tabla TO rol; GRANT rol TO usuario;',
                example: `GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT readonly_role TO ana;`,
                note: 'PostgreSQL tiene un sistema de roles robusto. Se pueden otorgar privilegios sobre todos los objetos de un schema.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: "GRANT privilegio ON bd.tabla TO 'usuario'@'host' IDENTIFIED BY 'password';",
                example: "GRANT ALL PRIVILEGES ON tienda.* TO 'app_user'@'localhost' IDENTIFIED BY 'pass123';",
                note: 'MySQL incluye host en la identidad del usuario. FLUSH PRIVILEGES necesario en versiones antiguas.',
            },
        ],
    },
    {
        command: 'REVOKE',
        category: 'DCL',
        description: 'Elimina privilegios previamente otorgados a usuarios o roles.',
        usage: 'REVOKE privilegio ON objeto FROM usuario;',
        example: 'REVOKE INSERT ON productos FROM usuario_reporte;',
    },

    // ── Funciones especiales por motor ────────────────────────────────────────

    {
        command: 'JSON / JSONB',
        category: 'Tipo especial',
        description: 'Almacenamiento y consulta de datos JSON dentro de la base de datos.',
        usage: 'Varía por motor.',
        example: "SELECT datos->>'nombre' FROM usuarios WHERE datos->>'activo' = 'true';",
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: "col->'clave' (retorna JSON), col->>'clave' (retorna texto), col @> '{\"k\":v}'::jsonb",
                example: `SELECT datos->>'nombre' AS nombre,
       datos->'direccion'->>'ciudad' AS ciudad
FROM usuarios
WHERE datos @> '{"activo": true}'::jsonb;`,
                note: 'JSONB almacena JSON en formato binario optimizado para consultas. Soporta índices GIN para búsquedas eficientes.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: "JSON_EXTRACT(col, '$.clave'), col->>'$.clave'",
                example: `SELECT JSON_EXTRACT(datos, '$.nombre') AS nombre,
       datos->>'$.direccion.ciudad' AS ciudad
FROM usuarios
WHERE JSON_EXTRACT(datos, '$.activo') = true;`,
                note: 'MySQL 5.7+ soporta tipo JSON nativo. Las funciones JSON_* permiten manipular y extraer datos.',
            },
            {
                engines: ['SQLServer'],
                syntax: "JSON_VALUE(col, '$.clave'), JSON_QUERY(col, '$.objeto')",
                example: `SELECT JSON_VALUE(datos, '$.nombre') AS nombre,
       JSON_VALUE(datos, '$.direccion.ciudad') AS ciudad
FROM usuarios
WHERE JSON_VALUE(datos, '$.activo') = 'true';`,
                note: 'SQL Server almacena JSON como NVARCHAR. JSON_VALUE extrae escalares, JSON_QUERY extrae objetos/arrays.',
            },
            {
                engines: ['Oracle'],
                syntax: "JSON_VALUE(col, '$.clave'), JSON_QUERY(col, '$.objeto')",
                example: `SELECT JSON_VALUE(datos, '$.nombre') AS nombre
FROM usuarios
WHERE JSON_VALUE(datos, '$.activo') = 'true';`,
                note: 'Oracle 12c+ soporta columnas JSON. Oracle 21c añade el tipo JSON nativo.',
            },
            {
                engines: ['SQLite'],
                syntax: "json_extract(col, '$.clave')",
                example: `SELECT json_extract(datos, '$.nombre') AS nombre
FROM usuarios
WHERE json_extract(datos, '$.activo') = 1;`,
                note: 'Disponible desde SQLite 3.38. SQLite almacena JSON como TEXT.',
            },
        ],
    },
    {
        command: 'SECUENCIAS / AUTO-ID',
        category: 'Tipo especial',
        description: 'Generación automática de identificadores únicos y secuenciales.',
        usage: 'Varía por motor.',
        example: 'CREATE SEQUENCE seq_usuarios START WITH 1 INCREMENT BY 1;',
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'AUTO_INCREMENT en la definición de columna.',
                example: 'CREATE TABLE usuarios (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100));',
                note: 'El valor actual puede consultarse con LAST_INSERT_ID() después de un INSERT.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'SERIAL / BIGSERIAL, o GENERATED ALWAYS AS IDENTITY (SQL estándar).',
                example: `CREATE TABLE usuarios (id BIGSERIAL PRIMARY KEY, nombre VARCHAR(100));
-- O con identidad estándar:
CREATE TABLE usuarios (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, nombre VARCHAR(100));`,
                note: 'currval() y nextval() permiten interactuar con la secuencia subyacente.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'IDENTITY(semilla, incremento) en la definición de columna.',
                example: 'CREATE TABLE usuarios (id INT IDENTITY(1,1) PRIMARY KEY, nombre NVARCHAR(100));',
                note: 'SCOPE_IDENTITY() retorna el último ID insertado en la sesión actual.',
            },
            {
                engines: ['Oracle'],
                syntax: 'SEQUENCE + NEXTVAL, o GENERATED AS IDENTITY (Oracle 12c+).',
                example: `-- Sequence clásica:
CREATE SEQUENCE seq_usuarios START WITH 1 INCREMENT BY 1;
INSERT INTO usuarios (id, nombre) VALUES (seq_usuarios.NEXTVAL, 'Ana');
-- Oracle 12c+:
CREATE TABLE usuarios (id NUMBER GENERATED ALWAYS AS IDENTITY, nombre VARCHAR2(100));`,
            },
            {
                engines: ['SQLite'],
                syntax: 'INTEGER PRIMARY KEY (autoincremento implícito) o AUTOINCREMENT.',
                example: 'CREATE TABLE usuarios (id INTEGER PRIMARY KEY, nombre TEXT);',
                note: 'INTEGER PRIMARY KEY es alias del rowid de SQLite y autoincrementa sin AUTOINCREMENT. Añadir AUTOINCREMENT garantiza que los IDs nunca se reutilicen.',
            },
        ],
    },
    {
        command: 'EXPLAIN / EXPLAIN ANALYZE',
        category: 'Diagnóstico',
        description: 'Muestra el plan de ejecución de una consulta. Fundamental para optimizar rendimiento.',
        usage: 'EXPLAIN SELECT ...;',
        example: 'EXPLAIN SELECT * FROM pedidos WHERE cliente_id = 1;',
        motorVariants: [
            {
                engines: ['PostgreSQL'],
                syntax: 'EXPLAIN ANALYZE SELECT ...;',
                example: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM pedidos WHERE cliente_id = 1;',
                note: 'ANALYZE ejecuta la consulta y muestra tiempos reales. BUFFERS muestra uso de caché. FORMAT JSON facilita análisis automatizado.',
            },
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'EXPLAIN SELECT ...; -- o EXPLAIN FORMAT=JSON SELECT ...;',
                example: 'EXPLAIN FORMAT=JSON SELECT * FROM pedidos WHERE cliente_id = 1;',
                note: 'MySQL 8.0+ tiene EXPLAIN ANALYZE similar a PostgreSQL.',
            },
            {
                engines: ['SQLServer'],
                syntax: 'SET SHOWPLAN_ALL ON; SELECT ...; -- o usar el plan de ejecución gráfico en SSMS.',
                example: `SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT * FROM pedidos WHERE cliente_id = 1;`,
                note: 'SQL Server Management Studio muestra planes de ejecución gráficos con Ctrl+M.',
            },
            {
                engines: ['Oracle'],
                syntax: 'EXPLAIN PLAN FOR SELECT ...; SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);',
                example: `EXPLAIN PLAN FOR SELECT * FROM pedidos WHERE cliente_id = 1;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
                note: 'Oracle usa DBMS_XPLAN para formatear el plan de ejecución de forma legible.',
            },
            {
                engines: ['SQLite'],
                syntax: 'EXPLAIN QUERY PLAN SELECT ...;',
                example: 'EXPLAIN QUERY PLAN SELECT * FROM pedidos WHERE cliente_id = 1;',
            },
        ],
    },
    {
        command: 'PRAGMA',
        category: 'Configuración',
        description: 'Comando exclusivo de SQLite para consultar y configurar parámetros internos de la base de datos.',
        usage: 'PRAGMA nombre_pragma [= valor];',
        example: 'PRAGMA foreign_keys = ON;',
        motorVariants: [
            {
                engines: ['SQLite'],
                syntax: 'PRAGMA nombre;',
                example: `PRAGMA foreign_keys = ON;        -- activa claves foráneas (inactivas por defecto)
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging, mejor rendimiento concurrente
PRAGMA table_info(nombre_tabla);  -- describe las columnas de una tabla
PRAGMA integrity_check;           -- verifica integridad de la BD
PRAGMA cache_size = -64000;       -- caché de 64 MB`,
                note: 'Equivalente a SET en otros motores. Las claves foráneas están desactivadas por defecto en SQLite y deben activarse con PRAGMA foreign_keys = ON en cada conexión.',
            },
        ],
    },
    {
        command: 'SET / VARIABLES DE SESIÓN',
        category: 'Configuración',
        description: 'Configura parámetros de la sesión o define variables de usuario.',
        usage: 'SET parametro = valor;',
        example: "SET time_zone = '+00:00';",
        motorVariants: [
            {
                engines: ['MySQL', 'MariaDB'],
                syntax: 'SET @variable = valor; -- variable de usuario. SET SESSION/GLOBAL param = val; -- parámetros.',
                example: `SET @total = (SELECT SUM(total) FROM pedidos);
SELECT @total;
SET SESSION time_zone = '+00:00';`,
                note: 'Variables de usuario con @ son locales a la conexión. GLOBAL afecta a todas las sesiones nuevas.',
            },
            {
                engines: ['PostgreSQL'],
                syntax: 'SET parametro TO valor; -- o SELECT set_config(parametro, valor, local);',
                example: `SET search_path TO mi_schema, public;
SET work_mem = '256MB';
SET timezone = 'America/Lima';`,
            },
            {
                engines: ['SQLServer'],
                syntax: 'SET NOCOUNT ON|OFF; SET ANSI_NULLS ON|OFF; DECLARE @var tipo; SET @var = val;',
                example: `SET NOCOUNT ON;
DECLARE @contador INT;
SET @contador = (SELECT COUNT(*) FROM pedidos);
SELECT @contador;`,
                note: 'En SQL Server las variables se declaran con DECLARE y se asignan con SET o SELECT.',
            },
            {
                engines: ['Oracle'],
                syntax: 'VARIABLE nombre tipo; EXEC :nombre := valor; -- en SQL*Plus/SQLcl.',
                example: `:= para asignación en PL/SQL:
DECLARE v_total NUMBER;
BEGIN
  SELECT SUM(total) INTO v_total FROM pedidos;
  DBMS_OUTPUT.PUT_LINE(v_total);
END;`,
                note: 'Oracle usa PL/SQL para lógica procedural y variables locales.',
            },
        ],
    },
];
