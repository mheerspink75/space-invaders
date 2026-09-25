/**
 * All artwork is defined as ASCII bitmaps and baked into offscreen canvases
 * once at boot — no image assets to download, crisp pixels at any scale.
 */

type Bitmap = readonly string[]

/** Top row: the squid. */
const SQUID: Bitmap[] = [
  [
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '...##.##...',
  ],
  [
    '..#.....#..',
    '#..#...#..#',
    '#.#######.#',
    '###.###.###',
    '###########',
    '.#########.',
    '..#.....#..',
    '.#.......#.',
  ],
]

/** Middle two rows: the crab. */
const CRAB: Bitmap[] = [
  [
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '#.......#.#',
  ],
  [
    '..#.....#..',
    '#..#...#..#',
    '#.#######.#',
    '###.###.###',
    '###########',
    '.#########.',
    '.#.......#.',
    '#.#.....#.#',
  ],
]

/** Bottom two rows: the octopus. */
const OCTOPUS: Bitmap[] = [
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '...###..###.',
    '..##.##.##..',
    '##........##',
  ],
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '..###...###.',
    '.#..##..##..',
    '##........##',
  ],
]

const PLAYER: Bitmap = [
  '......#......',
  '.....###.....',
  '.....###.....',
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
]

const PLAYER_BOOM_A: Bitmap = [
  '..#..#...#...',
  '..#..#...#...',
  '...#..#..#...',
  '#...#..#..#..',
  '..#..#...#...',
  '.#...#..#..#.',
  '..#..#..#...#',
  '...#...#..#..',
]

const PLAYER_BOOM_B: Bitmap = [
  '.#..#...#..#.',
  '..#..#...#...',
  '..#...#..#...',
  '#..#..#..#..#',
  '..#..#...#...',
  '.#...#..#..#.',
  '...#..#..#...',
  '..#...#..#..#',
]

const INVADER_BOOM: Bitmap = [
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
  '..#...#..#..#',
]

const UFO: Bitmap = [
  '....######......',
  '..##########....',
  '.############...',
  '##.##.##.##.##..',
  '############....',
  '..###..##..###..',
  '...#....#.......',
]

/** Classic squiggly invader bombs, two animation frames each. */
const BOMBS: Bitmap[][] = [
  [
    ['..#', '.#.', '#..', '.#.', '..#', '...'],
    ['#..', '.#.', '..#', '.#.', '#..', '...'],
  ],
  [
    ['#.#', '.#.', '.#.', '.#.', '.#.', '#.#'],
    ['#.#', '.#.', '.#.', '.#.', '.#.', '#.#'],
  ],
  [
    ['##.', '.#.', '.#.', '.#.', '..#', '..#'],
    ['.##', '.#.', '.#.', '.#.', '#..', '#..'],
  ],
]

/** Bunker shape (the classic arch). 1 = solid pixel, 0 = empty. 24x16. */
const SHIELD_MASK: Bitmap = [
  '..####################..',
  '.######################.',
  '#######..........#######',
  '######............######',
  '#####..............#####',
  '#####..............#####',
  '#####..............#####',
  '#####..............#####',
  '######............######',
  '#######..........#######',
  '######################..',
  '######################..',
  '#####################...',
  '####################....',
  '###################.....',
  '##############..........',
]

export const SHIELD_BITMAP = SHIELD_MASK

function bake(bitmap: Bitmap, color: string): HTMLCanvasElement {
  const w = bitmap[0].length
  const h = bitmap.length
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  for (let y = 0; y < h; y++) {
    const row = bitmap[y]
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') ctx.fillRect(x, y, 1, 1)
    }
  }
  return canvas
}

function bakeAll(bitmaps: readonly Bitmap[], color: string): HTMLCanvasElement[] {
  return bitmaps.map((b) => bake(b, color))
}

export interface Sprites {
  /** [type][frame] */
  invader: HTMLCanvasElement[][]
  player: HTMLCanvasElement
  playerBoom: HTMLCanvasElement[]
  invaderBoom: HTMLCanvasElement
  ufo: HTMLCanvasElement
  /** [kind][frame] */
  bombs: HTMLCanvasElement[][]
}

let cached: Sprites | null = null

export function getSprites(white: string, ufoColor: string): Sprites {
  if (cached) return cached
  cached = {
    invader: [bakeAll(SQUID, white), bakeAll(CRAB, white), bakeAll(OCTOPUS, white)],
    player: bake(PLAYER, white),
    playerBoom: [bake(PLAYER_BOOM_A, white), bake(PLAYER_BOOM_B, white)],
    invaderBoom: bake(INVADER_BOOM, white),
    ufo: bake(UFO, ufoColor),
    bombs: BOMBS.map((frames) => bakeAll(frames, white)),
  }
  return cached
}

/** Boots the (browser-only) sprite cache. Call once before the first frame. */
export function preloadSprites(white: string, ufoColor: string): void {
  getSprites(white, ufoColor)
}
