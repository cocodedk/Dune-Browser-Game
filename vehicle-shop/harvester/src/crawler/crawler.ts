// vehicle-shop/harvester/src/crawler/crawler.ts
// Entry point main.ts calls. Thin mutable wrapper around the pure
// nextCrawler() step — all the dynamics live in kinematics.ts, so this file
// has nothing to get wrong beyond wiring.

import type { CrawlerModel, CrawlerInput, CrawlerState } from '../contracts'
import { nextCrawler } from './kinematics'

export function createCrawler(): CrawlerModel {
  let current: CrawlerState = {
    position: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    trackLeft: 0,
    trackRight: 0,
  }

  return {
    get state() {
      return current
    },
    step(input: CrawlerInput, dt: number) {
      current = nextCrawler(current, input, dt)
    },
    reset() {
      current = {
        position: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        roll: 0,
        speed: 0,
        trackLeft: 0,
        trackRight: 0,
      }
    },
  }
}
