import type { RegionId } from '../types'

export interface TerritoryPolygon {
  id: RegionId
  vertices: [number, number][]
  center: { x: number; y: number }
}

export const TERRITORY_POLYGONS: TerritoryPolygon[] = [
  {
    id: 'hagg',
    vertices: [[0,0],[280,0],[270,100],[250,185],[110,175],[0,150]],
    center: { x: 130, y: 80 },
  },
  {
    id: 'arrakeen',
    vertices: [[280,0],[570,0],[575,110],[545,195],[415,205],[250,185],[270,100]],
    center: { x: 430, y: 120 },
  },
  {
    id: 'imperial_basin',
    vertices: [[570,0],[800,0],[800,220],[670,230],[545,195],[575,110]],
    center: { x: 700, y: 100 },
  },
  {
    id: 'red_wall_sietch',
    vertices: [[0,150],[110,175],[160,250],[130,310],[0,330]],
    center: { x: 70, y: 240 },
  },
  {
    id: 'tsimpo',
    vertices: [[110,175],[250,185],[415,205],[545,195],[555,325],[515,380],[385,375],[280,335],[160,250]],
    center: { x: 380, y: 285 },
  },
  {
    id: 'carthag',
    vertices: [[545,195],[670,230],[800,220],[800,440],[580,450],[515,380],[555,325]],
    center: { x: 640, y: 350 },
  },
  {
    id: 'sietch_tabr',
    vertices: [[0,330],[130,310],[280,335],[285,420],[285,500],[0,500]],
    center: { x: 140, y: 390 },
  },
  {
    id: 'cielago_depression',
    vertices: [[285,420],[385,375],[515,380],[580,450],[800,440],[800,500],[285,500]],
    center: { x: 520, y: 460 },
  },
]
