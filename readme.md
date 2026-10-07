# Sistema de Información de Evaluación Docente Institucional Adaptable

Este repositorio contiene el código fuente del **Sistema de Información de Evaluación Docente Institucional Adaptable**, una aplicación web multiplataforma (cliente-servidor) diseñada para gestionar, monitorear y analizar el desempeño docente mediante evaluaciones realizadas por los estudiantes.

## 🎯 Objetivo del Proyecto
Proporcionar a cualquier institución educativa una herramienta confiable para la evaluación docente estandarizada, seguimiento de participación estudiantil, generación de métricas y gráficos, consulta de históricos y asignación objetiva de carga académica, todo a través de una interfaz responsiva y accesible.

## 🛠 Stack Tecnológico y Arquitectura
El sistema está construido bajo una arquitectura de 3 capas (Presentación, Lógica y Datos) comunicadas mediante una API REST:

*   **Frontend (Capa de Presentación):** React.js con Tailwind CSS (Vite).
*   **Backend (Capa de Lógica):** Node.js con Express.
*   **Base de Datos (Capa de Datos):** Base de datos relacional SQL (PostgreSQL en Neon o instancia local para desarrollo).
*   **Seguridad:** Autenticación mediante JWT (JSON Web Tokens) y contraseñas cifradas con bcrypt.
*   **Servicios Adicionales:** 
    *   Envío de correos automáticos (Ethereal/Mailtrap para dev, Brevo para prod).
    *   Generación de PDFs (PDFKit o Puppeteer).
    *   Gráficos institucionales (Recharts o Chart.js).

## 👥 Equipo de Desarrollo (Sprint 4)
*   **Juan Angulo:** Scrum Master, Líder de Proyecto, Documentación e Integración.
*   **Brian De La Cruz:** Desarrollador Backend, Base de Datos (SQL) y Pruebas.
*   **Jess Urbina:** Diseñadora UI/UX, Desarrolladora Frontend.
*   **Rafael Béjar:** Desarrollador Frontend y Pruebas de Sistema.

## 🚀 Instalación y Configuración Local

Dado que el entorno local sirve como nuestro plan de contingencia (Plan B) para la ejecución del sistema, asegúrate de seguir estos pasos:

### Requisitos Previos
*   [Node.js](https://nodejs.org/) instalado.
*   Gestor de paquetes `npm` o `pnpm`.
*   [Git](https://git-scm.com/) instalado.
*   Servidor local de Base de Datos SQL (PostgreSQL/MySQL) y [DBeaver](https://dbeaver.io/) para gestión.

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/[TU_USUARIO]/EvDocente.git
   cd EvDocente
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crea un archivo `.env` en la raíz del proyecto. **Importante: Este archivo nunca debe subirse al repositorio.**
   Pide a un administrador del equipo las credenciales base, las cuales deben incluir:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASS=tu_contraseña
   DB_NAME=evdocente
   JWT_SECRET=tu_clave_secreta
   ```

4. **Base de Datos:**
   Ejecuta el script SQL principal (`EVDocente.sql`) en tu gestor de base de datos local para crear las tablas, relaciones y datos de prueba.

5. **Iniciar el Servidor (Desarrollo):**
   ```bash
   npm run dev
   ```

## 📌 Funcionalidades Principales por Rol
*   **Administrador:** Gestión de usuarios, configuración de campus, carreras, grupos, ciclos académicos y talleres/laboratorios.
*   **Coordinador Académico:** Dashboard en tiempo real, seguimiento de participación, promedios, ranking docente e históricos (exportables a PDF).
*   **Docente:** Consulta de desempeño propio, histórico de ciclos y clasificación de materias asignadas.
*   **Alumno:** Visualización de avance, evaluación de docentes (cuestionario de 15 preguntas) y evaluación de laboratorios/talleres.

## 📈 Estado Actual: Sprint 4
Nos encontramos en la fase de **Ejecución**. Sprints 1, 2 y 3 completados.
Actualmente desarrollando:
*   Backend para guardado de evaluaciones.
*   Base de datos: carga inicial y pruebas de guardado.
*   Interfaz Gráfica: UI de Docente.
*   Lógica de Roles y Permisos.

---
*Materia: Diseño y Gestión de Sistemas - 7mo Semestre, UVM.*