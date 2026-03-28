export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' | 'SELF'
export type SetOp = 'UNION' | 'UNION_ALL' | 'INTERSECT' | 'EXCEPT'

export interface TableRef {
  name: string
  alias: string
  color: string
}

export interface JoinClause {
  type: JoinType
  table: TableRef
  condition: string
  isNullFilter: boolean
  resultZone: 'left' | 'intersection' | 'right' | 'left_only' | 'right_only' | 'all'
}

export interface ConditionItem {
  text: string
  type: 'comparison' | 'subquery_in' | 'subquery_not_in' | 'null_check' | 'between' | 'like' | 'exists'
  subquery?: ParsedQuery
}

export interface ColumnRef {
  raw: string
  table?: string
  column: string
  alias?: string
  aggregate?: { fn: string; column: string; alias?: string }
}

export interface OrderItem {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface ExecutionStep {
  step: number
  name: string
  clause: string
  description: string
  icon: string
  color: string
  affectedTables?: string[]
}

export interface VennZone {
  id: string
  label: string
  description: string
  color: string
  active: boolean
}

export type DiagramType = 'two-set' | 'multi-set' | 'single' | 'set-op'

export interface ParsedQuery {
  raw: string
  selectColumns: ColumnRef[]
  fromTable: TableRef | null
  joins: JoinClause[]
  where: { raw: string; conditions: ConditionItem[] } | null
  groupBy: string[]
  having: string | null
  orderBy: OrderItem[]
  setOperation: SetOp | null
  rightQuery: ParsedQuery | null
  subqueries: ParsedQuery[]
  hasAggregate: boolean
  executionSteps: ExecutionStep[]
  vennZones: VennZone[]
  diagram: DiagramType
}

const TABLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16'
]

function normSQL(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

function assignColors(tables: TableRef[]) {
  tables.forEach((t, i) => { t.color = TABLE_COLORS[i % TABLE_COLORS.length] })
}

function splitTopLevel(str: string): string[] {
  const parts: string[] = []
  let depth = 0, cur = ''
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') depth--
    else if (str[i] === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue }
    cur += str[i]
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function splitByAndOr(str: string): string[] {
  const parts: string[] = []
  let depth = 0, cur = '', i = 0
  while (i < str.length) {
    if (str[i] === '(') { depth++; cur += str[i]; i++; continue }
    if (str[i] === ')') { depth--; cur += str[i]; i++; continue }
    if (depth === 0) {
      const chunk = str.slice(i)
      const m = chunk.match(/^\s+(AND|OR)\s+/i)
      if (m) { parts.push(cur.trim()); cur = ''; i += m[0].length; continue }
    }
    cur += str[i]; i++
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts.filter(Boolean)
}

function extractSelect(sql: string): ColumnRef[] {
  const m = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\b/i)
  if (!m) return []
  const raw = m[1].trim()
  if (raw === '*') return [{ raw: '*', column: '*' }]
  return splitTopLevel(raw).map(col => {
    col = col.trim()
    const aliasM = col.match(/\s+AS\s+(\w+)$/i)
    const alias = aliasM ? aliasM[1] : undefined
    const base = aliasM ? col.slice(0, col.length - aliasM[0].length).trim() : col
    const aggM = base.match(/^(COUNT|SUM|AVG|MAX|MIN|COALESCE|NULLIF|CAST)\s*\((.+)\)$/i)
    if (aggM) return { raw: col, column: base, alias, aggregate: { fn: aggM[1].toUpperCase(), column: aggM[2].trim(), alias } }
    const dotM = base.match(/^(\w+)\.(\w+|\*)$/)
    if (dotM) return { raw: col, table: dotM[1], column: dotM[2], alias }
    return { raw: col, column: base, alias }
  })
}

function extractFromTable(sql: string): TableRef | null {
  const m = sql.match(/\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s|$)/i)
  if (!m) return null
  return { name: m[1], alias: m[2] && !/^(WHERE|JOIN|INNER|LEFT|RIGHT|FULL|CROSS|GROUP|ORDER|HAVING|ON)$/i.test(m[2]) ? m[2] : m[1], color: '' }
}

function extractJoins(sql: string): JoinClause[] {
  const joins: JoinClause[] = []
  const pat = /\b(LEFT|RIGHT|FULL|INNER|CROSS)?\s*(OUTER\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s*(?:ON\s+([\s\S]+?))?(?=\s+(?:LEFT|RIGHT|FULL|INNER|CROSS)\s+(?:OUTER\s+)?JOIN|\s+JOIN|\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+UNION|\s+INTERSECT|\s+EXCEPT|;|$)/gi
  let m: RegExpExecArray | null
  while ((m = pat.exec(sql)) !== null) {
    const kw = (m[1] || 'INNER').toUpperCase() as JoinType
    const alias = m[4] && !/^(WHERE|ON|GROUP|ORDER|HAVING|JOIN|INNER|LEFT|RIGHT|FULL|CROSS)$/i.test(m[4]) ? m[4] : m[3]
    const table: TableRef = { name: m[3], alias, color: '' }
    const condition = m[5] ? m[5].trim().replace(/\s+/g, ' ') : ''
    const isNullFilter = /IS\s+NULL/i.test(condition)
    let resultZone: JoinClause['resultZone'] = 'intersection'
    if (kw === 'LEFT') resultZone = isNullFilter ? 'left_only' : 'left'
    else if (kw === 'RIGHT') resultZone = isNullFilter ? 'right_only' : 'right'
    else if (kw === 'FULL') resultZone = 'all'
    else if (kw === 'CROSS') resultZone = 'all'
    joins.push({ type: kw, table, condition, isNullFilter, resultZone })
  }
  return joins
}

function extractWhere(sql: string): { raw: string; conditions: ConditionItem[] } | null {
  const m = sql.match(/\bWHERE\s+([\s\S]+?)(?=\s+GROUP\s+BY|\s+ORDER\s+BY|\s+HAVING|\s+UNION|\s+INTERSECT|\s+EXCEPT|;|$)/i)
  if (!m) return null
  const raw = m[1].trim()
  const conditions: ConditionItem[] = splitByAndOr(raw).map(p => {
    const text = p.trim()
    if (/NOT\s+IN\s*\(/i.test(text)) {
      const sm = text.match(/NOT\s+IN\s*\(([\s\S]+)\)/i)
      const inner = sm?.[1]?.trim() || ''
      return { text, type: 'subquery_not_in' as const, subquery: /SELECT/i.test(inner) ? parseSQL(inner) : undefined }
    }
    if (/\bIN\s*\(/i.test(text)) {
      const sm = text.match(/\bIN\s*\(([\s\S]+)\)/i)
      const inner = sm?.[1]?.trim() || ''
      if (/SELECT/i.test(inner)) return { text, type: 'subquery_in' as const, subquery: parseSQL(inner) }
      return { text, type: 'comparison' as const }
    }
    if (/IS\s+(NOT\s+)?NULL/i.test(text)) return { text, type: 'null_check' as const }
    if (/\bBETWEEN\b/i.test(text)) return { text, type: 'between' as const }
    if (/\bLIKE\b/i.test(text)) return { text, type: 'like' as const }
    if (/\bEXISTS\b/i.test(text)) return { text, type: 'exists' as const }
    return { text, type: 'comparison' as const }
  })
  return { raw, conditions }
}

function buildExecutionSteps(q: ParsedQuery): ExecutionStep[] {
  const steps: ExecutionStep[] = []
  let n = 1
  if (q.fromTable) {
    steps.push({ step: n++, name: 'FROM', clause: `FROM ${q.fromTable.name}${q.fromTable.alias !== q.fromTable.name ? ' ' + q.fromTable.alias : ''}`, description: `Carga la tabla base "${q.fromTable.name}"${q.fromTable.alias !== q.fromTable.name ? ` con alias "${q.fromTable.alias}"` : ''}`, icon: '📋', color: q.fromTable.color || '#3b82f6', affectedTables: [q.fromTable.alias] })
  }
  for (const j of q.joins) {
    const d: Record<string, string> = { intersection: 'intersección (A ∩ B)', left: 'unión izquierda — todas de A + coincidencias de B', right: 'unión derecha — todas de B + coincidencias de A', left_only: 'diferencia A − B (sin pareja en B)', right_only: 'diferencia B − A (sin pareja en A)', all: 'unión total A ∪ B' }
    steps.push({ step: n++, name: `${j.type} JOIN`, clause: `${j.type} JOIN ${j.table.name}${j.table.alias !== j.table.name ? ' ' + j.table.alias : ''}${j.condition ? ' ON ' + j.condition : ''}`, description: `Une "${j.table.name}" → ${d[j.resultZone]}`, icon: j.type === 'LEFT' ? '⊇' : j.type === 'RIGHT' ? '⊆' : j.type === 'FULL' ? '∪' : j.type === 'CROSS' ? '×' : '∩', color: j.table.color || '#8b5cf6', affectedTables: [j.table.alias] })
  }
  if (q.where) steps.push({ step: n++, name: 'WHERE', clause: `WHERE ${q.where.raw.slice(0, 55)}${q.where.raw.length > 55 ? '…' : ''}`, description: `Filtra ${q.where.conditions.length} condición(es): ${q.where.conditions.map(c => c.type.replace(/_/g, ' ')).join(', ')}`, icon: '🔍', color: '#f59e0b' })
  if (q.groupBy.length) steps.push({ step: n++, name: 'GROUP BY', clause: `GROUP BY ${q.groupBy.join(', ')}`, description: `Agrupa por: ${q.groupBy.join(', ')}. Colapsa filas en grupos únicos.`, icon: '📦', color: '#10b981' })
  if (q.having) steps.push({ step: n++, name: 'HAVING', clause: `HAVING ${q.having}`, description: `Filtra grupos resultantes: ${q.having}`, icon: '🔎', color: '#ef4444' })
  const aggs = q.selectColumns.filter(c => c.aggregate)
  steps.push({ step: n++, name: 'SELECT', clause: `SELECT ${q.selectColumns.length === 1 && q.selectColumns[0].column === '*' ? '*' : q.selectColumns.map(c => c.alias || c.column).join(', ')}`, description: `Proyecta ${q.selectColumns.length} columna(s)${aggs.length ? `. Agrega: ${aggs.map(a => a.aggregate!.fn + '(' + a.aggregate!.column + ')').join(', ')}` : ''}`, icon: '📐', color: '#8b5cf6' })
  if (q.orderBy.length) steps.push({ step: n++, name: 'ORDER BY', clause: `ORDER BY ${q.orderBy.map(o => o.column + ' ' + o.direction).join(', ')}`, description: `Ordena por: ${q.orderBy.map(o => o.column + ' ' + o.direction).join(', ')}`, icon: '↕', color: '#06b6d4' })
  return steps
}

function buildVennZones(q: ParsedQuery): VennZone[] {
  if (!q.fromTable) return []
  const tA = q.fromTable
  if (q.joins.length === 0) return [{ id: 'A', label: tA.alias, description: `Todos los registros de ${tA.name}`, color: tA.color, active: true }]
  if (q.joins.length === 1) {
    const j = q.joins[0], tB = j.table, rz = j.resultZone
    return [
      { id: 'A', label: tA.alias, description: `Solo en ${tA.name}`, color: tA.color, active: rz === 'left' || rz === 'left_only' || rz === 'all' },
      { id: 'AB', label: `${tA.alias} ∩ ${tB.alias}`, description: `Coincidencias entre ambas tablas`, color: '#8b5cf6', active: rz === 'intersection' || rz === 'left' || rz === 'right' || rz === 'all' },
      { id: 'B', label: tB.alias, description: `Solo en ${tB.name}`, color: tB.color, active: rz === 'right' || rz === 'right_only' || rz === 'all' },
    ]
  }
  const allTables = [tA, ...q.joins.map(j => j.table)]
  return allTables.map(t => ({ id: t.alias, label: t.alias, description: `Tabla: ${t.name}`, color: t.color, active: true }))
}

function detectSetOp(sql: string): { op: SetOp | null; left: string; right: string } {
  const patterns: [SetOp, RegExp][] = [
    ['UNION_ALL', /\bUNION\s+ALL\b/i],
    ['UNION', /\bUNION\b(?!\s+ALL)/i],
    ['INTERSECT', /\bINTERSECT\b/i],
    ['EXCEPT', /\bEXCEPT\b/i],
  ]
  for (const [op, pat] of patterns) {
    const m = sql.match(pat)
    if (m && m.index !== undefined) {
      return { op, left: sql.slice(0, m.index).trim(), right: sql.slice(m.index + m[0].length).trim() }
    }
  }
  return { op: null, left: sql, right: '' }
}

export function parseSQL(sql: string): ParsedQuery {
  const clean = normSQL(sql.replace(/;$/, '').trim())
  const { op, left, right } = detectSetOp(clean)
  const selectCols = extractSelect(clean)
  const fromTable = extractFromTable(clean)
  const joins = extractJoins(clean)
  const where = extractWhere(clean)
  const groupByM = clean.match(/\bGROUP\s+BY\s+([\s\S]+?)(?=\s+HAVING|\s+ORDER|\s+UNION|\s+INTERSECT|\s+EXCEPT|;|$)/i)
  const groupBy = groupByM ? groupByM[1].split(',').map(s => s.trim()) : []
  const havingM = clean.match(/\bHAVING\s+([\s\S]+?)(?=\s+ORDER|\s+UNION|\s+INTERSECT|\s+EXCEPT|;|$)/i)
  const having = havingM ? havingM[1].trim() : null
  const orderByM = clean.match(/\bORDER\s+BY\s+([\s\S]+?)(?=\s+UNION|\s+INTERSECT|\s+EXCEPT|;|$)/i)
  const orderBy: OrderItem[] = orderByM ? orderByM[1].split(',').map(s => {
    const p = s.trim().split(/\s+/)
    return { column: p.slice(0, p.length > 1 && /^(ASC|DESC)$/i.test(p[p.length - 1]) ? -1 : undefined).join(' '), direction: /DESC/i.test(p[p.length - 1]) ? 'DESC' : 'ASC' }
  }) : []
  const hasAggregate = selectCols.some(c => c.aggregate) || groupBy.length > 0
  const allTables: TableRef[] = []
  if (fromTable) allTables.push(fromTable)
  joins.forEach(j => allTables.push(j.table))
  assignColors(allTables)
  let diagram: DiagramType = 'single'
  if (op) diagram = 'set-op'
  else if (joins.length === 1) diagram = 'two-set'
  else if (joins.length > 1) diagram = 'multi-set'
  const q: ParsedQuery = { raw: sql, selectColumns: selectCols, fromTable, joins, where, groupBy, having, orderBy, setOperation: op, rightQuery: op && right ? parseSQL(right) : null, subqueries: [], hasAggregate, executionSteps: [], vennZones: [], diagram }
  q.executionSteps = buildExecutionSteps(q)
  q.vennZones = buildVennZones(q)
  if (where) {
    for (const c of where.conditions) { if (c.subquery) q.subqueries.push(c.subquery) }
  }
  return q
}

export const EXAMPLE_QUERIES = [
  { label: 'INNER JOIN', category: 'JOINs', sql: `SELECT e.name, d.department_name\nFROM Employees e\nINNER JOIN Departments d ON e.department_id = d.id` },
  { label: 'LEFT JOIN', category: 'JOINs', sql: `SELECT c.name, o.order_date, o.total\nFROM Customers c\nLEFT JOIN Orders o ON c.id = o.customer_id` },
  { label: 'LEFT ONLY', category: 'JOINs', sql: `SELECT c.name\nFROM Customers c\nLEFT JOIN Orders o ON c.id = o.customer_id\nWHERE o.id IS NULL` },
  { label: 'SELF JOIN', category: 'JOINs', sql: `SELECT e.name AS employee, m.name AS manager\nFROM Employees e\nLEFT JOIN Employees m ON e.manager_id = m.id` },
  { label: 'CROSS JOIN', category: 'JOINs', sql: `SELECT c.name AS customer, p.title AS product\nFROM Customers c\nCROSS JOIN Products p\nLIMIT 10` },
  { label: 'UNION', category: 'Set Ops', sql: `SELECT city AS location\nFROM Customers\nUNION\nSELECT location\nFROM Departments` },
  { label: 'UNION ALL', category: 'Set Ops', sql: `SELECT city AS location\nFROM Customers\nUNION ALL\nSELECT location\nFROM Departments` },
  { label: 'INTERSECT', category: 'Set Ops', sql: `SELECT location\nFROM Departments\nINTERSECT\nSELECT city\nFROM Customers` },
  { label: 'EXCEPT', category: 'Set Ops', sql: `SELECT country\nFROM Customers\nEXCEPT\nSELECT location\nFROM Departments` },
  { label: 'GROUP BY+HAVING', category: 'Agregación', sql: `SELECT department_id, COUNT(*) AS total_employees, AVG(salary) AS avg_salary\nFROM Employees\nWHERE status = 'ACTIVE'\nGROUP BY department_id\nHAVING COUNT(*) >= 2\nORDER BY avg_salary DESC` },
  { label: 'ORDER TOTAL BY CUSTOMER', category: 'Agregación', sql: `SELECT c.id, c.name, SUM(o.total) AS total_spent\nFROM Customers c\nINNER JOIN Orders o ON c.id = o.customer_id\nGROUP BY c.id, c.name\nORDER BY total_spent DESC` },
  { label: 'MAX SALARY BY DEPARTMENT', category: 'Agregación', sql: `SELECT d.department_name, MAX(e.salary) AS max_salary\nFROM Departments d\nINNER JOIN Employees e ON d.id = e.department_id\nGROUP BY d.id, d.department_name\nORDER BY max_salary DESC` },
  { label: 'Subquery IN', category: 'Subqueries', sql: `SELECT name, email\nFROM Customers\nWHERE id IN (\n    SELECT customer_id\n    FROM Orders\n    WHERE total >= 500\n)` },
  { label: 'Subquery NOT IN', category: 'Subqueries', sql: `SELECT name\nFROM Employees\nWHERE id NOT IN (\n    SELECT employee_id\n    FROM ProjectAssignments\n)` },
  { label: 'Correlated Subquery', category: 'Subqueries', sql: `SELECT e.name, e.salary\nFROM Employees e\nWHERE e.salary = (\n    SELECT MAX(e2.salary)\n    FROM Employees e2\n    WHERE e2.department_id = e.department_id\n)` },
  { label: 'Above Average Salary', category: 'Subqueries', sql: `SELECT name, salary\nFROM Employees\nWHERE salary > (\n    SELECT AVG(salary)\n    FROM Employees\n)` },
  { label: '3-Table JOIN', category: 'Avanzado', sql: `SELECT o.id, c.name AS customer, p.title AS product, o.quantity\nFROM Orders o\nINNER JOIN Customers c ON o.customer_id = c.id\nINNER JOIN Products p ON o.product_id = p.id` },
  { label: '4-Table JOIN', category: 'Avanzado', sql: `SELECT o.id, c.name AS customer, p.title AS product, cat.name AS category, o.total\nFROM Orders o\nINNER JOIN Customers c ON o.customer_id = c.id\nINNER JOIN Products p ON o.product_id = p.id\nLEFT JOIN Categories cat ON p.category_id = cat.id` },
  { label: 'Complex Query', category: 'Avanzado', sql: `SELECT e.id, e.name, d.department_name, AVG(s.salary) AS avg_salary, COUNT(DISTINCT pa.project_id) AS projects\nFROM Employees e\nINNER JOIN Departments d ON e.department_id = d.id\nLEFT JOIN Salaries s ON e.id = s.employee_id\nLEFT JOIN ProjectAssignments pa ON e.id = pa.employee_id\nLEFT JOIN Projects p ON pa.project_id = p.id\nWHERE e.status = 'ACTIVE'\n  AND e.id IN (\n      SELECT pa2.employee_id\n      FROM ProjectAssignments pa2\n      INNER JOIN Projects p2 ON pa2.project_id = p2.id\n      WHERE p2.project_status = 'ONGOING'\n  )\nGROUP BY e.id, e.name, d.department_name\nHAVING COUNT(s.salary) > 1\nORDER BY avg_salary DESC` },
  { label: 'Employees Without Department', category: 'Avanzado', sql: `SELECT e.id, e.name, e.email\nFROM Employees e\nLEFT JOIN Departments d ON e.department_id = d.id\nWHERE d.id IS NULL` },
  { label: 'Projects With Team Size', category: 'Avanzado', sql: `SELECT p.name, p.project_status, COUNT(pa.employee_id) AS team_size\nFROM Projects p\nLEFT JOIN ProjectAssignments pa ON p.id = pa.project_id\nGROUP BY p.id, p.name, p.project_status\nORDER BY team_size DESC, p.name ASC` },
  { label: 'Customers With Multiple Orders', category: 'Avanzado', sql: `SELECT c.id, c.name, COUNT(o.id) AS orders_count\nFROM Customers c\nINNER JOIN Orders o ON c.id = o.customer_id\nGROUP BY c.id, c.name\nHAVING COUNT(o.id) > 1\nORDER BY orders_count DESC` }
];