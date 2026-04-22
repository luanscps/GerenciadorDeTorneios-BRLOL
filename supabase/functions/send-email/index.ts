const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendInscricaoAprovada(email: string, teamName: string, tournamentName: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'BRLOL <noreply@brlol.com.br>',
      to: [email],
      subject: `✅ Time ${teamName} aprovado no ${tournamentName}!`,
      html: `<p>Seu time foi aprovado...</p>`
    })
  })
}
