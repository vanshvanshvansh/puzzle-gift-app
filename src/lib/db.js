import { supabase } from './supabase.js'
import { randomToken } from './tokens.js'

const BUCKET = 'puzzle-images'

export async function uploadImage(blob, path) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function createPuzzle({ imageBlob, gridSize, themeCategory, challengeLabel, durationMinutes }) {
  const share_token = randomToken(32)
  const owner_token = randomToken(32)
  const path = `${share_token}.jpg`
  const image_url = await uploadImage(imageBlob, path)

  const now = new Date()
  const expires_at = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('puzzles')
    .insert({
      share_token,
      owner_token,
      image_url,
      grid_size: gridSize,
      theme_category: themeCategory,
      challenge_label: challengeLabel,
      expires_at,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPuzzleByShareToken(share_token) {
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('share_token', share_token)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPuzzleByOwnerToken(owner_token) {
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('owner_token', owner_token)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updatePuzzleByToken(tokenField, tokenValue, patch) {
  const { data, error } = await supabase
    .from('puzzles')
    .update(patch)
    .eq(tokenField, tokenValue)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePuzzle(row) {
  try {
    const path = `${row.share_token}.jpg`
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // best-effort — ignore storage cleanup failures
  }
  const { error } = await supabase.from('puzzles').delete().eq('owner_token', row.owner_token)
  if (error) throw error
}
export function subscribeToPuzzle(owner_token, onChange) {
  const channel = supabase
    .channel(`puzzle-${owner_token}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'puzzles', filter: `owner_token=eq.${owner_token}` },
      (payload) => onChange(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
