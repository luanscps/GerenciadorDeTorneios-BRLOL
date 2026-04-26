/** @type {import('next').NextConfig} */
const nextConfig = {
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
      // (puuid é um hash longo, diferente de gameName que é texto legível)
      // O redirect correto para o perfil é feito via botão na lista
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
    ];
  },
};

module.exports = nextConfig;
