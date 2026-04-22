import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { tournament_id } = await req.json()
  // ... implementação
})
