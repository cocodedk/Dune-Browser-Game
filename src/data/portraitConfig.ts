import type { FactionId } from '../types';

export type PortraitKey =
  | 'elder'
  | 'harkonnen'
  | 'fremen_naib'
  | 'atreides_envoy'
  | 'smuggler_baron'
  | 'imperial_legate'
  | 'neutral_elder';

export const DIALOGUE_PORTRAITS: Record<string, PortraitKey> = {
  village_leader: 'elder',
  harkonnen_stronghold: 'harkonnen',
  fremen_sietch: 'fremen_naib',
  atreides_embassy: 'atreides_envoy',
  smuggler_outpost: 'smuggler_baron',
  emperor_delegation: 'imperial_legate',
  neutral_settlement: 'neutral_elder',
};

export const PORTRAIT_ASSETS: Record<PortraitKey, string> = {
  elder: 'portraits/elder',
  harkonnen: 'portraits/harkonnen',
  fremen_naib: 'portraits/fremen_naib',
  atreides_envoy: 'portraits/atreides_envoy',
  smuggler_baron: 'portraits/smuggler_baron',
  imperial_legate: 'portraits/imperial_legate',
  neutral_elder: 'portraits/neutral_elder',
};

export const PORTRAIT_FACTION: Record<PortraitKey, FactionId> = {
  elder: 'neutral',
  harkonnen: 'harkonnen',
  fremen_naib: 'fremen',
  atreides_envoy: 'atreides',
  smuggler_baron: 'smugglers',
  imperial_legate: 'emperor',
  neutral_elder: 'neutral',
};

export function getPortraitKey(treeId: string): PortraitKey | undefined {
  return DIALOGUE_PORTRAITS[treeId];
}