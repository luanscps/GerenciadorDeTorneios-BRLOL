import { createMcpHandler } from '@vercel/mcp-adapter';

const handler = createMcpHandler((server) => {
  server.tool(
    'get_project_info',
    'Retorna informações do projeto GerenciadorDeTorneios',
    {},
    async () => ({
      content: [{ type: 'text', text: 'Next.js 16 + Supabase + Riot API' }]
    })
  );
});

export { handler as GET, handler as POST };