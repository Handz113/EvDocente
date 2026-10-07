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
