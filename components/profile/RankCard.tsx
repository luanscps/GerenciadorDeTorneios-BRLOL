import { rankEmblemUrl } from "@/lib/riot";

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B",       BRONZE: "#CD7F32",   SILVER: "#A8A9AD",
  GOLD: "#FFD700",       PLATINUM: "#00E5CC", EMERALD: "#50C878",
  DIAMOND: "#99CCFF",    MASTER: "#9B59B6",   GRANDMASTER: "#E74C3C",
  CHALLENGER: "#00D4FF",
};

interface RankEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
}

export function RankCard({ r }: { r: RankEntry }) {
  const color = TIER_COLORS[r.tier] ?? "#fff";
  const total = r.wins + r.losses;
  const wr    = total > 0 ? Math.round((r.wins / total) * 100) : 0;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}0D 0%, #0A1428 45%)`,
        border: `1px solid ${color}33`,
        borderRadius: 16,
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 200ms ease, transform 200ms ease",
      }}
      className="hover:scale-[1.01] hover:shadow-lg"
    >
      {/* Brilho de canto */}
      <div
        style={{
          position: "absolute", top: 0, right: 0,
          width: 120, height: 120,
          background: `radial-gradient(circle at top right, ${color}14, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <img
        src={rankEmblemUrl(r.tier)}
        width={80}
        height={80}
        alt={r.tier}
        style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          {r.queueType === "RANKED_SOLO_5x5" ? "Solo / Duo" : "Flex 5v5"}
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 2 }}>
          {r.tier} <span style={{ fontSize: 18 }}>{r.rank}</span>
        </p>
        <p style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 6 }}>
          {r.leaguePoints} LP
        </p>

        {/* Barra de winrate */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 9999, background: "#1E3A5F", overflow: "hidden" }}>
            <div
              style={{
                width: `${wr}%`, height: "100%", borderRadius: 9999,
                background: wr >= 50 ? "#4ADE80" : "#F87171",
                transition: "width 600ms ease",
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: wr >= 50 ? "#4ADE80" : "#F87171", fontWeight: 700, minWidth: 38 }}>
            {wr}%
          </span>
        </div>
        <p style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
          {r.wins}V · {r.losses}D · {total} jogos
        </p>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {r.hotStreak && (
            <span style={{ fontSize: 10, background: "rgba(249,115,22,0.15)", color: "#FB923C", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 9999, padding: "2px 7px", fontWeight: 700 }}>
              🔥 Hot Streak
            </span>
          )}
          {r.veteran && (
            <span style={{ fontSize: 10, background: "rgba(200,168,75,0.12)", color: "#C8A84B", border: "1px solid rgba(200,168,75,0.3)", borderRadius: 9999, padding: "2px 7px", fontWeight: 700 }}>
              ⚔️ Veterano
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
