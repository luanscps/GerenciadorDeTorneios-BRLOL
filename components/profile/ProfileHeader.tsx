'use client';
import React from 'react';

interface Props {
  summonerName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
  /** true se o jogador tiver player_id vinculado no ArenaGG (riot_accounts + players) */
  isLinked?: boolean;
}

export default function ProfileHeader({
  summonerName,
  tagLine,
  profileIconId,
  summonerLevel,
  isLinked = false,
}: Props) {
  return (
    <div className="flex items-end gap-6">
      {/* Avatar com moldura de nível */}
      <div className="relative flex-shrink-0 group">
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: "var(--radius-xl)",
            border: "3px solid var(--gold)",
            overflow: "hidden",
            boxShadow: "0 0 32px rgba(200, 168, 75, 0.2)",
            background: "var(--surface)",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* CommunityDragon — padrão do projeto, sem depender de DD_VERSION */}
          <img
            src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${profileIconId}.jpg`}
            alt={`Ícone de perfil de ${summonerName}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--gold)",
            color: "var(--bg)",
            fontSize: "var(--text-xs)",
            fontWeight: 900,
            padding: "2px 12px",
            borderRadius: "var(--radius-full)",
            border: "2px solid var(--bg)",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          LVL {summonerLevel}
        </div>
      </div>

      {/* Nome + tag + status */}
      <div className="pb-4">
        <div className="flex items-baseline gap-3">
          <h1
            style={{
              color: "var(--text)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {summonerName}
          </h1>
          <span
            style={{
              color: "var(--text-muted)",
              fontWeight: 700,
              fontSize: "var(--text-lg)",
              opacity: 0.8,
            }}
          >
            #{tagLine}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="animate-pulse"
            style={{
              width: 8,
              height: 8,
              borderRadius: "var(--radius-full)",
              background: "var(--win)",
              display: "inline-block",
            }}
          />
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            BR1 · {isLinked ? "Vinculado ao ArenaGG" : "Perfil Público"}
          </p>
        </div>
      </div>
    </div>
  );
}
