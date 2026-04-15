// Tipos que reflejan el schema de Supabase.
// Generados manualmente para el MVP. Cuando el schema se estabilice
// se puede usar `supabase gen types typescript` para auto-generar.

export type EstadoSemaforo = "verde" | "amarillo" | "rojo" | "gris" | "sin_datos";
export type EstadoProyecto = "borrador" | "activo" | "pausado" | "completado" | "cancelado";
export type TipoMedicion = "cuantitativo" | "cualitativo" | "hito_unico";
export type TipoUnidad = "secretaria" | "subsecretaria" | "direccion" | "departamento" | "coordinacion" | "otro";
export type FuenteAvance = "manual" | "importacion" | "chatbot" | "audio";
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
  created_at: string;
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
