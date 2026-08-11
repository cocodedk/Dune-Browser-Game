import { useGameStore, selectSietch } from './store'
import { EventBus } from '../EventBus'
import type { Village } from '../types'
import PledgePanel from './PledgePanel'
import PeopleHere from './PeopleHere'
import TravelAction from './TravelAction'

const OWNER_LABEL: Record<string, string> = {
  player:    'Your territory',
  harkonnen: 'House Harkonnen',
  fremen:    'Fremen',
  atreides:  'House Atreides',
  smugglers: 'Smugglers',
  emperor:   'Padishah Emperor',
  neutral:   'Neutral',
}

export default function VillagePanel() {
  const { selectedVillage, world } = useGameStore()

  if (!selectedVillage) {
    return (
      <div style={styles.panel}>
        <p style={{ color: '#6b5a2a', fontStyle: 'italic', fontSize: 13 }}>
          Click a village on the map to inspect it.
        </p>
      </div>
    )
  }

  const region = world.regions.find(r => r.id === selectedVillage.id) ?? null
  const isHere = world.player.location === selectedVillage.id
  const isTraveling = world.player.state === 'traveling'
  const sietch = selectSietch(world, selectedVillage.id)
  // Sietch-kind locations: SietchState is now the sole loyalty authority
  // (docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
  // loyalty") — Village.loyalty is a stale legacy copy for these. Every
  // other kind still reads Village.loyalty, which the (untouched) village
  // diplomacy systems keep mutating.
  const loyalty = selectedVillage.kind === 'sietch'
    ? sietch?.loyalty ?? selectedVillage.loyalty
    : selectedVillage.loyalty

  function travel() {
    EventBus.emit('player:travel', { targetVillageId: selectedVillage!.id })
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>{selectedVillage.name}</h3>
      <p style={styles.owner}>{OWNER_LABEL[selectedVillage.owner] ?? selectedVillage.owner}</p>

      {/*
        Above the statistics on purpose. Talking to people is the primary verb
        at a location you are standing in, and this panel is long enough that
        anything further down risked falling off the bottom of a 800px
        window — captured, the list rendered entirely below the fold with only
        its heading visible. It draws nothing when the player is elsewhere, so
        inspecting a distant village is unchanged.
      */}
      <PeopleHere villageId={selectedVillage.id} playerIsHere={isHere} />

      <div style={styles.row}>
        <span style={styles.label}>Population</span>
        <span style={styles.value}>{selectedVillage.population}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Spice stockpile</span>
        <span style={styles.value}>{selectedVillage.spice.toFixed(1)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Loyalty</span>
        <LoyaltyBar value={loyalty} />
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Status</span>
        <span style={{ ...styles.value, color: statusColor(selectedVillage) }}>
          {selectedVillage.status}
        </span>
      </div>

      {region && (
        <>
          <div style={styles.divider} />
          <div style={styles.row}>
            <span style={styles.label}>Spice yield</span>
            <span style={styles.value}>{region.spice}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Unrest</span>
            <span style={{ ...styles.value, color: region.unrest >= 60 ? '#c62828' : region.unrest >= 30 ? '#d4a017' : '#4caf50' }}>
              {region.unrest}
            </span>
          </div>
        </>
      )}

      <PledgePanel
        villageId={selectedVillage.id}
        villageName={selectedVillage.name}
        villageOwner={selectedVillage.owner}
        sietch={sietch}
        playerIsHere={isHere}
      />

      <div style={{ marginTop: 12 }}>
        {isHere ? (
          <span style={{ color: '#4caf50', fontSize: 13 }}>📍 You are here</span>
        ) : (
          <TravelAction
            name={selectedVillage.name}
            id={selectedVillage.id}
            isTraveling={isTraveling}
            onTravel={travel}
          />
        )}
      </div>
    </div>
  )
}

function LoyaltyBar({ value }: { value: number }) {
  const color = value >= 60 ? '#4caf50' : value >= 30 ? '#d4a017' : '#c62828'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 8, background: '#2a1e0a', borderRadius: 4 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ color, fontSize: 12 }}>{value}</span>
    </div>
  )
}

function statusColor(v: Village) {
  return v.status === 'friendly' ? '#4caf50' : v.status === 'rebelling' ? '#ff6f00' : '#d4a017'
}

const styles = {
  panel: { padding: 16, borderBottom: '1px solid #3d2b10', minHeight: 140 },
  title: { color: '#d4a017', margin: '0 0 4px', fontSize: 16 },
  owner: { color: '#8b6914', fontSize: 12, margin: '0 0 12px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { color: '#8b6914', fontSize: 12 },
  value: { color: '#d4a017', fontSize: 13 },
  divider: { borderTop: '1px solid #2a1e0a', margin: '8px 0' },
  btn: {
    background: '#2a1e0a',
    color: '#d4a017',
    border: '1px solid #d4a017',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
    width: '100%',
  },
}
