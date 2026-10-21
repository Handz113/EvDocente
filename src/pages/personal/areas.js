// Configuración de cada área del personal (se usa en el login y en sus páginas)
export const areas = {
  docente: {
    id: 'docente',
    nombre: 'Docente',
    icono: '👩‍🏫',
    descripcion: 'Consulta los resultados de tus grupos',
    campo: 'Número de empleado',
    ejemplo: 'D01',
  },
  coordinacion: {
    id: 'coordinacion',
    nombre: 'Coordinación',
    icono: '📊',
    descripcion: 'Revisa resultados por docente y materia',
    campo: 'Usuario de coordinación',
    ejemplo: 'coord',
  },
  administracion: {
    id: 'administracion',
    nombre: 'Administración',
    icono: '⚙️',
    descripcion: 'Usuarios, catálogos y periodos',
    campo: 'Usuario de administrador',
    ejemplo: 'admin',
  },
}
