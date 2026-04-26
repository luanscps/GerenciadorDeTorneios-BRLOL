"use client";
/**
 * ProfileIcon — ícone de perfil do invocador com moldura animada via SVG.
 *
 * Usa SVG circular com stroke animado para garantir que a moldura
 * apareça corretamente no Next.js App Router (Server + Client hydration).
 * Os @keyframes ficam no globals.css para garantir que estejam disponíveis.
 */
interface Props {
  iconUrl: string;
  level: number;
  color: string;
  glow: string;
  size?: number;
}

export default function ProfileIcon({ iconUrl, level, color, glow, size = 96 }: Props) {
  const r   = (size / 2) - 4;          // raio do anel (4px de margem)
  const cx  = size / 2;
  const cy  = size / 2;
  const c   = 2 * Math.PI * r;         // circunferência
  const img = size - 12;               // tamanho da imagem interna
  const off = (size - img) / 2;        // offset centralizado

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Imagem de perfil */}
      <img
        src={iconUrl}
        width={img}
        height={img}
        alt="Ícone de Perfil"
        style={{
          position: "absolute",
          top: off,
          left: off,
          width: img,
          height: img,
          borderRadius: "50%",
          display: "block",
          objectFit: "cover",
        }}
      />

      {/* Moldura SVG animada */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* Glow difuso atrás do anel */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={6}
          strokeOpacity={0.25}
          className="profile-frame-ring"
        />
        {/* Anel principal animado (dash correndo) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.6} ${c * 0.4}`}
          className="profile-frame-dash"
          style={{
            filter: `drop-shadow(0 0 6px ${glow})`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        />
        {/* Segundo arco menor contra-girando para efeito premium */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.15} ${c * 0.85}`}
          className="profile-frame-dash"
          style={{
            filter: `drop-shadow(0 0 3px ${glow})`,
            transformOrigin: `${cx}px ${cy}px`,
            animationDirection: "reverse",
            animationDuration: "5s",
          }}
        />
      </svg>

      {/* Badge de nível */}
      <span
        style={{
          position: "absolute",
          bottom: -9,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "#0A1428",
          border: `1px solid ${color}`,
          color: color,
          fontSize: 10,
          fontWeight: 700,
          padding: "1px 7px",
          borderRadius: 9999,
          lineHeight: "16px",
          whiteSpace: "nowrap",
          boxShadow: `0 0 6px ${glow}`,
        }}
      >
        Nv. {level}
      </span>
    </div>
  );
}
