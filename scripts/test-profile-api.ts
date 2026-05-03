/**
 * scripts/test-profile-api.ts
 *
 * Script de teste para validar o enriquecimento da API de perfil.
 * Uso: npx tsx scripts/test-profile-api.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_SUMMONER = 'Luan-BR1'; // Ajuste para um Riot ID válido para teste local se necessário

async function testProfileApi() {
  console.log(`🚀 Testando API de Perfil em: ${BASE_URL}/api/profile/${TEST_SUMMONER}`);

  try {
    const res = await fetch(`${BASE_URL}/api/profile/${encodeURIComponent(TEST_SUMMONER)}`);

    if (!res.ok) {
      console.error(`❌ Erro na API: ${res.status} ${res.statusText}`);
      const errorData = await res.json();
      console.error(JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await res.json();

    console.log('✅ Resposta recebida com sucesso!');

    // Validações do Sprint 1
    const checks = [
      { name: 'Top Masteries (Array)', valid: Array.isArray(data.topMasteries) },
      { name: 'Match History (Array)', valid: Array.isArray(data.matchHistory) },
      { name: 'Match History Item 0 - Items (Array)', valid: Array.isArray(data.matchHistory?.[0]?.items) },
      { name: 'Match History Item 0 - CS', valid: typeof data.matchHistory?.[0]?.cs === 'number' },
      { name: 'Match History Item 0 - Vision Score', valid: typeof data.matchHistory?.[0]?.vision === 'number' },
      { name: 'Match History Item 0 - Gold', valid: typeof data.matchHistory?.[0]?.gold === 'number' },
    ];

    console.log('\n📊 Resultados dos Testes:');
    checks.forEach(c => {
      console.log(`${c.valid ? '✅' : '❌'} ${c.name}`);
    });

    if (checks.every(c => c.valid)) {
      console.log('\n🎉 Todos os critérios do Sprint 1 foram atendidos na API!');
    } else {
      console.log('\n⚠️ Alguns critérios falharam. Verifique os dados acima.');
    }

    // Print de exemplo dos dados novos
    if (data.topMasteries?.length > 0) {
      console.log('\n🌟 Exemplo de Maestria:', data.topMasteries[0].championName, `(${data.topMasteries[0].masteryPoints} pts)`);
    }

  } catch (err: any) {
    console.error('❌ Erro ao executar o teste:', err.message);
  }
}

testProfileApi();
