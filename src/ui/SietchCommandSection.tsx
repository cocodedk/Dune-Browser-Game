import { EventBus } from '../EventBus'
import type { SietchState, SietchTask } from '../game-engine/sietch/types'
import {
  HARVEST_PAYOUT_THRESHOLD,
  HARVEST_MIN_WORKERS,
  HARVEST_SPICE_PAYOUT,
  TRAIN_MIN_WORKERS,
  TRAIN_TROOPS_PAYOUT,
} from '../game-engine/sietch/types'

interface Props {
  villageId: string
  villageName: string
  villageOwner: string
  sietch: SietchState | null
  playerIsHere: boolean
}

export default function SietchCommandSection({
  villageId,
  villageName,
  villageOwner,
  sietch,
  playerIsHere,
}: Props) {
  if (!playerIsHere) return null
  if (villageOwner !== 'fremen') return null
  if (!sietch) return null

  if (!sietch.pledgedToPlayer) {
    return <PledgePanel villageId={villageId} villageName={villageName} />
  }

  return <CommandPanel villageId={villageId} sietch={sietch} />
}

function PledgePanel({ villageId, villageName }: { villageId: string; villageName: string }) {
  function pledge() {
    EventBus.emit('player:pledge_sietch', { villageId })
  }
  return (
    <div style={styles.section}>
      <div style={styles.header}>SIETCH</div>
      <p style={styles.prose}>
        The Fremen of {villageName} watch you. They have not yet sworn to your cause.
      </p>
      <button onClick={pledge} style={styles.btn}>
        Pledge the Fremen of {villageName}
      </button>
    </div>
  )
}

function taskDisplayLabel(task: SietchTask | null): string {
  if (task === 'harvest_spice') return 'Harvesting Spice'
  if (task === 'train_troops') return 'Training Fedaykin'
  return 'Idle'
}

interface TaskButtonProps {
  task: SietchTask
  currentTask: SietchTask | null
  workers: number
  minWorkers: number
  label: string
  activeLabel: string
  villageId: string
}

function TaskButton({ task, currentTask, workers, minWorkers, label, activeLabel, villageId }: TaskButtonProps) {
  const isActive = currentTask === task
  const otherTaskActive = currentTask !== null && currentTask !== task
  const tooFew = workers < minWorkers
  const disabled = isActive || otherTaskActive || tooFew
  const btnLabel = isActive ? activeLabel : tooFew ? 'Too few Fremen' : label

  function assign() {
    EventBus.emit('player:assign_sietch_task', { villageId, task })
  }

  return (
    <button
      onClick={assign}
      disabled={disabled}
      style={{ ...styles.btn, opacity: disabled ? 0.4 : 1 }}
    >
      {btnLabel}
    </button>
  )
}

function CommandPanel({ villageId, sietch }: { villageId: string; sietch: SietchState }) {
  const pct = Math.min(100, (sietch.outputProgress / HARVEST_PAYOUT_THRESHOLD) * 100)
  const hasTask = sietch.currentTask !== null
  const payoutLabel = sietch.currentTask === 'train_troops'
    ? `yields ${TRAIN_TROOPS_PAYOUT} troops`
    : `yields ${HARVEST_SPICE_PAYOUT} spice`

  function stopTask() {
    EventBus.emit('player:stop_sietch_task', { villageId })
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>SIETCH — PLEDGED</div>
      <div style={styles.row}>
        <span style={styles.label}>Fremen workers</span>
        <span style={styles.value}>{sietch.fremenWorkers}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Current task</span>
        <span style={styles.value}>{taskDisplayLabel(sietch.currentTask)}</span>
      </div>
      {hasTask ? (
        <>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
          <div style={styles.progressLabel}>
            {sietch.outputProgress.toFixed(1)} / {HARVEST_PAYOUT_THRESHOLD.toFixed(1)} — {payoutLabel}
          </div>
          <button onClick={stopTask} style={styles.stopBtn}>Stop task · choose another</button>
        </>
      ) : (
        <>
          <TaskButton
            task="harvest_spice"
            currentTask={sietch.currentTask}
            workers={sietch.fremenWorkers}
            minWorkers={HARVEST_MIN_WORKERS}
            label="Assign Fremen → Harvest spice"
            activeLabel="Harvesting..."
            villageId={villageId}
          />
          <TaskButton
            task="train_troops"
            currentTask={sietch.currentTask}
            workers={sietch.fremenWorkers}
            minWorkers={TRAIN_MIN_WORKERS}
            label="Assign Fremen → Train as Fedaykin"
            activeLabel="Training..."
            villageId={villageId}
          />
        </>
      )}
    </div>
  )
}

const styles = {
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #3d2b10' },
  header: {
    color: '#d4a017',
    fontSize: 10,
    letterSpacing: '0.15em',
    fontWeight: 'bold' as const,
    marginBottom: 6,
  },
  prose: {
    color: '#a89060',
    fontSize: 12,
    fontStyle: 'italic' as const,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#8b6914', fontSize: 12 },
  value: { color: '#d4a017', fontSize: 13 },
  progressTrack: {
    height: 6,
    background: '#2a1e0a',
    borderRadius: 3,
    margin: '6px 0 2px',
    overflow: 'hidden' as const,
  },
  progressFill: { height: '100%', background: '#c8a84b', transition: 'width 0.4s' },
  progressLabel: { color: '#6b5a2a', fontSize: 10, marginBottom: 8 },
  btn: {
    background: '#2a1e0a',
    color: '#d4a017',
    border: '1px solid #d4a017',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer' as const,
    fontSize: 12,
    width: '100%',
    marginTop: 6,
  },
  stopBtn: {
    background: 'transparent',
    color: '#8b6914',
    border: '1px solid #3d2b10',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer' as const,
    fontSize: 11,
    width: '100%',
    marginTop: 4,
  },
}
