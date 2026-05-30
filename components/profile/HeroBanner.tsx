import Link from "next/link";
import { Meteors } from "@/components/ui/meteors";

interface BorderStyle {
  color: string;
  glow: string;
}

interface HeroBannerProps {
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
}

export function HeroBanner({
  gameName, tagLine, level, iconUrl, borderImg, borderStyle,
  mainSplash, mainChampName, totalGames, totalWins, totalLosses,
  recentWR, avgKDA, profileName,
}: HeroBannerProps) {
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
        <div style={{ position: "absolute", inset: 0, background: "#050E1A" }} />
      )}

      {/* Gradientes de profundidade */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #050E1A 35%, transparent 80%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #050E1A 100%)" }} />

      {/* Meteoros */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Meteors number={8} />
      </div>

      {/* Conteúdo */}
      <div
        className="relative max-w-6xl mx-auto px-4 pt-10 pb-8"
        style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}
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
                style={{ position: "absolute", top: 12, left: 12, width: 86, height: 86, borderRadius: "50%", display: "block", zIndex: 1 }}
              />
              {borderImg && (
                <img
                  src={borderImg}
                  width={110}
                  height={110}
                  alt=""
                  aria-hidden="true"
                  style={{ position: "absolute", top: 0, left: 0, width: 110, height: 110, display: "block", zIndex: 2, pointerEvents: "none" }}
                />
              )}
              <span
                style={{
                  position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                  zIndex: 3, background: "#050E1A",
                  border: `1.5px solid ${borderStyle.color}`,
                  color: borderStyle.color,
                  fontSize: 11, fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: 9999, lineHeight: "16px",
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
              {gameName}
            </h1>
            <span style={{ color: "#6B7280", fontSize: 22, fontWeight: 700 }}>#{tagLine}</span>
            {mainChampName && (
              <span className="stat-pill">⚔️ {mainChampName}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {totalGames > 0 && (
              <>
                <span className="stat-pill">{totalGames} jogos recentes</span>
                <span
                  className="stat-pill"
                  style={{
                    background:   recentWR >= 50 ? "rgba(74,222,128,0.1)"  : "rgba(248,113,113,0.1)",
                    borderColor:  recentWR >= 50 ? "rgba(74,222,128,0.3)"  : "rgba(248,113,113,0.3)",
                    color:        recentWR >= 50 ? "#4ADE80"                : "#F87171",
                  }}
                >
                  {totalWins}V {totalLosses}D · {recentWR}% WR
                </span>
                <span className="stat-pill">KDA médio {avgKDA}</span>
              </>
            )}
            {profileName && (
              <span className="stat-pill" style={{ color: "#60A5FA", borderColor: "rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.1)" }}>
                👤 {profileName}
              </span>
            )}
          </div>
        </div>

        <Link
          href="/jogadores"
          style={{
            fontSize: 13, color: "#9CA3AF",
            border: "1px solid #1E3A5F", borderRadius: 8,
            padding: "6px 14px",
            background: "rgba(10,20,40,0.7)",
            textDecoration: "none",
            flexShrink: 0, alignSelf: "flex-start", marginTop: 4,
          }}
        >
          ← Jogadores
        </Link>
      </div>
    </div>
  );
}
