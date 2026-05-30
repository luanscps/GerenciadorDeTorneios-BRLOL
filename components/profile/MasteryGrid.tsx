import { championIconByCDragon, masteryLevelColor } from "@/lib/riot";

interface Mastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  championName?: string;
}

interface MasteryGridProps {
  masteries: Mastery[];
  champById: Record<number, string>;
}

function formatPoints(pts: number): string {
  if (pts >= 1_000_000) return `${(pts / 1_000_000).toFixed(1)}M`;
  if (pts >= 1_000)     return `${(pts / 1_000).toFixed(0)}k`;
  return String(pts);
}

export function MasteryGrid({ masteries, champById }: MasteryGridProps) {
  if (!masteries.length) return null;

  return (
    <div
      style={{
        background: "#0A1428",
        border: "1px solid rgba(30,58,95,0.8)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <p style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
        🏆 Top Campeões — Maestria
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {masteries.map((m) => {
          const name  = champById[m.championId] ?? m.championName ?? "";
          const color = masteryLevelColor(m.championLevel);
          const pts   = formatPoints(m.championPoints);
          return (
            <div
              key={m.championId}
              title={`${name} — M${m.championLevel} — ${pts}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "rgba(10,20,40,0.7)",
                border: `1.5px solid ${color}44`,
                borderRadius: 12, padding: "10px 10px 8px", minWidth: 76,
                transition: "transform 200ms ease, border-color 200ms ease",
              }}
              className="hover:scale-105"
            >
              <div style={{ position: "relative", width: 52, height: 52 }}>
                <img
                  src={championIconByCDragon(m.championId)}
                  width={52}
                  height={52}
                  alt={name}
                  style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", display: "block", border: `2px solid ${color}` }}
                />
                <span
                  style={{
                    position: "absolute", bottom: -6, right: -6,
                    background: "#050E1A", border: `1px solid ${color}`,
                    color, fontSize: 9, fontWeight: 800,
                    borderRadius: 9999, padding: "1px 5px", lineHeight: "14px",
                    whiteSpace: "nowrap", zIndex: 2,
                  }}
                >
                  M{m.championLevel}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#D1D5DB", maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center", marginTop: 8 }}>
                {name}
              </p>
              <p style={{ fontSize: 11, color, fontWeight: 700, textAlign: "center" }}>{pts}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
