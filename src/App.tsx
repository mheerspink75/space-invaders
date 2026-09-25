import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Game } from './game/Game'
import { Input } from './game/input'
import type { GameState } from './game/types'
import { preloadSprites } from './game/sprites'
import { COLORS, VIEW_H, VIEW_W } from './game/constants'
import { TitleScreen, GameOverScreen, PauseScreen } from './components/Overlays'
import { TouchControls } from './components/TouchControls'

const INITIAL_STATE: GameState = {
  status: 'menu',
  score: 0,
  highScore: 0,
  lives: 3,
  level: 1,
  muted: false,
}

/** Space left around the playfield for the title, buttons and key hints. */
const CHROME_W = 56
const CHROME_H = 168
const MAX_ZOOM = 8

/**
 * Largest whole number of device pixels that one game pixel can occupy without
 * overflowing the viewport. Whole numbers matter: they keep every game pixel an
 * exact square on screen, which is what stops the art looking soft.
 */
function computeZoom(): number {
  if (typeof window === 'undefined') return 3
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const availW = Math.max(VIEW_W, window.innerWidth - CHROME_W) * dpr
  const availH = Math.max(VIEW_H, window.innerHeight - CHROME_H) * dpr
  return Math.max(1, Math.min(MAX_ZOOM, Math.floor(Math.min(availW / VIEW_W, availH / VIEW_H))))
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [state, setState] = useState<GameState>(INITIAL_STATE)
  const [zoom, setZoom] = useState(computeZoom)

  // Fit the board to the window, keeping the zoom a whole number of device
  // pixels so the pixel art stays sharp. Recomputed on resize.
  useEffect(() => {
    const onResize = () => setZoom(computeZoom())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  // Boot the game once. The engine owns its own animation loop; React only
  // re-renders when the values shown in the HUD actually change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    preloadSprites(COLORS.invader, COLORS.ufo)
    const game = new Game(canvas)
    game.setScale(zoom)
    gameRef.current = game
    game.onStateChange(setState)
    game.start()

    const input = new Input({
      onLeft: (down) => game.setLeft(down),
      onRight: (down) => game.setRight(down),
      onFire: (down) => game.setFire(down),
      onStart: () => {
        game.unlockAudio()
        game.pressStart()
      },
      onPause: () => game.togglePause(),
      onMute: () => game.toggleMute(),
    })
    const detach = input.attach()

    const onBlur = () => game.onBlur()
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onBlur)

    return () => {
      detach()
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onBlur)
      game.stop()
      gameRef.current = null
    }
  }, [])

  // Keep the backing store in step with the zoom on every resize.
  useEffect(() => {
    gameRef.current?.setScale(zoom)
  }, [zoom])

  const start = useCallback(() => {
    const game = gameRef.current
    if (!game) return
    game.unlockAudio()
    game.pressStart()
  }, [])

  const togglePause = useCallback(() => {
    gameRef.current?.togglePause()
  }, [])

  const toggleMute = useCallback(() => {
    gameRef.current?.toggleMute()
  }, [])

  const dpr = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1)
  // The canvas backing store is VIEW * zoom device pixels; this is how wide it
  // looks in CSS pixels.
  const boardWidth = Math.round((VIEW_W * zoom) / dpr)
  const boardHeight = Math.round((VIEW_H * zoom) / dpr)

  return (
    <div className="app">
      <div className="cabinet" style={{ '--zoom': zoom } as CSSProperties}>
        <header className="cabinet__title">
          <h1>SPACE INVADERS</h1>
        </header>

        <div className="screen" style={{ width: boardWidth, height: boardHeight }}>
          <canvas
            ref={canvasRef}
            className="screen__canvas"
            width={VIEW_W * zoom}
            height={VIEW_H * zoom}
            style={{ width: boardWidth, height: boardHeight }}
            role="img"
            aria-label={`Space Invaders. Score ${state.score}, wave ${state.level}, ${
              state.lives === 1 ? '1 life' : `${state.lives} lives`
            }.`}
          />
          <div className="screen__scanlines" aria-hidden="true" />

          {state.status === 'menu' && <TitleScreen highScore={state.highScore} onStart={start} />}
          {state.status === 'gameover' && (
            <GameOverScreen
              score={state.score}
              highScore={state.highScore}
              beatHighScore={state.score >= state.highScore && state.score > 0}
              onStart={start}
            />
          )}
          {state.status === 'paused' && <PauseScreen onResume={togglePause} onMute={toggleMute} muted={state.muted} />}
        </div>

        <TouchControls
          onLeft={(down) => gameRef.current?.setLeft(down)}
          onRight={(down) => gameRef.current?.setRight(down)}
          onFire={(down) => {
            gameRef.current?.unlockAudio()
            gameRef.current?.setFire(down)
          }}
        />

        <footer className="cabinet__footer">
          <button type="button" className="btn" onClick={toggleMute} aria-pressed={state.muted}>
            {state.muted ? 'Sound: off' : 'Sound: on'}
          </button>
          <button type="button" className="btn" onClick={togglePause}>
            {state.status === 'paused' ? 'Resume' : 'Pause'}
          </button>
        </footer>

        <p className="hint">
          <kbd>←</kbd> <kbd>→</kbd> move · <kbd>space</kbd> fire · <kbd>P</kbd> pause · <kbd>M</kbd> mute
        </p>
      </div>
    </div>
  )
}
