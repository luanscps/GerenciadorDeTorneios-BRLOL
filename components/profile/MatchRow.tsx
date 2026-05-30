import { championIconByCDragon } from "@/lib/riot";

const QUEUE_NAMES: Record<number, string> = {
  420: "Solo/Duo", 440: "Flex 5v5", 450: "ARAM",
  400: "Normal Draft", 430: "Normal Cega", 0: "Custom",
};

const POSITION_PT: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid",
  BOTTOM: "ADC", UTILITY: "Sup", NONE: "—",
};

function itemIconUrl(ddVersion: string, itemId: number): string {
  if (!itemId || itemId === 0) return "";
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${itemId}.png`;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return `${diff}s atrás`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

interface MatchRowProps {
  matchId: string;
  win: boolean;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  teamPosition: string;
  individualPosition: string;
  items: number[];
  queueId: number;
  gameDuration: number;
  gameStartTimestamp: number;
  pentaKills: number;
  ddVersion: string;
  champById: Record<number, string>;
}

export function MatchRow({
  matchId, win, championId, championName, kills, deaths, assists,
  teamPosition, individualPosition, items, queueId, gameDuration,
  gameStartTimestamp, pentaKills, ddVersion, champById,
}: MatchRowProps) {
  const kda       = ((kills + assists) / Math.max(1, deaths)).toFixed(2);
  const champName = champById[championId] ?? championName;
  const queueName = QUEUE_NAMES[queueId] ?? `Fila ${queueId}`;
  const pos       = POSITION_PT[teamPosition] ?? POSITION_PT[individualPosition] ?? "—";

  return (
    <div
      key={matchId}
      className="match-row"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(30,58,95,0.4)",
        transition: "background 0.15s",
        /* Substituindo border-left colorido por fundo gradiente sutil */
        background: win
          ? "linear-gradient(90deg, rgba(34,197,94,0.06) 0%, transparent 20%)"
          : "linear-gradient(90deg, rgba(239,68,68,0.06) 0%, transparent 20%)",
        borderLeft: `3px solid ${win ? "#22C55E" : "#EF4444"}44`,
      }}
    >
      {/* V/D */}
      <div style={{ width: 32, flexShrink: 0, textAlign: "center", fontSize: 12, fontWeight: 800, color: win ? "#4ADE80" : "#F87171" }}>
        {win ? "V" : "D"}
      </div>

      {/* Ícone campeão + posição */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img
          src={championIconByCDragon(championId)}
          width={44}
          height={44}
          alt={champName}
          style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", display: "block", border: `2px solid ${win ? "#22C55E44" : "#EF444444"}` }}
        />
        {pos !== "—" && (
          <span
            style={{
              position: "absolute", bottom: -4, right: -4,
              background: "#050E1A", fontSize: 8, fontWeight: 700,
              color: "#C8A84B", border: "1px solid #1E3A5F",
              borderRadius: 4, padding: "1px 3px", lineHeight: 1.2,
            }}
          >
            {pos}
          </span>
        )}
      </div>

      {/* KDA */}
      <div style={{ minWidth: 90, flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
          {kills} / <span style={{ color: "#F87171" }}>{deaths}</span> / {assists}
        </p>
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
          KDA <span style={{ color: Number(kda) >= 3 ? "#4ADE80" : "#9CA3AF", fontWeight: 700 }}>{kda}</span>
        </p>
      </div>

      {/* Itens */}
      <div style={{ display: "flex", gap: 3, flexShrink: 0, flexWrap: "wrap", maxWidth: 180 }}>
        {items.map((itemId, idx) => (
          <div
            key={idx}
            style={{
              width: 24, height: 24,
              background: itemId ? "#0A1E38" : "rgba(30,58,95,0.3)",
              borderRadius: 4, overflow: "hidden",
              border: "1px solid rgba(30,58,95,0.6)",
              flexShrink: 0,
            }}
          >
            {itemId > 0 && (
              <img src={itemIconUrl(ddVersion, itemId)} width={24} height={24} alt="" style={{ width: 24, height: 24, display: "block" }} />
            )}
          </div>
        ))}
      </div>

      {/* Metadados */}
      <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1 }}>{queueName}</p>
        <p style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{fmtDuration(gameDuration)} · {timeAgo(gameStartTimestamp)}</p>
        {pentaKills > 0 && (
          <p style={{ fontSize: 11, color: "#FFD700", fontWeight: 700, marginTop: 2 }}>PENTA KILL 🎉</p>
        )}
      </div>
    </div>
  );
}
