export interface InputHandlers {
  onLeft: (down: boolean) => void
  onRight: (down: boolean) => void
  onFire: (down: boolean) => void
  onStart: () => void
  onPause: () => void
  onMute: () => void
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA'])
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD'])
const FIRE_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyJ'])

export class Input {
  private held = { left: false, right: false, fire: false }

  private handlers: InputHandlers

  constructor(handlers: InputHandlers) {
    this.handlers = handlers
  }

  private sync(): void {
    this.handlers.onLeft(this.held.left)
    this.handlers.onRight(this.held.right)
    this.handlers.onFire(this.held.fire)
  }

  private set(action: keyof typeof this.held, down: boolean): void {
    if (this.held[action] === down) return
    this.held[action] = down
    this.sync()
  }

  attach(target: Window = window): () => void {
    const keydown = (e: KeyboardEvent) => {
      if (e.repeat && !FIRE_KEYS.has(e.code)) return
      if (LEFT_KEYS.has(e.code)) {
        e.preventDefault()
        this.set('left', true)
      } else if (RIGHT_KEYS.has(e.code)) {
        e.preventDefault()
        this.set('right', true)
      } else if (FIRE_KEYS.has(e.code)) {
        e.preventDefault()
        this.set('fire', true)
        this.handlers.onStart()
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        this.handlers.onStart()
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        this.handlers.onPause()
      } else if (e.code === 'KeyM') {
        this.handlers.onMute()
      }
    }

    const keyup = (e: KeyboardEvent) => {
      if (LEFT_KEYS.has(e.code)) this.set('left', false)
      else if (RIGHT_KEYS.has(e.code)) this.set('right', false)
      else if (FIRE_KEYS.has(e.code)) this.set('fire', false)
    }

    // Releasing focus mid-hold would otherwise leave the ship drifting.
    const blur = () => {
      this.held.left = false
      this.held.right = false
      this.held.fire = false
      this.sync()
    }

    target.addEventListener('keydown', keydown, { passive: false })
    target.addEventListener('keyup', keyup)
    target.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', blur)

    return () => {
      target.removeEventListener('keydown', keydown)
      target.removeEventListener('keyup', keyup)
      target.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', blur)
    }
  }
}
