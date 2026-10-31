export interface AreaConfig {
  id: 'docente' | 'coordinacion' | 'administracion'
  nombre: string
  icono: string
  descripcion: string
  campo: string
  ejemplo: string
}

export const areas: Record<string, AreaConfig> = {
  docente: {
    id: 'docente',
    nombre: 'Docente',
    icono: '👩‍🏫',
    descripcion: 'Consulta los resultados y clasificaciones de desempeño de tus grupos',
    campo: 'Número de cuenta o correo institucional',
    ejemplo: 'DOC001',
  },
  coordinacion: {
    id: 'coordinacion',
    nombre: 'Coordinación',
    icono: '📊',
    descripcion: 'Revisa promedios, aptitud de asignación y métricas por materia',
    campo: 'Número de cuenta o correo institucional',
    ejemplo: 'COORD001',
  },
  administracion: {
    id: 'administracion',
    nombre: 'Administración',
    icono: '⚙️',
    descripcion: 'Gestión de usuarios, materias, preguntas y periodos escolares',
    campo: 'Número de cuenta o correo institucional',
    ejemplo: 'ADMIN001',
  },
}
