export const SPOTIFY_CLIENT_ID = '6a9988ff42f24c49892f57381b238e84'
export interface SpotifyTrack { id: string; name: string; artists: { name: string }[]; album: { images: { url: string }[] }; external_urls: { spotify: string } }
interface Token { access_token: string; refresh_token?: string; expires: number }
const tokenKey = 'edon.spotify.token'
const attemptKey = 'edon.spotify.attempt'
export const spotifyRedirect = () => `${location.origin}${location.pathname}`
const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map((value) => value.toString(16).padStart(2, '0')).join('')
const base64url = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export async function connectSpotify(clientId: string, documentId: string): Promise<void> {
  if (!/^[a-f0-9]{32}$/i.test(clientId.trim())) throw new Error('Enter the 32-character Client ID from your Spotify app settings.')
  const verifier = random(); const state = random(); const redirect = spotifyRedirect()
  sessionStorage.setItem(attemptKey, JSON.stringify({ verifier, state, redirect, clientId: clientId.trim(), created: Date.now() })); sessionStorage.setItem('edon.spotify.document', documentId); localStorage.setItem('edon.spotify.clientId', clientId.trim())
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  location.assign(`https://accounts.spotify.com/authorize?${new URLSearchParams({ client_id: clientId.trim(), response_type: 'code', redirect_uri: redirect, state, code_challenge_method: 'S256', code_challenge: challenge, scope: 'user-library-read streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state' })}`)
}
let callback: Promise<boolean> | undefined
export function finishSpotifyLogin(): Promise<boolean> { return callback ??= finish() }
async function finish(): Promise<boolean> {
  const params = new URLSearchParams(location.search); const code = params.get('code'); const error = params.get('error')
  if (!code && !error) return Boolean(sessionStorage.getItem(tokenKey))
  const raw = sessionStorage.getItem(attemptKey); sessionStorage.removeItem(attemptKey)
  history.replaceState(null, '', location.pathname + location.hash)
  if (error) throw new Error(`Spotify login: ${error}`)
  const attempt = raw ? JSON.parse(raw) : null
  if (!attempt || params.get('state') !== attempt.state || Date.now() - attempt.created > 600000) throw new Error('Spotify login expired. Please connect again.')
  await requestToken({ grant_type: 'authorization_code', code: code!, redirect_uri: attempt.redirect, client_id: attempt.clientId, code_verifier: attempt.verifier })
  return true
}
async function requestToken(fields: Record<string, string>) { const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) }); if (!response.ok) throw new Error(`Spotify login failed (${response.status}). Check the Client ID and registered Redirect URI.`); const result = await response.json(); const previous: Token | null = JSON.parse(sessionStorage.getItem(tokenKey) ?? 'null'); sessionStorage.setItem(tokenKey, JSON.stringify({ access_token: result.access_token, refresh_token: result.refresh_token ?? previous?.refresh_token, expires: Date.now() + result.expires_in * 1000 })) }
export async function spotifyAccessToken(): Promise<string> { let token: Token | null = JSON.parse(sessionStorage.getItem(tokenKey) ?? 'null'); if (!token) throw new Error('Connect your Spotify account first.'); if (token.expires < Date.now() + 30000) { if (!token.refresh_token) throw new Error('Your Spotify session expired. Connect again.'); await requestToken({ grant_type: 'refresh_token', refresh_token: token.refresh_token, client_id: localStorage.getItem('edon.spotify.clientId') ?? SPOTIFY_CLIENT_ID }); token = JSON.parse(sessionStorage.getItem(tokenKey)!) } return token!.access_token }
async function spotifyFetch(path: string): Promise<unknown> { const accessToken = await spotifyAccessToken(); const response = await fetch(`https://api.spotify.com/v1/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } }); if (!response.ok) throw new Error(response.status === 403 ? 'Spotify denied access. Check your app’s development-mode user access.' : response.status === 429 ? 'Spotify rate limit reached. Try again later.' : `Spotify request failed (${response.status}). Reconnect if your session expired.`); return response.json() }
export async function searchSpotify(query: string): Promise<SpotifyTrack[]> { if (!query.trim()) { const data = await spotifyFetch('me/tracks?limit=10') as { items: { track: SpotifyTrack }[] }; return data.items.map((item) => item.track).filter(Boolean) } const data = await spotifyFetch(`search?${new URLSearchParams({ q: query.trim(), type: 'track', limit: '10' })}`) as { tracks: { items: SpotifyTrack[] } }; return data.tracks.items }
export function disconnectSpotify() { sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(attemptKey); callback = undefined }
export function spotifyTrackId(value: string): string | null { const match = /^(?:https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/|spotify:track:)([a-zA-Z0-9]{22})(?:\?.*)?$/.exec(value.trim()); return match?.[1] ?? null }
