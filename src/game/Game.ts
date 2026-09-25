import {
  ALIEN_BASE_SPEED,
  ALIEN_COLS,
  ALIEN_DROP,
  ALIEN_LEVEL_SPEED_BONUS,
  ALIEN_POINTS,
  ALIEN_ROWS,
  ALIEN_SPACING_X,
  ALIEN_SPACING_Y,
  ALIEN_SPEED_PER_KILL,
  ALIEN_START_X,
  ALIEN_START_Y,
  BOMB_BLAST,
  BOMB_SPEED,
  BOMB_SPEED_MIN,
  BULLET_BLAST,
  COLORS,
  EXTRA_BOMB_PER_WAVE,
  EXTRA_LIFE_AT,
  EXPLOSION_TIME,
  GROUND_Y,
  HIGH_SCORE_KEY,
  INVASION_Y,
  LEVEL_CLEAR_DELAY,
  MARCH_INTERVAL_MAX,
  MARCH_INTERVAL_MIN,
  MAX_BOMBS,
  MAX_PLAYER_BULLETS,
  PLAYER_BULLET_SPEED,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_SPEED,
  PLAYER_Y,
  SHIELD_XS,
  SHIELD_Y,
  START_DELAY,
  START_LIVES,
  UFO_POINTS,
  UFO_SPEED,
  UFO_Y,
  VIEW_H,
  VIEW_W,
} from './constants'
import { getSprites, SHIELD_BITMAP, type Sprites } from './sprites'
import { getTextTexture, measureText } from './font'
import { Sound } from './sound'
import type { Alien, AlienBomb, Explosion, GameState, PlayerBullet, Shield, Status, Ufo } from './types'

export type GameListener = (state: GameState) => void

function readHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

function writeHighScore(value: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value))
  } catch {
    /* private mode / storage disabled — high score just won't persist */
  }
}

function buildShields(): Shield[] {
  const w = SHIELD_BITMAP[0].length
  const h = SHIELD_BITMAP.length
  return SHIELD_XS.map((x) => {
    const data = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      const row = SHIELD_BITMAP[y] ?? ''
      for (let px = 0; px < w; px++) {
        if (row[px] === '#') data[y * w + px] = 1
      }
    }
    return { x, y: SHIELD_Y, w, h, data }
  })
}

function makeAliens(): Alien[] {
  const aliens: Alien[] = []
  for (let row = 0; row < ALIEN_ROWS; row++) {
    // Row 0 is the squid, row 4 the octopus.
    const type = (row === 0 ? 0 : row <= 2 ? 1 : 2) as 0 | 1 | 2
    for (let col = 0; col < ALIEN_COLS; col++) {
      aliens.push({ row, col, type, alive: true })
    }
  }
  return aliens
}

export class Game {
  private readonly ctx: CanvasRenderingContext2D
  private readonly sprites: Sprites
  private readonly sound = new Sound()
  private listener: GameListener | null = null
  private rafId = 0
  private lastTime = 0
  private running = false

  status: Status = 'menu'
  score = 0
  highScore = readHighScore()
  lives = START_LIVES
  level = 1
  muted = false

  private playerX = VIEW_W / 2
  private playerAlive = true
  private fireCooldown = 0
  private respawnTimer = 0
  private extraLifeGiven = false

  private leftHeld = false
  private rightHeld = false
  private fireHeld = false

  private aliens = makeAliens()
  private formationX = ALIEN_START_X
  private formationY = ALIEN_START_Y
  private dir: 1 | -1 = 1
  private aliveCount = ALIEN_ROWS * ALIEN_COLS
  private marchDist = 0
  private marchTimer = MARCH_INTERVAL_MAX
  private marchStep = 0
  private bombTimer = 1.2
  private bombSpeed = BOMB_SPEED

  private bullets: PlayerBullet[] = []
  private bombs: AlienBomb[] = []
  private explosions: Explosion[] = []
  private shields = buildShields()
  private ufo: Ufo | null = null
  private ufoTimer = 18
  private levelTimer = 0
  private popup: { x: number; y: number; text: string; time: number } | null = null

  private readonly canvas: HTMLCanvasElement
  private scale = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('This browser does not support the 2D canvas API.')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    this.sprites = getSprites(COLORS.invader, COLORS.ufo)
    this.setScale(1)
  }

  /**
   * Zooms the playfield by an integer number of *device* pixels per game pixel.
   *
   * Because the factor is a whole number of device pixels, every game pixel
   * lands on an exact square of screen pixels — that is what keeps the pixel
   * art razor sharp instead of soft and shimmering. CSS is then told the
   * corresponding CSS size, which may be fractional on a HiDPI display.
   */
  setScale(scale: number): void {
    const next = Math.max(1, Math.floor(scale))
    if (next === this.scale && this.canvas.width === VIEW_W * next) return
    this.scale = next
    this.canvas.width = VIEW_W * next
    this.canvas.height = VIEW_H * next
    this.ctx.imageSmoothingEnabled = false
  }

  // ------------------------------------------------------------- lifecycle
  onStateChange(listener: GameListener): void {
    this.listener = listener
    listener(this.snapshot())
  }

  private snapshot(): GameState {
    return {
      status: this.status,
      score: this.score,
      highScore: this.highScore,
      lives: Math.max(0, this.lives),
      level: this.level,
      muted: this.muted,
    }
  }

  private syncState(): void {
    this.listener?.(this.snapshot())
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      const dt = Math.min((now - this.lastTime) / 1000, 1 / 20)
      this.lastTime = now
      this.update(dt)
      this.draw()
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.sound.ufoStop()
  }

  // ---------------------------------------------------------------- intents
  setLeft(down: boolean): void {
    this.leftHeld = down
  }

  setRight(down: boolean): void {
    this.rightHeld = down
  }

  setFire(down: boolean): void {
    if (down) this.fire()
    this.fireHeld = down
  }

  unlockAudio(): void {
    this.sound.unlock()
  }

  toggleMute(): void {
    this.muted = !this.muted
    this.sound.setMuted(this.muted)
    this.syncState()
  }

  /** Start / restart / dismiss the level-clear screen. */
  pressStart(): void {
    if (this.status === 'menu' || this.status === 'gameover') {
      this.restart()
    } else if (this.status === 'levelclear') {
      this.nextLevel()
    } else if (this.status === 'paused') {
      this.setPaused(false)
    }
  }

  setPaused(paused: boolean): void {
    if (paused && this.status === 'playing') {
      this.status = 'paused'
      this.sound.ufoStop()
    } else if (!paused && this.status === 'paused') {
      this.status = 'playing'
      this.lastTime = performance.now()
    }
    this.syncState()
  }

  togglePause(): void {
    if (this.status === 'playing') this.setPaused(true)
    else if (this.status === 'paused') this.setPaused(false)
  }

  onBlur(): void {
    if (this.status === 'playing') this.setPaused(true)
  }

  // ------------------------------------------------------------ game set-up
  private restart(): void {
    this.score = 0
    this.lives = START_LIVES
    this.level = 1
    this.extraLifeGiven = false
    this.startLevel()
  }

  private startLevel(): void {
    this.aliens = makeAliens()
    this.aliveCount = this.aliens.length
    this.formationX = ALIEN_START_X
    this.formationY = ALIEN_START_Y
    this.dir = 1
    this.marchDist = 0
    this.marchTimer = MARCH_INTERVAL_MAX
    this.marchStep = 0
    this.bombTimer = 1.2
    this.bombSpeed = Math.min(BOMB_SPEED + EXTRA_BOMB_PER_WAVE * (this.level - 1), BOMB_SPEED_MIN)
    this.shields = buildShields()
    this.bullets = []
    this.bombs = []
    this.explosions = []
    this.popup = null
    this.ufo = null
    this.ufoTimer = 18
    this.sound.ufoStop()
    this.playerX = VIEW_W / 2
    this.playerAlive = true
    this.fireCooldown = 0
    this.status = 'playing'
    this.levelTimer = START_DELAY
    this.sound.levelStart()
    this.syncState()
  }

  private nextLevel(): void {
    this.level++
    this.startLevel()
  }

  private gameOver(): void {
    this.status = 'gameover'
    this.sound.ufoStop()
    this.sound.gameOver()
    if (this.score > this.highScore) {
      this.highScore = this.score
      writeHighScore(this.highScore)
    }
    this.syncState()
  }

  // ------------------------------------------------------------------ input
  private fire(): void {
    if (this.status !== 'playing' || !this.playerAlive) return
    if (this.levelTimer > 0) return
    if (this.fireCooldown > 0 || this.bullets.length >= MAX_PLAYER_BULLETS) return
    this.fireCooldown = PLAYER_FIRE_COOLDOWN
    this.bullets.push({ x: Math.round(this.playerX), y: PLAYER_Y - 2, vy: -PLAYER_BULLET_SPEED })
    this.sound.shoot()
  }

  private alienSpeed(): number {
    const killed = this.aliens.length - this.aliveCount
    return ALIEN_BASE_SPEED + ALIEN_LEVEL_SPEED_BONUS * (this.level - 1) + ALIEN_SPEED_PER_KILL * killed
  }

  private marchInterval(): number {
    const t = this.aliveCount / this.aliens.length
    return MARCH_INTERVAL_MIN + (MARCH_INTERVAL_MAX - MARCH_INTERVAL_MIN) * t
  }

  // ----------------------------------------------------------------- update
  private update(dt: number): void {
    if (this.popup) {
      this.popup.time -= dt
      if (this.popup.time <= 0) this.popup = null
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].time -= dt
      if (this.explosions[i].time <= 0) this.explosions.splice(i, 1)
    }

    if (this.status === 'levelclear') {
      this.levelTimer -= dt
      if (this.levelTimer <= 0) this.nextLevel()
    } else if (this.status === 'playing') {
      if (this.levelTimer > 0) {
        this.levelTimer -= dt
      } else {
        this.updatePlayer(dt)
        this.updateAliens(dt)
        this.updateShots(dt)
        this.updateUfo(dt)
        this.updateBombs(dt)
      }
      this.fireCooldown = Math.max(0, this.fireCooldown - dt)
      if (!this.playerAlive) {
        this.respawnTimer -= dt
        if (this.respawnTimer <= 0) {
          if (this.lives < 0) {
            this.gameOver()
          } else {
            this.playerAlive = true
            this.playerX = VIEW_W / 2
          }
        }
      }
    }
  }

  private updatePlayer(dt: number): void {
    if (!this.playerAlive) return
    const dir = (this.rightHeld ? 1 : 0) - (this.leftHeld ? 1 : 0)
    if (dir !== 0) {
      const half = 6
      this.playerX = Math.max(half, Math.min(VIEW_W - half, this.playerX + dir * PLAYER_SPEED * dt))
    }
    if (this.fireHeld) this.fire()
  }

  private alienX(alien: Alien): number {
    return this.formationX + alien.col * ALIEN_SPACING_X
  }

  private alienY(alien: Alien): number {
    return this.formationY + alien.row * ALIEN_SPACING_Y
  }

  private updateAliens(dt: number): void {
    if (this.aliveCount <= 0) return
    const speed = this.alienSpeed()
    this.marchDist += (speed * dt) / 8
    this.formationX += this.dir * speed * dt

    // Bounce off the screen edges, measured against the live invaders only.
    let min = VIEW_W
    let max = 0
    for (const alien of this.aliens) {
      if (!alien.alive) continue
      const x = this.alienX(alien)
      if (x < min) min = x
      if (x > max) max = x
    }
    if (min <= 2 || max >= VIEW_W - 14) {
      this.dir = this.dir === 1 ? -1 : 1
      this.formationX += this.dir * 2
      this.formationY += ALIEN_DROP
    }

    // Marching beat quickens along with the formation.
    this.marchTimer -= dt
    if (this.marchTimer <= 0) {
      this.marchTimer = this.marchInterval()
      this.sound.march(this.marchStep)
      this.marchStep = (this.marchStep + 1) % 4
    }

    // A random invader on the bottom of the column drops a bomb.
    this.bombTimer -= dt
    if (this.bombTimer <= 0 && this.bombs.length < MAX_BOMBS) {
      this.bombTimer = 0.6 + Math.random() * 0.9
      this.dropBomb()
    }

    // Landed on the cannon's line: game over.
    for (const alien of this.aliens) {
      if (alien.alive && this.alienY(alien) >= INVASION_Y) {
        this.gameOver()
        return
      }
    }
  }

  private dropBomb(): void {
    const candidates: Alien[] = []
    for (const alien of this.aliens) {
      if (!alien.alive) continue
      const below = this.aliens.find((a) => a.col === alien.col && a.row === alien.row + 1)
      if (!below || !below.alive) candidates.push(alien)
    }
    if (!candidates.length) return
    const alien = candidates[Math.floor(Math.random() * candidates.length)]
    const kind = Math.floor(Math.random() * 3) as 0 | 1 | 2
    this.bombs.push({
      x: this.alienX(alien) + 6,
      y: this.alienY(alien) + 8,
      vy: this.bombSpeed,
      frame: 0,
      kind,
    })
  }

  private updateShots(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]
      b.y += b.vy * dt
      b.x = Math.round(b.x)
      if (b.y < 8) {
        this.bullets.splice(i, 1)
        continue
      }
      if (this.strikeShield(b.x, b.y, BULLET_BLAST)) {
        this.bullets.splice(i, 1)
        this.sound.shieldHit()
        continue
      }
      const hit = this.hitAlien(b.x, b.y)
      if (hit) {
        this.bullets.splice(i, 1)
        this.killAlien(hit)
        continue
      }
      if (this.ufo && this.hitUfo(b.x, b.y)) {
        this.bullets.splice(i, 1)
        this.killUfo()
        continue
      }
      // Shots cancel each other out, as in the arcade original.
      for (let j = this.bombs.length - 1; j >= 0; j--) {
        const bomb = this.bombs[j]
        if (Math.abs(bomb.x - b.x) <= 1 && Math.abs(bomb.y - b.y) <= 3) {
          this.bombs.splice(j, 1)
          this.bullets.splice(i, 1)
          this.explosions.push({ x: b.x, y: b.y, kind: 0, time: 0.16 })
          break
        }
      }
    }
  }

  private hitAlien(x: number, y: number): Alien | null {
    let best: Alien | null = null
    for (const alien of this.aliens) {
      if (!alien.alive) continue
      const ax = this.alienX(alien)
      const ay = this.alienY(alien)
      const w = this.sprites.invader[alien.type][0].width
      if (x >= ax - 1 && x <= ax + w && y >= ay && y <= ay + 8) {
        if (!best || ay > this.alienY(best)) best = alien
      }
    }
    return best
  }

  private killAlien(alien: Alien): void {
    alien.alive = false
    this.aliveCount--
    this.addScore(ALIEN_POINTS[alien.type])
    this.explosions.push({ x: this.alienX(alien), y: this.alienY(alien), kind: 0, time: EXPLOSION_TIME })
    this.sound.alienDie()
    if (this.aliveCount === 0) {
      this.status = 'levelclear'
      this.levelTimer = LEVEL_CLEAR_DELAY
      this.sound.ufoStop()
      this.ufo = null
      this.syncState()
    }
  }

  private hitUfo(x: number, y: number): boolean {
    if (!this.ufo) return false
    const w = this.sprites.ufo.width
    return x >= this.ufo.x && x <= this.ufo.x + w && y >= this.ufo.y && y <= this.ufo.y + 7
  }

  private killUfo(): void {
    if (!this.ufo) return
    this.addScore(this.ufo.points)
    this.popup = { x: this.ufo.x, y: this.ufo.y, text: String(this.ufo.points), time: 1.2 }
    this.explosions.push({ x: this.ufo.x, y: this.ufo.y, kind: 2, time: EXPLOSION_TIME })
    this.ufo = null
    this.sound.ufoStop()
  }

  private updateUfo(dt: number): void {
    if (this.status !== 'playing') return
    if (!this.ufo) {
      this.ufoTimer -= dt
      if (this.ufoTimer <= 0) {
        this.ufoTimer = 20 + Math.random() * 16
        const w = this.sprites.ufo.width
        const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1
        this.ufo = {
          x: dir === 1 ? -w - 2 : VIEW_W + 2,
          y: UFO_Y,
          dir,
          points: UFO_POINTS[Math.floor(Math.random() * UFO_POINTS.length)],
        }
        this.sound.ufoStart()
      }
      return
    }
    this.ufo.x += this.ufo.dir * UFO_SPEED * dt
    const w = this.sprites.ufo.width
    if (this.ufo.x < -w - 3 || this.ufo.x > VIEW_W + 3) {
      this.ufo = null
      this.sound.ufoStop()
    }
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i]
      bomb.y += bomb.vy * dt
      bomb.frame = (((bomb.frame + 1) % 2) as 0 | 1)
      if (this.strikeShield(bomb.x, bomb.y, BOMB_BLAST)) {
        this.bombs.splice(i, 1)
        this.sound.shieldHit()
        continue
      }
      if (bomb.y > GROUND_Y) {
        this.bombs.splice(i, 1)
        this.explosions.push({ x: bomb.x, y: GROUND_Y - 3, kind: 0, time: 0.2 })
        continue
      }
      if (this.playerAlive && this.hitsPlayer(bomb.x, bomb.y)) {
        this.bombs.splice(i, 1)
        this.killPlayer()
      }
    }
  }

  private hitsPlayer(x: number, y: number): boolean {
    const half = 6
    return x >= this.playerX - half && x <= this.playerX + half && y >= PLAYER_Y && y <= PLAYER_Y + 8
  }

  private killPlayer(): void {
    this.playerAlive = false
    this.lives--
    this.explosions.push({ x: this.playerX, y: PLAYER_Y, kind: 1, time: EXPLOSION_TIME * 2.4 })
    this.bombs = []
    this.sound.playerDie()
    this.sound.ufoStop()
    this.ufo = null
    this.respawnTimer = 1.6
    this.syncState()
  }

  /** Carve a blast hole in the bunkers. Returns true if solid pixels were hit. */
  private strikeShield(x: number, y: number, blast: number): boolean {
    for (const shield of this.shields) {
      const lx = Math.round(x) - shield.x
      const ly = Math.round(y) - shield.y
      if (lx < -blast || ly < -blast || lx > shield.w + blast || ly > shield.h + blast) continue
      if (lx < 0 || ly < 0 || lx >= shield.w || ly >= shield.h) continue
      if (!shield.data[ly * shield.w + lx]) continue
      for (let by = Math.max(0, ly - blast); by <= Math.min(shield.h - 1, ly + blast); by++) {
        for (let bx = Math.max(0, lx - blast); bx <= Math.min(shield.w - 1, lx + blast); bx++) {
          const dx = bx - lx
          const dy = by - ly
          if (dx * dx + dy * dy <= blast * blast + blast) {
            shield.data[by * shield.w + bx] = 0
          }
        }
      }
      return true
    }
    return false
  }

  private addScore(points: number): void {
    this.score += points
    if (!this.extraLifeGiven && this.score >= EXTRA_LIFE_AT) {
      this.extraLifeGiven = true
      this.lives++
      this.sound.extraLife()
    }
    if (this.score > this.highScore) {
      this.highScore = this.score
      writeHighScore(this.highScore)
    }
    this.syncState()
  }

  // ------------------------------------------------------------------- draw
  private draw(): void {
    const ctx = this.ctx
    // Draw in 256×224 game pixels; the transform blows them up by an exact
    // integer number of device pixels. Both of these are re-asserted every
    // frame because resizing a canvas resets them.
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)

    this.drawGround()
    this.drawShields()
    this.drawAliens()
    this.drawUfo()
    this.drawBombs()
    this.drawPlayer()
    this.drawExplosions()
    this.drawHud()
  }

  private drawGround(): void {
    this.ctx.fillStyle = COLORS.accent
    this.ctx.fillRect(0, GROUND_Y, VIEW_W, 1)
  }

  private drawShields(): void {
    const ctx = this.ctx
    ctx.fillStyle = COLORS.shield
    for (const shield of this.shields) {
      for (let y = 0; y < shield.h; y++) {
        for (let x = 0; x < shield.w; x++) {
          if (shield.data[y * shield.w + x]) ctx.fillRect(shield.x + x, shield.y + y, 1, 1)
        }
      }
    }
  }

  private drawAliens(): void {
    const frame = Math.floor(this.marchDist) % 2
    for (const alien of this.aliens) {
      if (!alien.alive) continue
      const sprite = this.sprites.invader[alien.type][frame]
      this.ctx.drawImage(sprite, Math.round(this.alienX(alien)), Math.round(this.alienY(alien)))
    }
  }

  private drawUfo(): void {
    if (!this.ufo) return
    this.ctx.drawImage(this.sprites.ufo, Math.round(this.ufo.x), this.ufo.y)
  }

  private drawBombs(): void {
    const ctx = this.ctx
    for (const bomb of this.bombs) {
      const sprite = this.sprites.bombs[bomb.kind][bomb.frame]
      ctx.drawImage(sprite, Math.round(bomb.x) - 1, Math.round(bomb.y))
    }
    for (const shot of this.bullets) {
      ctx.fillStyle = COLORS.bullet
      ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 1, 4)
    }
  }

  private drawPlayer(): void {
    if (this.status === 'menu' || this.status === 'gameover' || !this.playerAlive) return
    this.ctx.drawImage(this.sprites.player, Math.round(this.playerX - 6), PLAYER_Y)
  }

  private drawExplosions(): void {
    const ctx = this.ctx
    for (const e of this.explosions) {
      if (e.kind === 0) {
        ctx.drawImage(this.sprites.invaderBoom, Math.round(e.x), Math.round(e.y))
      } else if (e.kind === 1) {
        const frame = Math.floor((1 - e.time / (EXPLOSION_TIME * 2.4)) * 2) % 2
        ctx.drawImage(this.sprites.playerBoom[frame], Math.round(e.x - 6), Math.round(e.y))
      } else {
        ctx.drawImage(this.sprites.ufo, Math.round(e.x), Math.round(e.y))
      }
    }
  }

  private text(
    str: string,
    x: number,
    y: number,
    color: string = COLORS.text,
    align: CanvasTextAlign = 'left',
  ): void {
    const width = measureText(str)
    const dx = align === 'center' ? Math.round(x - width / 2) : align === 'right' ? Math.round(x - width) : Math.round(x)
    this.ctx.drawImage(getTextTexture(str, color), dx, Math.round(y))
  }

  private drawHud(): void {
    // 5x7 pixel font, so keep the copy short and let it hug the edges.
    this.text(String(this.score).padStart(4, '0'), 6, 5)
    this.text(String(this.highScore).padStart(4, '0'), VIEW_W - 6, 5, COLORS.text, 'right')
    this.text('WAVE ' + this.level, VIEW_W / 2, 5, COLORS.accent, 'center')
    if (this.muted) this.text('MUTE', 6, 15, COLORS.accent, 'left')

    // Remaining lives as mini cannons, bottom-left.
    const lives = Math.max(0, this.lives)
    for (let i = 0; i < Math.min(lives, 5); i++) {
      this.ctx.drawImage(this.sprites.player, 6 + i * 14, PLAYER_Y)
    }

    if (this.popup) {
      this.text(this.popup.text, this.popup.x + 8, this.popup.y, COLORS.ufo, 'center')
    }

    if (this.status === 'levelclear') {
      this.text('WAVE ' + this.level + ' CLEARED', VIEW_W / 2, 110, COLORS.accent, 'center')
    } else if (this.status === 'paused') {
      this.text('PAUSED', VIEW_W / 2, 110, COLORS.accent, 'center')
    } else if (this.status === 'playing' && this.levelTimer > 0) {
      // Brief wave announcement while the formation holds still.
      this.text('WAVE ' + this.level, VIEW_W / 2, 110, COLORS.text, 'center')
    }
  }
}
