/**
 * Medidor de cumplimiento global (correcciones 06.08): semicírculo tipo
 * velocímetro con aguja, de 0 % a 100 %.
 *
 * La banda va de rojo a verde de izquierda a derecha. Es una referencia visual
 * (peor → mejor), no una escala de umbrales: el dato exacto lo dan la aguja y
 * el número del centro.
 */
interface Props {
  /** 0-100. null => aguja al 0 y "—" en el centro. */
  value: number | null;
  label?: string;
  size?: number;
  /** Alto de la banda de color. */
  grosor?: number;
  /** Ancho máximo del SVG. En modo TV se agranda para que se lea de lejos. */
  claseSvg?: string;
}

export function GaugeCumplimiento({
  value,
  label = "Cumplimiento Global",
  size = 320,
  grosor = 26,
  claseSvg = "w-full max-w-[340px] h-auto",
}: Props) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));

  // Geometría: el semicírculo ocupa el ancho completo; el alto es la mitad
  // más el margen para la aguja y las etiquetas 0 % / 100 %.
  const cx = size / 2;
  const r = (size - grosor) / 2;
  const cy = grosor / 2 + r;
  const alto = cy + 34; // margen para las etiquetas debajo del eje

  const punto = (angulo: number, radio: number) => {
    const rad = (angulo * Math.PI) / 180;
    return { x: cx + radio * Math.cos(rad), y: cy - radio * Math.sin(rad) };
  };

  // 0 % = 180° (izquierda), 100 % = 0° (derecha).
  const anguloValor = 180 - (pct / 100) * 180;

  const ini = punto(180, r);
  const fin = punto(0, r);
  const arco = `M ${ini.x} ${ini.y} A ${r} ${r} 0 0 1 ${fin.x} ${fin.y}`;

  // Aguja: triángulo fino que NO llega al centro. Arranca por fuera del radio
  // que ocupa el número, así nunca lo cruza (con la aguja naciendo en el centro
  // se superponía justo en los valores del medio de la escala).
  const radioExterno = r * 0.9;
  const radioInterno = r * 0.45;
  const rad = (anguloValor * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: -Math.sin(rad) };
  const perp = { x: -dir.y, y: dir.x };
  const base = { x: cx + radioInterno * dir.x, y: cy + radioInterno * dir.y };
  const anchoAguja = 4;

  const p1 = punto(anguloValor, radioExterno);
  const p2 = { x: base.x + perp.x * anchoAguja, y: base.y + perp.y * anchoAguja };
  const p3 = { x: base.x - perp.x * anchoAguja, y: base.y - perp.y * anchoAguja };

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${alto}`}
        className={claseSvg}
        role="img"
        aria-label={`Cumplimiento global: ${value == null ? "sin datos" : `${Math.round(pct)}%`}`}
      >
        <defs>
          <linearGradient id="gauge-cumplimiento-banda" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="28%" stopColor="#F97316" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="78%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* Banda de color */}
        <path
          d={arco}
          fill="none"
          stroke="url(#gauge-cumplimiento-banda)"
          strokeWidth={grosor}
          strokeLinecap="butt"
        />

        {/* Aguja */}
        {value != null && (
          <>
            <polygon
              points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
              fill="#F9FAFB"
            />
            <circle cx={base.x} cy={base.y} r={anchoAguja} fill="#F9FAFB" />
          </>
        )}

        {/* Extremos de la escala, a los costados del eje */}
        <text x={grosor / 2} y={cy + 22} textAnchor="middle" className="fill-muted" fontSize="11">
          0%
        </text>
        <text x={size - grosor / 2} y={cy + 22} textAnchor="middle" className="fill-muted" fontSize="11">
          100%
        </text>

        {/* Valor: dentro del arco. Va después de la aguja a propósito, para que
            quede por encima cuando la aguja pasa cerca del centro. */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="38"
          fontWeight="700"
        >
          {value != null ? `${Math.round(pct)}%` : "—"}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" className="fill-muted" fontSize="12">
          {label}
        </text>
      </svg>
    </div>
  );
}
