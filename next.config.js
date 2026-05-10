const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externaliza o @vercel/mcp-adapter do bundle do servidor (webpack)
  serverExternalPackages: ['@vercel/mcp-adapter'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ddragon.leagueoflegends.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.communitydragon.org',
        pathname: '/**',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/jogadores/:puuid',
        destination: '/jogadores',
        permanent: false,
        has: [{ type: 'query', key: '__legacy' }],
      },
      {
        source: '/t/:slug',
        destination: '/torneios/:slug',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
