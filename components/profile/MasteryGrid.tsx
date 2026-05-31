import { Trophy } from "lucide-react";
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
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
        <Trophy size={14} style={{ color: "var(--gold)" }} aria-hidden="true" />
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Top Campeões — Maestria
        </p>
      </div>

      <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
        {masteries.map((m) => {
          const name  = champById[m.championId] ?? m.championName ?? "";
          const color = masteryLevelColor(m.championLevel);
          const pts   = formatPoints(m.championPoints);
          return (
            <div
              key={m.championId}
              title={`${name} — M${m.championLevel} — ${pts}`}
              className="mastery-card"
              style={{ border: `1.5px solid ${color}44` }}
            >
              <div style={{ position: "relative", width: 52, height: 52 }}>
                <img
                  src={championIconByCDragon(m.championId)}
                  width={52}
                  height={52}
                  alt={name}
                  loading="lazy"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "var(--radius-sm)",
                    objectFit: "cover",
                    display: "block",
                    border: `2px solid ${color}`,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: -6,
                    right: -6,
                    background: "var(--bg)",
                    border: `1px solid ${color}`,
                    color,
                    fontSize: "var(--text-xs)",
                    fontWeight: 800,
                    borderRadius: "var(--radius-full)",
                    padding: "1px 5px",
                    lineHeight: "14px",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                  }}
                >
                  M{m.championLevel}
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text)",
                  maxWidth: 72,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  marginTop: "var(--sp-2)",
                }}
              >
                {name}
              </p>
              <p style={{ fontSize: "var(--text-xs)", color, fontWeight: 700, textAlign: "center" }}>
                {pts}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
