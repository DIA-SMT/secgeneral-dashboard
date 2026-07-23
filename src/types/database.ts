// Tipos que reflejan el schema de Supabase.
// Generados manualmente para el MVP. Cuando el schema se estabilice
// se puede usar `supabase gen types typescript` para auto-generar.

export type EstadoSemaforo = "verde" | "amarillo" | "rojo" | "gris" | "sin_datos";
export type EstadoProyecto = "borrador" | "activo" | "pausado" | "completado" | "cancelado";
export type TipoMedicion = "cuantitativo" | "cualitativo" | "hito_unico";
export type TipoUnidad = "secretaria" | "subsecretaria" | "direccion" | "departamento" | "coordinacion" | "otro";
export type FuenteAvance = "manual" | "importacion" | "chatbot" | "audio" | "correccion";
export type RolUsuario =
  | "intendenta"
  | "secretario"
  | "subsecretario"
  | "director"
  | "admin_funcional"
  | "admin_tecnico";
export type EstadoValidacion = "pendiente" | "validado" | "observado";
export type FrecuenciaMedicion = "mensual" | "bimestral" | "trimestral" | "semestral" | "anual" | "puntual";

export interface UnidadOrganizacional {
  id: string;
  parent_id: string | null;
  nombre: string;
  nombre_corto: string | null;
  tipo: TipoUnidad;
  nivel: number;
  orden: number;
  responsable_nombre: string | null;
  activa: boolean;
  codigo: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Periodo {
  id: string;
  anio: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  configuracion: {
    umbrales_semaforo?: {
      verde_min: number;
      amarillo_min: number;
      dias_sin_actualizar_alerta: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface Proyecto {
  id: string;
  periodo_id: string;
  unidad_id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: EstadoProyecto;
  peso: number | null;
  orden: number;
  observaciones: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  unidad?: UnidadOrganizacional;
  metas?: Meta[];
  hitos?: Hito[];
  _count?: { metas: number; hitos: number; avances: number };
}

export interface NivelEscala {
  clave: string;
  label: string;
  valor_numerico: number;
}

export interface Meta {
  id: string;
  proyecto_id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  tipo_medicion: TipoMedicion;
  unidad_medida: string | null;
  valor_linea_base: number | null;
  valor_meta: number | null;
  escala_cualitativa: { niveles: NivelEscala[] } | null;
  frecuencia_medicion: FrecuenciaMedicion | null;
  medio_verificacion: string | null;
  fecha_inicio: string | null;
  fecha_limite: string | null;
  peso: number | null;
  orden: number;
  // Campos materializados (derivados de avance)
  valor_actual: number | null;
  nivel_actual: string | null;
  estado_semaforo: EstadoSemaforo;
  ultima_actualizacion: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hito {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string | null;
  fecha_esperada: string | null;
  obligatorio: boolean;
  peso: number | null;
  orden: number;
  completado: boolean;
  fecha_completado: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Avance {
  id: string;
  proyecto_id: string;
  meta_id: string | null;
  hito_id: string | null;
  fecha_reporte: string;
  fuente: FuenteAvance;
  valor_numerico: number | null;
  valor_cualitativo: string | null;
  observacion: string | null;
  created_by: string | null;
  payload_original: Record<string, unknown> | null;
  reemplaza_avance_id: string | null;
  estado_validacion: EstadoValidacion;
  validado_por: string | null;
  validado_at: string | null;
  observacion_validacion: string | null;
  created_at: string;
}

export interface PerfilUsuario {
  user_id: string;
  email: string;
  nombre: string | null;
  rol: RolUsuario;
  unidad_id: string | null;
  activo: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  unidad?: UnidadOrganizacional;
}

export interface Indicador {
  id: string;
  meta_id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  formula: string | null;
  unidad_medida: string | null;
  valor_actual: number | null;
  valor_actual_texto: string | null;
  valor_objetivo: number | null;
  valor_objetivo_texto: string | null;
  observacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado_semaforo: EstadoSemaforo;
  ultima_actualizacion: string | null;
  orden: number;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  meta?: Meta;
}

export interface AgendaSemana {
  id: string;
  unidad_id: string;
  fecha_lunes: string;
  formato_libre: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  unidad?: UnidadOrganizacional;
  actividades?: AgendaActividad[];
}

export interface AgendaActividad {
  id: string;
  agenda_semana_id: string;
  dia_semana: number; // 1=Lunes ... 7=Domingo
  orden: number;
  es_feriado: boolean;
  actividad: string;
  lugar: string | null;
  horario: string | null;
  observacion: string | null;
  created_at: string;
}

export interface FichaPrisma {
  id: string;
  unidad_id: string;
  anio: number;
  codigo: string | null;
  programa: string;       // P
  relevancia: string | null;  // R
  indicador: string | null;   // I
  secretaria: string | null;  // S
  meta_anual: string | null;  // M
  ancla: string | null;       // A
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  unidad?: UnidadOrganizacional;
}

type TableDefinition<RowType> = {
  Row: RowType;
  Insert: Partial<RowType>;
  Update: Partial<RowType>;
  Relationships: [];
};

// Tipo helper para la DB de Supabase con el shape esperado por supabase-js.
export interface Database {
  public: {
    Tables: {
      unidad_organizacional: TableDefinition<UnidadOrganizacional>;
      periodo: TableDefinition<Periodo>;
      proyecto: TableDefinition<Proyecto>;
      meta: TableDefinition<Meta>;
      hito: TableDefinition<Hito>;
      avance: TableDefinition<Avance>;
      indicador: TableDefinition<Indicador>;
      agenda_semana: TableDefinition<AgendaSemana>;
      agenda_actividad: TableDefinition<AgendaActividad>;
      perfil_usuario: TableDefinition<PerfilUsuario>;
      ficha_prisma: TableDefinition<FichaPrisma>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_semaforo: EstadoSemaforo;
      estado_proyecto: EstadoProyecto;
      tipo_medicion: TipoMedicion;
      tipo_unidad: TipoUnidad;
      fuente_avance: FuenteAvance;
      frecuencia_medicion: FrecuenciaMedicion;
    };
    CompositeTypes: Record<string, never>;
  };
}
