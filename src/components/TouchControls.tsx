import { useCallback, useRef } from 'react'

interface TouchControlsProps {
  onLeft: (down: boolean) => void
  onRight: (down: boolean) => void
  onFire: (down: boolean) => void
}

function useHold(handler: (down: boolean) => void) {
  const active = useRef(false)
  return useCallback(
    (down: boolean) => {
      if (down === active.current) return
      active.current = down
      handler(down)
    },
    [handler],
  )
}

interface PadButtonProps {
  label: string
  className?: string
  onHold: (down: boolean) => void
}

function PadButton({ label, className, onHold }: PadButtonProps) {
  return (
    <button
      type="button"
      className={`pad ${className ?? ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        onHold(true)
      }}
      onPointerUp={(e) => {
        e.preventDefault()
        onHold(false)
      }}
      onPointerCancel={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

/** On-screen controls, only rendered on coarse-pointer devices. */
export function TouchControls({ onLeft, onRight, onFire }: TouchControlsProps) {
  const holdLeft = useHold(onLeft)
  const holdRight = useHold(onRight)
  const holdFire = useHold(onFire)

  return (
    <div className="pad">
      <div className="pad__side">
        <PadButton label="◀" onHold={holdLeft} />
        <PadButton label="▶" onHold={holdRight} />
      </div>
      <PadButton label="FIRE" className="pad--fire" onHold={holdFire} />
    </div>
  )
}
