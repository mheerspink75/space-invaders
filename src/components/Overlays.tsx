interface TitleScreenProps {
  highScore: number
  onStart: () => void
}

export function TitleScreen({ highScore, onStart }: TitleScreenProps) {
  return (
    <div className="overlay">
      <p className="overlay__kicker">Defend the Earth</p>
      <h2 className="overlay__title overlay__title--blink">READY!</h2>
      <button type="button" className="btn btn--primary" onClick={onStart} autoFocus>
        START GAME
      </button>
      <ul className="overlay__keys">
        <li>
          <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> to move
        </li>
        <li>
          <kbd>space</kbd> to fire
        </li>
        <li>
          <kbd>P</kbd> pause · <kbd>M</kbd> sound
        </li>
      </ul>
      {highScore > 0 && <p className="overlay__meta">Best: {highScore}</p>}
    </div>
  )
}

interface GameOverScreenProps {
  score: number
  highScore: number
  beatHighScore: boolean
  onStart: () => void
}

export function GameOverScreen({ score, highScore, beatHighScore, onStart }: GameOverScreenProps) {
  return (
    <div className="overlay">
      <h2 className="overlay__title overlay__title--blink">GAME OVER</h2>
      <p className="overlay__meta">
        Score {score} · Best {highScore}
      </p>
      {beatHighScore && <p className="overlay__kicker">New high score!</p>}
      <button type="button" className="btn btn--primary" onClick={onStart} autoFocus>
        PLAY AGAIN
      </button>
    </div>
  )
}

interface PauseScreenProps {
  onResume: () => void
  onMute: () => void
  muted: boolean
}

export function PauseScreen({ onResume, onMute, muted }: PauseScreenProps) {
  return (
    <div className="overlay">
      <h2 className="overlay__title">PAUSED</h2>
      <button type="button" className="btn btn--primary" onClick={onResume} autoFocus>
        RESUME
      </button>
      <button type="button" className="btn" onClick={onMute}>
        {muted ? 'Sound: off' : 'Sound: on'}
      </button>
    </div>
  )
}
