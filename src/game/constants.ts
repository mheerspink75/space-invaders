/** Internal (pixel-perfect) render resolution. The canvas is scaled up by CSS. */
export const VIEW_W = 256
export const VIEW_H = 224
/** The green line the cannon sits on. */
export const GROUND_Y = 218

export const COLORS = {
  player: '#ffffff',
  bullet: '#ffffff',
  invader: '#ffffff',
  ufo: '#ff3b3b',
  shield: '#3ce34a',
  text: '#ffffff',
  accent: '#3ce34a',
} as const

// ---------------------------------------------------------------- formation
export const ALIEN_ROWS = 5
export const ALIEN_COLS = 11
export const ALIEN_SPACING_X = 16
export const ALIEN_SPACING_Y = 18
export const ALIEN_START_X = Math.round((VIEW_W - ALIEN_COLS * ALIEN_SPACING_X) / 2)
export const ALIEN_START_Y = 34
export const ALIEN_DROP = 8
export const ALIEN_POINTS = [30, 20, 10] as const

/** Invaders get quicker as they are destroyed, and each wave starts faster. */
export const ALIEN_BASE_SPEED = 12
export const ALIEN_SPEED_PER_KILL = 1.15
export const ALIEN_LEVEL_SPEED_BONUS = 7

// ------------------------------------------------------------------- player
export const PLAYER_Y = 210
export const PLAYER_SPEED = 105
export const PLAYER_FIRE_COOLDOWN = 0.32
export const PLAYER_BULLET_SPEED = 235
export const MAX_PLAYER_BULLETS = 1
export const MAX_BOMBS = 3
export const START_LIVES = 3
export const EXTRA_LIFE_AT = 1500

// --------------------------------------------------------------------- ufo
export const UFO_Y = 20
export const UFO_SPEED = 42
export const UFO_POINTS = [50, 100, 150, 300] as const

// ----------------------------------------------------------------- shields
/** Bunker dimensions come from the artwork in sprites.ts (24x16). */
export const SHIELD_Y = 178
export const SHIELD_XS = [32, 88, 144, 200] as const
/** Blast radius carved out of a bunker when something hits it. */
export const BOMB_BLAST = 2
export const BULLET_BLAST = 1

// ------------------------------------------------------------------- timing
export const BOMB_SPEED = 78
export const BOMB_SPEED_MIN = 100
export const EXTRA_BOMB_PER_WAVE = 6
export const MARCH_INTERVAL_MAX = 0.62
export const MARCH_INTERVAL_MIN = 0.08
export const EXPLOSION_TIME = 0.45
/** The wave is lost once the invaders get this close to the player's line. */
export const INVASION_Y = PLAYER_Y - 12
export const START_DELAY = 1.1
export const LEVEL_CLEAR_DELAY = 1.8
export const HIGH_SCORE_KEY = 'space-invaders:highscore'
