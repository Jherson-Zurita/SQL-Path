// Sample database SQL to pre-load into sql.js
export const SAMPLE_DB_SQL = `
-- ============================================================
-- Base de datos de ejemplo para sql.js
-- ============================================================

-- Tabla: Categories
CREATE TABLE Categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO Categories VALUES (1, 'Electrónica');
INSERT INTO Categories VALUES (2, 'Mobiliario');
INSERT INTO Categories VALUES (3, 'Accesorios');
INSERT INTO Categories VALUES (4, 'Software');

-- Tabla: Departments
CREATE TABLE Departments (
  id INTEGER PRIMARY KEY,
  department_name TEXT NOT NULL,
  location TEXT
);

INSERT INTO Departments VALUES (1, 'Engineering', 'Madrid');
INSERT INTO Departments VALUES (2, 'Marketing', 'Barcelona');
INSERT INTO Departments VALUES (3, 'Ventas', 'Sevilla');
INSERT INTO Departments VALUES (4, 'RRHH', 'Madrid');
INSERT INTO Departments VALUES (5, 'Finanzas', 'Valencia');

-- Tabla: Employees
-- FIX #19: email NULL en empleado 10 para que el ejercicio "Empleados sin email" tenga resultados
-- FIX #32/#89: departamento 1 (Engineering) ahora tiene 4 empleados activos para que HAVING COUNT(*) > 3 retorne filas
CREATE TABLE Employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  department_id INTEGER,
  salary REAL,
  hire_date TEXT,
  status TEXT DEFAULT 'ACTIVE',
  manager_id INTEGER,
  FOREIGN KEY (department_id) REFERENCES Departments(id)
);

INSERT INTO Employees VALUES (1,  'Ana García',         'ana@empresa.com',     1, 65000, '2020-03-15', 'ACTIVE',   NULL);
INSERT INTO Employees VALUES (2,  'Carlos López',       'carlos@empresa.com',  1, 58000, '2021-06-01', 'ACTIVE',   1);
INSERT INTO Employees VALUES (3,  'María Torres',       'maria@empresa.com',   2, 52000, '2019-11-20', 'ACTIVE',   NULL);
INSERT INTO Employees VALUES (4,  'Pedro Ruiz',         'pedro@empresa.com',   3, 48000, '2022-01-10', 'ACTIVE',   3);
INSERT INTO Employees VALUES (5,  'Laura Martín',       'laura@empresa.com',   1, 72000, '2018-07-22', 'ACTIVE',   NULL);
INSERT INTO Employees VALUES (6,  'Diego Sánchez',      'diego@empresa.com',   2, 45000, '2023-02-14', 'ACTIVE',   3);
INSERT INTO Employees VALUES (7,  'Sofía Navarro',      'sofia@empresa.com',   4, 55000, '2020-09-05', 'ACTIVE',   NULL);
INSERT INTO Employees VALUES (8,  'Javier Moreno',      'javier@empresa.com',  3, 51000, '2021-04-18', 'INACTIVE', 4);
INSERT INTO Employees VALUES (9,  'Elena Díaz',         'elena@empresa.com',   5, 67000, '2019-01-30', 'ACTIVE',   NULL);
-- FIX #19: email NULL para que "Empleados sin email" retorne al menos una fila
INSERT INTO Employees VALUES (10, 'Roberto Fernández',  NULL,                  1, 42000, '2023-08-01', 'ACTIVE',   1);
-- FIX #32: empleado extra en Engineering para que HAVING COUNT(*) > 3 retorne ese departamento
INSERT INTO Employees VALUES (11, 'Isabel Romero',      'isabel@empresa.com',  1, 54000, '2022-11-10', 'ACTIVE',   1);
INSERT INTO Employees VALUES (12, 'Luis Miguel',      'luismiguel@empresa.com',  NULL, NULL, '2026-11-10', 'ACTIVE',   NULL);

-- Tabla: Products
-- FIX #15: agregados 3 productos extra para que LIMIT 5 OFFSET 5 retorne exactamente 5 filas
CREATE TABLE Products (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  price REAL,
  category_id INTEGER,
  category TEXT,
  stock INTEGER DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES Categories(id)
);

INSERT INTO Products VALUES (1,  'Laptop Pro',           1299.99, 1, 'Electronics',  25);
INSERT INTO Products VALUES (2,  'Mouse Wireless',          29.99, 1, 'Electronics', 150);
INSERT INTO Products VALUES (3,  'Teclado Mecánico',        89.99, 1, 'Electronics',  75);
INSERT INTO Products VALUES (4,  'Monitor 27"',            449.99, 1, 'Electronics',  30);
INSERT INTO Products VALUES (5,  'Silla Ergonómica',       599.99, 2, 'Furniture',    12);
INSERT INTO Products VALUES (6,  'Escritorio Ajustable',   399.99, 2, 'Furniture',     8);
INSERT INTO Products VALUES (7,  'Auriculares BT',         149.99, 3, 'Accessories', 200);
INSERT INTO Products VALUES (8,  'Webcam HD',               79.99, 3, 'Accessories',  45);
-- FIX #15: tres productos extra para que LIMIT 5 OFFSET 5 devuelva 5 filas (registros 6-10)
INSERT INTO Products VALUES (9,  'Hub USB-C',               49.99, 3, 'Accessories',  60);
INSERT INTO Products VALUES (10, 'Lámpara LED Escritorio',  39.99, 2, 'Furniture',    35);
INSERT INTO Products VALUES (11, 'Alfombrilla XL',          24.99, 3, 'Accessories',  90);

-- Tabla: Customers
-- FIX #20: cliente sin country para que "Clientes sin país" retorne al menos una fila
-- FIX #76 (DDL ALTER TABLE): columna phone ELIMINADA del CREATE TABLE;
--          el ejercicio #76 se encarga de agregarla con ALTER TABLE
CREATE TABLE Customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  country TEXT,
  blocked INTEGER DEFAULT 0,
  saldo REAL DEFAULT 0
);

INSERT INTO Customers VALUES (1, 'Juan Pérez',      'juan@mail.com',    'Madrid',       'España',    0, 500);
INSERT INTO Customers VALUES (2, 'María González',  'maria.g@mail.com', 'México DF',    'México',    0, 300);
INSERT INTO Customers VALUES (3, 'Roberto Silva',   'rsilva@mail.com',  'Buenos Aires', 'Argentina', 0, 0);
INSERT INTO Customers VALUES (4, 'Carmen López',    'carmen@mail.com',  'Barcelona',    'España',    0, 0);
INSERT INTO Customers VALUES (5, 'Luis Rodríguez',  'luis.r@mail.com',  'Bogotá',       'Colombia',  0, 0);
INSERT INTO Customers VALUES (6, 'Ana Martínez',    'ana.m@mail.com',   'Lima',         'Perú',      0, 0);
-- FIX #20: country NULL para que WHERE country IS NULL retorne al menos una fila
INSERT INTO Customers VALUES (7, 'Cliente Sin País', 'sinpais@mail.com', 'Desconocida', NULL,        0, 0);

-- Tabla: Orders
-- FIX #89 (Clientes VIP): Juan Pérez (id=1) ahora tiene 6 pedidos y gasto total > 1000
--          para que HAVING COUNT(*) > 5 AND SUM(total) > 1000 retorne resultados
CREATE TABLE Orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  product_id INTEGER,
  employee_id INTEGER,
  quantity INTEGER,
  order_date TEXT,
  total REAL,
  status TEXT DEFAULT 'PENDING',
  FOREIGN KEY (customer_id) REFERENCES Customers(id),
  FOREIGN KEY (product_id) REFERENCES Products(id),
  FOREIGN KEY (employee_id) REFERENCES Employees(id)
);

INSERT INTO Orders VALUES (1,  1, 1,  1, 1, '2024-01-15', 1299.99, 'DELIVERED');
INSERT INTO Orders VALUES (2,  1, 2,  1, 2, '2024-01-15',   59.98, 'DELIVERED');
INSERT INTO Orders VALUES (3,  2, 5,  2, 1, '2024-02-20',  599.99, 'PROCESSING');
INSERT INTO Orders VALUES (4,  3, 7,  5, 3, '2024-03-10',  449.97, 'PENDING');
INSERT INTO Orders VALUES (5,  4, 3,  3, 1, '2024-03-22',   89.99, 'PROCESSING');
INSERT INTO Orders VALUES (6,  5, 4,  2, 2, '2024-04-05',  899.98, 'PENDING');
INSERT INTO Orders VALUES (7,  1, 8,  1, 1, '2024-04-18',   79.99, 'DELIVERED');
INSERT INTO Orders VALUES (8,  3, 1,  5, 1, '2024-05-02', 1299.99, 'PROCESSING');
INSERT INTO Orders VALUES (9,  6, 6,  4, 1, '2024-05-15',  399.99, 'DELIVERED');
INSERT INTO Orders VALUES (10, 2, 2,  2, 5, '2024-06-01',  149.95, 'PENDING');
-- FIX #89: pedidos extra para Juan Pérez (id=1) → 6 pedidos en total, gasto > 1000
INSERT INTO Orders VALUES (11, 1, 3,  1, 1, '2024-06-10',   89.99, 'DELIVERED');
INSERT INTO Orders VALUES (12, 1, 7,  1, 2, '2024-06-20',  299.98, 'DELIVERED');
INSERT INTO Orders VALUES (13, 1, 9,  1, 1, '2024-07-05',   49.99, 'DELIVERED');
INSERT INTO Orders VALUES (14, 1, 10, 1, 1, '2024-07-15',   39.99, 'PENDING');

-- Tabla: Salaries (historial)
CREATE TABLE Salaries (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER,
  salary REAL,
  effective_date TEXT,
  FOREIGN KEY (employee_id) REFERENCES Employees(id)
);

INSERT INTO Salaries VALUES (1, 1, 55000, '2020-03-15');
INSERT INTO Salaries VALUES (2, 1, 60000, '2021-03-15');
INSERT INTO Salaries VALUES (3, 1, 65000, '2022-03-15');
INSERT INTO Salaries VALUES (4, 2, 50000, '2021-06-01');
INSERT INTO Salaries VALUES (5, 2, 58000, '2022-06-01');
INSERT INTO Salaries VALUES (6, 5, 60000, '2018-07-22');
INSERT INTO Salaries VALUES (7, 5, 66000, '2020-07-22');
INSERT INTO Salaries VALUES (8, 5, 72000, '2022-07-22');

-- Tabla: Projects
CREATE TABLE Projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  project_status TEXT,
  budget REAL
);

INSERT INTO Projects VALUES (1, 'Portal Web',      'ONGOING',   150000);
INSERT INTO Projects VALUES (2, 'App Móvil',       'ONGOING',   200000);
INSERT INTO Projects VALUES (3, 'Migración Cloud', 'COMPLETED', 500000);
INSERT INTO Projects VALUES (4, 'Rediseño UX',     'ONGOING',    80000);

-- Tabla: ProjectAssignments
CREATE TABLE ProjectAssignments (
  employee_id INTEGER,
  project_id INTEGER,
  role TEXT,
  PRIMARY KEY (employee_id, project_id),
  FOREIGN KEY (employee_id) REFERENCES Employees(id),
  FOREIGN KEY (project_id) REFERENCES Projects(id)
);

INSERT INTO ProjectAssignments VALUES (1, 1, 'Lead');
INSERT INTO ProjectAssignments VALUES (2, 1, 'Developer');
INSERT INTO ProjectAssignments VALUES (5, 2, 'Lead');
INSERT INTO ProjectAssignments VALUES (2, 2, 'Developer');
INSERT INTO ProjectAssignments VALUES (1, 3, 'Architect');
INSERT INTO ProjectAssignments VALUES (6, 4, 'Designer');
INSERT INTO ProjectAssignments VALUES (3, 4, 'Manager');

-- Tabla: Suppliers
CREATE TABLE Suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  city TEXT,
  country TEXT,
  phone TEXT
);

INSERT INTO Suppliers (id, name, email, city, country) VALUES
  (1, 'Proveedor Madrid',         'proveedor1@mail.com', 'Madrid',       'España'),
  (2, 'Suministros México',       'supplier_mx@mail.com','México DF',    'México'),
  (3, 'Logística Argentina',      'logistica@ar.com',    'Buenos Aires', 'Argentina'),
  (4, 'Distribuciones Barcelona', 'distri@bcn.com',      'Barcelona',    'España');

-- Tabla: ArchivoEmpleados
-- Estructura idéntica a Employees para el ejercicio #83 (INSERT con SELECT)
CREATE TABLE ArchivoEmpleados (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  department_id INTEGER,
  salary REAL,
  hire_date TEXT,
  status TEXT,
  manager_id INTEGER
);
`;