/**
 * Paleta de colores para las actividades de la agenda (correcciones 06.08:
 * "agregar la opción de variar los colores de cada actividad").
 *
 * Se guarda la CLAVE en `agenda_actividad.color`, no el hex: así el color
 * sobrevive a un cambio de paleta y no entra CSS arbitrario desde la base.
 * Una actividad sin color usa el color de su unidad, como hasta ahora.
 */
export const COLORES_AGENDA = [
  { key: "azul", nombre: "Azul", hex: "#3B82F6" },
  { key: "verde", nombre: "Verde", hex: "#10B981" },
  { key: "ambar", nombre: "Ámbar", hex: "#F59E0B" },
  { key: "rojo", nombre: "Rojo", hex: "#EF4444" },
  { key: "violeta", nombre: "Violeta", hex: "#8B5CF6" },
  { key: "cian", nombre: "Cian", hex: "#06B6D4" },
  { key: "rosa", nombre: "Rosa", hex: "#EC4899" },
  { key: "gris", nombre: "Gris", hex: "#6B7280" },
] as const;

export type ColorAgenda = (typeof COLORES_AGENDA)[number]["key"];

export const CLAVES_COLOR_AGENDA = COLORES_AGENDA.map((c) => c.key) as readonly string[];

export function esColorAgenda(v: string | null | undefined): v is ColorAgenda {
  return !!v && CLAVES_COLOR_AGENDA.includes(v);
}

/** Hex de una clave de color, o null si no está cargada / no se reconoce. */
export function hexDeColor(v: string | null | undefined): string | null {
  return COLORES_AGENDA.find((c) => c.key === v)?.hex ?? null;
}

/**
 * Estilos inline para pintar un chip con un color de la paleta. Van inline y no
 * como clases de Tailwind porque el color es un dato, no algo conocido en build.
 */
export function estiloChip(hex: string): React.CSSProperties {
  return {
    backgroundColor: `${hex}26`, // ~15 % de opacidad
    borderColor: `${hex}59`,
    color: hex,
  };
}
