// Supabase Edge Function — run on a cron schedule (e.g. every 2 minutes).
// Deletes expired puzzle rows AND their storage images.
// Deploy: supabase functions deploy cleanup-expired
// Schedule (Dashboard -> Edge Functions -> cleanup-expired -> Cron):
//   */2 * * * *

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: expired, error: fetchError } = await supabase
    .from('puzzles')
    .select('id, share_token')
    .lt('expires_at', new Date().toISOString())

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 })
  }

  const paths = expired.map((p) => `${p.share_token}.jpg`)
  await supabase.storage.from('puzzle-images').remove(paths)

  const ids = expired.map((p) => p.id)
  const { error: deleteError } = await supabase.from('puzzles').delete().in('id', ids)

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ deleted: expired.length }), { status: 200 })
})
