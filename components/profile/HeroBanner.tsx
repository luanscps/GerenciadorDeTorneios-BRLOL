import Link from "next/link";
import { Swords, User, ArrowLeft } from "lucide-react";
import { Meteors } from "@/components/ui/meteors";

interface BorderStyle {
  color: string;
  glow: string;
}

export interface HeroBannerProps {
  gameName: string;
  tagLine: string;
  level: number;
  iconUrl: string | null;
  borderImg: string | null;
  borderStyle: BorderStyle;
  mainSplash: string | null;
  mainChampName: string | null;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  recentWR: number;
  avgKDA: string;
  profileName?: string | null;
  /** Nome do perfil ArenaGG vinculado (exibido como badge azul) — equivale a isLinked */
  linkedProfileName?: string | null;
}

export function HeroBanner({
  gameName, tagLine, level, iconUrl, borderImg, borderStyle,
  mainSplash, mainChampName, totalGames, totalWins, totalLosses,
  recentWR, avgKDA, profileName, linkedProfileName,
}: HeroBannerProps) {
  // profileName mantido por retrocompatibilidade; linkedProfileName tem precedência
  const displayLinked = linkedProfileName ?? profileName ?? null;

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: 260 }}>
      {/* Splash art do campeão principal como fundo */}
      {mainSplash ? (
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${mainSplash})`,
            backgroundSize: "cover",
            backgroundPosition: "center 15%",
            filter: "brightness(0.30) saturate(1.3)",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }} />
      )}

      {/* Gradientes de profundidade */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, var(--bg) 35%, transparent 80%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, var(--bg) 100%)" }} />

      {/* Meteoros */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Meteors number={8} />
      </div>

      {/* Conteúdo */}
      <div
        className="relative max-w-6xl mx-auto px-4 pt-10 pb-8"
        style={{ display: "flex", alignItems: "flex-end", gap: "var(--sp-6)", flexWrap: "wrap" }}
      >
        {/* Ícone + moldura + badge de nível */}
        <div style={{ position: "relative", width: 110, height: 126, flexShrink: 0 }}>
          {iconUrl && (
            <>
              <img
                src={iconUrl}
                width={86}
                height={86}
                alt="Ícone de perfil"
                loading="lazy"
                style={{
                  position: "absolute", top: 12, left: 12,
                  width: 86, height: 86,
                  borderRadius: "50%",
                  display: "block",
                  zIndex: 1,
                }}
              />
              {borderImg && (
                <img
                  src={borderImg}
                  width={110}
                  height={110}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: 110, height: 110,
                    display: "block", zIndex: 2,
                    pointerEvents: "none",
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute", bottom: 0, left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                  background: "var(--bg)",
                  border: `1.5px solid ${borderStyle.color}`,
                  color: borderStyle.color,
                  fontSize: 11, fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: "var(--radius-full)",
                  lineHeight: "16px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 0 8px ${borderStyle.glow}`,
                }}
              >
                Nv. {level}
              </span>
            </>
          )}
        </div>

        {/* Nome + stats pills */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex", alignItems: "center",
              gap: "var(--sp-3)", flexWrap: "wrap",
              marginBottom: "var(--sp-2)",
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xl)",
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
              }}
            >
              {gameName}
            </h1>
            <span
              style={{
                color: "var(--text-faint)",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              #{tagLine}
            </span>
            {mainChampName && (
              <span className="stat-pill">
                <Swords size={12} aria-hidden="true" />
                {mainChampName}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex", gap: "var(--sp-2)",
              flexWrap: "wrap", alignItems: "center",
            }}
          >
            {totalGames > 0 && (
              <>
                <span className="stat-pill">{totalGames} jogos recentes</span>
                <span
                  className="stat-pill"
                  style={{
                    background:  recentWR >= 50 ? "var(--win-dim)"        : "var(--loss-dim)",
                    borderColor: recentWR >= 50 ? "rgba(34,197,94,0.3)"  : "rgba(239,68,68,0.3)",
                    color:       recentWR >= 50 ? "var(--win)"            : "var(--loss)",
                  }}
                >
                  {totalWins}V {totalLosses}D · {recentWR}% WR
                </span>
                <span className="stat-pill">KDA médio {avgKDA}</span>
              </>
            )}
            {displayLinked && (
              <span
                className="stat-pill"
                style={{
                  color: "var(--blue)",
                  borderColor: "var(--blue-dim, rgba(85,145,199,0.3))",
                  background: "var(--blue-dim, rgba(85,145,199,0.1))",
                }}
              >
                <User size={12} aria-hidden="true" />
                {displayLinked}
              </span>
            )}
          </div>
        </div>

        {/* Botão voltar */}
        <Link
          href="/jogadores"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--sp-2)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 14px",
            background: "var(--surface)",
            textDecoration: "none",
            flexShrink: 0,
            alignSelf: "flex-start",
            marginTop: 4,
            transition: "border-color var(--duration) var(--ease-out), color var(--duration) var(--ease-out)",
          }}
          className="hover:border-[var(--gold)] hover:text-[var(--gold)]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Jogadores
        </Link>
      </div>
    </div>
  );
}
