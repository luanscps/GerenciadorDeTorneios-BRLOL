/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externaliza o @vercel/mcp-adapter do bundle do servidor (webpack)
  serverExternalPackages: ['@vercel/mcp-adapter'],

  // Turbopack: resolve o módulo diretamente do node_modules,
  // evitando o erro "Module not found" ao usar --turbopack
  // (Next.js 16: 'turbo' saiu de experimental e virou chave de primeiro nível)
  turbo: {
    resolveAlias: {
      '@vercel/mcp-adapter': '@vercel/mcp-adapter',
    },
  },

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
