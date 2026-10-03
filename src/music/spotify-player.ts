import { spotifyAccessToken } from './spotify'

interface PlaybackState { paused: boolean; position: number; duration: number; track_window: { current_track: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } } } }
export interface SpotifyPlayer { connect(): Promise<boolean>; disconnect(): void; activateElement(): Promise<void>; pause(): Promise<void>; togglePlay(): Promise<void>; addListener(event: string, callback: (data: never) => void): boolean }
interface SpotifyRuntime { Player: new (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number }) => SpotifyPlayer }
type SDKWindow = Window & { Spotify?: SpotifyRuntime; onSpotifyWebPlaybackSDKReady?: () => void }
let sdk: Promise<SpotifyRuntime> | undefined
function loadSDK(): Promise<SpotifyRuntime> {
  const host = window as SDKWindow
  if (host.Spotify) return Promise.resolve(host.Spotify)
  return sdk ??= new Promise((resolve, reject) => { const timer = setTimeout(() => { sdk = undefined; reject(new Error('Spotify player did not load. Check your connection and browser content blockers.')) }, 20000); host.onSpotifyWebPlaybackSDKReady = () => { clearTimeout(timer); resolve(host.Spotify!) }; const script = document.createElement('script'); script.src = 'https://sdk.scdn.co/spotify-player.js'; script.async = true; script.onerror = () => { clearTimeout(timer); sdk = undefined; reject(new Error('Could not load Spotify Web Playback SDK.')) }; document.head.appendChild(script) })
}
export async function createSpotifyPlayer(onState: (state: PlaybackState | null) => void, onError: (message: string) => void): Promise<{ player: SpotifyPlayer; deviceId: string }> {
  const runtime = await loadSDK()
  const player = new runtime.Player({ name: 'Edon Music', volume: .7, getOAuthToken: (callback) => { void spotifyAccessToken().then(callback).catch((reason: unknown) => onError(reason instanceof Error ? reason.message : 'Spotify authorization expired.')) } })
  player.addListener('player_state_changed', onState)
  return new Promise((resolve, reject) => { const timer = setTimeout(() => { player.disconnect(); reject(new Error('Spotify player could not connect. Check Premium and your app’s Web Playback SDK access.')) }, 20000); const fail = ({ message }: { message: string }) => { clearTimeout(timer); player.disconnect(); onError(message); reject(new Error(message)) }; for (const event of ['initialization_error', 'authentication_error', 'account_error']) player.addListener(event, fail); player.addListener('playback_error', ({ message }: { message: string }) => onError(message)); player.addListener('ready', ({ device_id }: { device_id: string }) => { clearTimeout(timer); resolve({ player, deviceId: device_id }) }); player.addListener('not_ready', () => onError('Spotify device disconnected. Enable the player again.')); void player.connect().then((connected) => { if (!connected) fail({ message: 'Spotify player connection was rejected.' }) }).catch((reason: unknown) => fail({ message: reason instanceof Error ? reason.message : 'Spotify connection failed.' })) })
}
export async function playSpotifyTrack(deviceId: string, trackId: string): Promise<void> { const token = await spotifyAccessToken(); const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }) }); if (!response.ok) throw new Error(`Spotify playback failed (${response.status}). Check Premium, device access and development-mode users.`) }
