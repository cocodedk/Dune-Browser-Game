// src/game-engine/dialogue/engineFlags.ts
// Flags that gate a written conversation but are written by engine code
// rather than a dialogue effect's setFlags/addFlags.
//
// This is the allowlist flagCoverage.test.ts checks every condition key
// against. It is deliberately a value, not just a type: each entry names the
// function that writes it, so adding a key here is a claim someone can go
// verify, not a rubber stamp that silences the test. If you add a key here
// without a matching write in code, the next audit should treat that as a
// bug, not as documentation.

export const ENGINE_WRITTEN_FLAGS: Readonly<Record<string, string>> = {
  'pledged.count': 'SietchSystem.pledgePlayerSietch(), CombatSystem.attackVillage()',
  'ritual.count': 'economy/endgameOps.attemptRitual()',
  'forts.destroyed': 'economy/endgameOps.assaultFort()',
  'quota.cycle': 'EconomySystem (quota settlement)',
  'quota.patience': 'EconomySystem (quota settlement)',
  'quota.arrears': 'EconomySystem (quota settlement)',
  'raids.repelled': 'economy/raidRun.runRaidCheck()',
  'smuggler.standing': 'economy/marketOps',
}
