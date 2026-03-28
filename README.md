<div align="center">
  <img src="public/icon.svg" alt="SQL Path Logo" width="120" />
  <h1>SQL Path</h1>
  <p>🚀 <i>Una plataforma web interactiva y visual para aprender, explorar y dominar bases de datos SQL directamente en tu navegador.</i></p>
</div>

---

## 📖 ¿De qué trata el proyecto?

**SQL Path** es un entorno educativo y profesional diseñado para revolucionar la manera en que interactuamos con las bases de datos. 

En lugar de requerir complejas instalaciones locales o depender de conexiones a servidores externos, la aplicación ejecuta un potente motor de **SQLite completamente dentro del navegador** (gracias a WebAssembly). Esto significa que puedes explorar bases de datos, practicar con consultas complejas y aprender conceptos avanzados en un entorno rápido, privado y sin riesgo de romper nada en servidores reales.

Ya sea que estés dando tus primeros pasos en el análisis de datos o seas un desarrollador buscando un _Playground_ ágil para diseñar esquemas y probar código, SQL Path es la herramienta definitiva.

---

## 🛠️ Tecnologías y Herramientas

Este proyecto está construido con un stack moderno y eficiente diseñado para brindar el máximo rendimiento y la mejor experiencia de usuario en el navegador:

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite_WASM-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

*   **[React](https://react.dev/):** Para construir una interfaz interactiva y reactiva.
*   **[Vite](https://vitejs.dev/):** Empleado como herramienta de desarrollo ultra-rápida.
*   **[TypeScript](https://www.typescriptlang.org/):** Para asegurar código de alta calidad, robusto y libre de errores.
*   **[sql.js (WebAssembly)](https://sql.js.org/):** El corazón de la aplicación, ejecutando bases de datos SQLite localmente en la web de forma ultrarrápida.
*   **[CodeMirror](https://codemirror.net/):** Como editor de código avanzado con resaltado de sintaxis SQL.

---

## 🧩 Módulos Principales (El Sidebar)

La plataforma está dividida en diferentes módulos accesibles desde la barra lateral (Sidebar), cada uno con un propósito específico:

### ⌨️ Editor SQL (Visualizador)
El área principal y más visual, especialmente útil para comprender intuitivamente el flujo de los datos y cómo interaccionan diferentes consultas a través de interfaces como diagramas de Venn.
<img width="1366" height="614" alt="Image" src="https://github.com/user-attachments/assets/46bd221e-0362-480c-bf8e-a7f277a9791e" />


### 🗄️ Schema (El Playground)
Un entorno profesional para la gestión de bases de datos. Cuenta con un **sistema de pestañas múltiples** (para trabajar en varias consultas a la vez), gestión de tablas a un simple clic y resultados de datos instantáneos. Es literalmente tu banco de pruebas de SQL.

<img width="1366" height="617" alt="Image" src="https://github.com/user-attachments/assets/1a218d8f-e531-43cb-ad99-a275ca5911f9" />

### 📋 Comandos
Una completa hoja de trucos (cheatsheet) integrada. Encontrarás referencia rápida sobre cómo estructurar consultas comunes, útiles para cuando estás en pleno diseño y necesitas recordar la sintaxis exacta de un comando.

<img width="1366" height="616" alt="Image" src="https://github.com/user-attachments/assets/d9b80b85-60ac-426c-8f0b-6711fb713c53" />

### 📐 DbDraw
Visualizador gráfico de esquemas de bases de datos para entender fácilmente las relaciones (Entidad-Relación) entre múltiples tablas de un vistazo, de gran ayuda para bases de datos complejas.

<img width="1365" height="617" alt="Image" src="https://github.com/user-attachments/assets/a4379fd1-d2a1-46e1-b836-402fb2d8b571" />

### 🔒 Seguridad
Módulo educativo diseñado para enseñar los aspectos más importantes de administración de bases de datos: gestión de **Roles**, **Privilegios**, características **ACID** y control de Transacciones.

<img width="1366" height="616" alt="Image" src="https://github.com/user-attachments/assets/92cd1a5d-2481-4918-8d2e-00d7f27df212" />

### 🎯 Desafíos
Un entorno "Aprender Haciendo". Aquí encontrarás retos SQL dinámicos con seguimiento de progreso, perfectos para poner a prueba tus conocimientos escribiendo consultas reales para superar cada nivel.

<img width="1364" height="615" alt="Image" src="https://github.com/user-attachments/assets/f31080af-b2c1-4ef6-a9b2-fa3cf38d3347" />

### 📂 e 📤 Importar y Exportar
Gestiona tus proyectos libremente. Puedes cargar cualquier archivo de base de datos `.sqlite` existente para auditarlo en nuestra app, y de igual forma, descargar todo tu progreso en un archivo para llevarlo donde quieras.

<img width="1365" height="617" alt="Image" src="https://github.com/user-attachments/assets/07a01c52-a917-429f-8aa7-6ac03dd3e4ec" />

<img width="1366" height="617" alt="Image" src="https://github.com/user-attachments/assets/25894e81-3c57-4e6b-8a5f-3c7b0bf8a979" />

---

## 🚀 Cómo ejecutar el proyecto localmente

Si deseas contribuir, añadir plantillas, o correr el entorno de desarrollo en tu propia máquina, sigue estos pasos:

1. **Clona este repositorio:**
   ```bash
   git clone https://github.com/usuario/sql-path.git
   cd sql-path
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Inicia el entorno de desarrollo con Vite:**
   ```bash
   npm run dev
   ```

4. Abre tu navegador y dirígete a `http://localhost:5173`. ¡Listo!

---

<p align="center">
  <i>Construido para aprender y dominar SQL.</i>
</p>
