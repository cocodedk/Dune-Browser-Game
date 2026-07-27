import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from '../game-render/BootScene'
import { GameScene } from '../game-render/GameScene'

export default function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current) return // Already initialized

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: 800,
      height: 500,
      backgroundColor: '#1a1208',
      scene: [BootScene, GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div
      id="phaser-container"
      style={{
        width: 800,
        height: 500,
        flexShrink: 0,
        border: '1px solid #3d2b10',
        borderRadius: 4,
      }}
    />
  )
}
