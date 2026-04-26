/**
 * app/api/cron/check-riot-status/route.ts
 *
 * Cron semanal: monitora o status da Riot API BR1 e notifica via Discord.
 * Configurado em vercel.json como schedule: "0 9 * * 1" (segunda às 9h BRT).
 *
 * Também pode ser chamado manualmente via GET (autenticado como admin).
 */
import { NextRequest, NextResponse } from "next/server";

interface RiotPlatformStatus {
  id: string;
  name: string;
  locales: string[];
  maintenances: RiotStatusItem[];
  incidents: RiotStatusItem[];
}

interface RiotStatusItem {
  id: number;
  titles: { locale: string; content: string }[];
  maintenance_status?: string;
  incident_severity?: string;
  updated_at: string;
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Verifica token do cron (Vercel injeta automaticamente em produção)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RIOT_API_KEY não configurada" }, { status: 500 });
  }

  try {
    const region = (process.env.RIOT_REGION ?? "br1").toLowerCase();
    const res = await fetch(
      `https://${region}.api.riotgames.com/lol/status/v4/platform-data`,
      {
        headers: { "X-Riot-Token": apiKey },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      throw new Error(`Status API retornou ${res.status}`);
    }

    const status: RiotPlatformStatus = await res.json();
    const incidents = status.incidents ?? [];
    const maintenances = status.maintenances ?? [];

    const report = {
      region: status.id,
      checkedAt: new Date().toISOString(),
      incidents: incidents.length,
      maintenances: maintenances.length,
      healthy: incidents.length === 0 && maintenances.length === 0,
      details: {
        incidents: incidents.map(i => ({
          id: i.id,
          title: i.titles.find(t => t.locale === "pt_BR")?.content
            ?? i.titles[0]?.content ?? "Sem título",
          severity: i.incident_severity,
          updatedAt: i.updated_at,
        })),
        maintenances: maintenances.map(m => ({
          id: m.id,
          title: m.titles.find(t => t.locale === "pt_BR")?.content
            ?? m.titles[0]?.content ?? "Sem título",
          status: m.maintenance_status,
          updatedAt: m.updated_at,
        })),
      },
    };

    // Notifica Discord se houver problemas
    if (!report.healthy) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        const problemList = [
          ...report.details.incidents.map(i => `🔴 [Incidente] ${i.title} (severidade: ${i.severity})`),
          ...report.details.maintenances.map(m => `🔧 [Manutenção] ${m.title} (status: ${m.status})`),
        ].join("\n");

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: [
              `⚠️ **Riot API ${status.id.toUpperCase()} — Problemas Detectados**`,
              `\`\`\``,
              problemList,
              `\`\`\``,
              `Verificado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
            ].join("\n"),
          }),
        });
      }
    }

    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[cron/check-riot-status]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
