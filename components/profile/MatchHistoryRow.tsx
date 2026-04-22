import Image from "next/image";

const DD_VERSION = "14.10.1";

interface Props {
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDuration: number;
  gameMode: string;
  teamPosition: string;
}

export  default function MatchHistoryRow({
  championName,
  kills,
  deaths,
  assists,
  win,
  gameDuration,
  gameMode,
  teamPosition,
}: Props) {
  const minutes = Math.floor(gameDuration / 60);
  const kda =
    deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);

  return (
    <div
      className={
        "flex items-center gap-3 rounded p-3 " +
        (win
          ? "bg-blue-900/20 border-l-2 border-blue-500"
          : "bg-red-900/20 border-l-2 border-red-500")
      }
    >
      <Image
        src={
          "https://ddragon.leagueoflegends.com/cdn/" +
          DD_VERSION +
          "/img/champion/" +
          championName +
          ".png"
        }
        width={40}
        height={40}
        alt={championName}
        className="rounded border border-[#1E3A5F]"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{championName}</p>
        <p className="text-gray-500 text-xs">
          {teamPosition || gameMode}
        </p>
      </div>
      <div className="text-center">
        <p className="text-white text-sm font-bold">
          {kills}/{deaths}/{assists}
        </p>
        <p className="text-gray-400 text-xs">KDA {kda}</p>
      </div>
      <div className="text-right">
        <p
          className={
            "text-xs font-bold " + (win ? "text-blue-400" : "text-red-400")
          }
        >
          {win ? "Vitoria" : "Derrota"}
        </p>
        <p className="text-gray-500 text-xs">{minutes}min</p>
      </div>
    </div>
  );
}
