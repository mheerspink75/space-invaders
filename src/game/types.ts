export type Status = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelclear'

/** Row 0 is the top (smallest) invader, row 4 the bottom (biggest). */
export interface Alien {
  row: number
  col: number
  /** 0 = squid (30pts), 1 = crab (20pts), 2 = octopus (10pts) */
  type: 0 | 1 | 2
  alive: boolean
}

export interface PlayerBullet {
  x: number
  y: number
  vy: number
}

export interface AlienBomb {
  x: number
  y: number
  vy: number
  /** Animation frame of the squiggly bomb sprite. */
  frame: 0 | 1
  kind: 0 | 1 | 2
}

export interface Explosion {
  x: number
  y: number
  /** 0 = invader, 1 = player, 2 = ufo */
  kind: 0 | 1 | 2
  time: number
}

export interface Ufo {
  x: number
  y: number
  dir: 1 | -1
  points: number
}

/** A destructible bunker: one byte per pixel, 1 = solid. */
export interface Shield {
  x: number
  y: number
  w: number
  h: number
  data: Uint8Array
}

export interface GameState {
  status: Status
  score: number
  highScore: number
  lives: number
  level: number
  muted: boolean
}
