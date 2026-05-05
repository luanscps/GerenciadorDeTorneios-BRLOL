# gemini-superpowers.ps1 - Otimizado para BRLOL no Windows 10

$SkillsDir = Join-Path $PSScriptRoot ".superpowers\skills"  # Usa diretório do script

$SkillList = @(
    "brainstorming",
    "writing-plans", 
    "systematic-debugging",
    "requesting-code-review"
)

$BasePrompt = @"
Você é um Arquiteto de Software especializado em plataformas de eSports (LoL, Riot API, Next.js, Supabase).
Framework: SUPERPOWERS ativo.
IDE: IntelliJ IDEA conectado via MCP (22 tools disponíveis).
PROJETO: GerenciadorDeTorneios-BRLOL (https://github.com/luanscps/GerenciadorDeTorneios-BRLOL).

FLUXO OBRIGATÓRIO:
1. EXPLORAR contexto com MCP tools ANTES de qualquer análise.
2. Seguir skills carregadas rigorosamente.
3. Usar TDD para toda implementação.
4. Code review antes de finalizar features.

PRIORIDADES BRLOL:
- Integração Riot Developer API (summoner, league, match history)
- Gerenciamento de torneios (bracket, check-in, lobby, resultados)
- Perfil do jogador automático
- Admin dashboard para partidas
"@

# Carrega skills
$SkillContent = @()
foreach ($skill in $SkillList) {
    $file = Join-Path $SkillsDir "$skill\SKILL.md"
    if (Test-Path $file) {
        Write-Host "✅ Carregando skill: $skill" -ForegroundColor Green
        $SkillContent += Get-Content $file -Raw -Encoding UTF8
    } else {
        Write-Warning "❌ Skill $skill não encontrada em $file"
    }
}

$SystemPrompt = $BasePrompt + "`n`n" + ($SkillContent -join "`n`n`n---`n`n")

Write-Host "`n🚀 GEMINI SUPERPOWERS ATIVO!" -ForegroundColor Cyan
Write-Host "📁 Projeto: $(Split-Path $PSScriptRoot -Leaf)" -ForegroundColor Yellow
Write-Host "🛠️  Skills: $($SkillList -join ', ')" -ForegroundColor Green
Write-Host "🔌 MCP IntelliJ: 22 tools" -ForegroundColor Magenta
Write-Host "`n🎯 Prompt inicial pronto. Execute 'gemini-superpowers.ps1'" -ForegroundColor Cyan

# Executa Gemini
gemini --system-prompt $SystemPrompt