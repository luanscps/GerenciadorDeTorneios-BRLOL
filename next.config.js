/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necessário para o @vercel/mcp-adapter funcionar corretamente no servidor
  serverExternalPackages: ['@vercel/mcp-adapter'],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.communitydragon.org",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      // Rota legada /jogadores/:puuid → redireciona para lista
      {
        source: '/jogadores/:puuid',
        destination: '/jogadores',
        permanent: false,
        has: [
          {
            type: 'query',
            key: '__legacy',
          },
        ],
      },
      // Rota legada /t/:slug → rota canônica /torneios/:slug
      {
        source: '/t/:slug',
        destination: '/torneios/:slug',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
