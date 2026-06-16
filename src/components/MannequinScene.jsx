import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import Mannequin from './Mannequin'

export default function MannequinScene({ animationId = 'idle', workoutStatus = 'idle', showWall = false, wallDistance = 2, hideBall = false }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [1.8, 1.4, 3.0], fov: 45 }}
        style={{ background: '#0a0a0f' }}
      >
        {/* Lights */}
        <ambientLight intensity={0.5} />
        
        {/* Rim Light for visual highlight */}
        <directionalLight
          position={[-2, 3, -3]}
          intensity={0.6}
          color="#ffd60a"
        />

        {/* Main Light casting soft shadows */}
        <directionalLight
          position={[3, 4, 3]}
          intensity={0.8}
        />

        {/* Procedural Mannequin */}
        <Suspense fallback={null}>
          <Mannequin
            animationId={animationId}
            workoutStatus={workoutStatus}
            showWall={showWall}
            wallDistance={wallDistance}
            hideBall={hideBall}
          />
        </Suspense>

        {/* 3D Wall (Renders if showWall is true) */}
        {showWall && (
          <group position={[0, 1.2, -wallDistance]}>
            {/* Transparent wall plane */}
            <mesh>
              <planeGeometry args={[3, 2.4]} />
              <meshStandardMaterial 
                color="#1e1e38" 
                transparent 
                opacity={0.3} 
                roughness={0.1}
                metalness={0.9}
                side={2} // DoubleSide
              />
            </mesh>
            {/* Wall frame border */}
            <mesh position={[0, 0, 0.005]}>
              <planeGeometry args={[3.04, 2.44]} />
              <meshBasicMaterial color="#ffd60a" wireframe={true} />
            </mesh>
            {/* Concentric targets on the wall */}
            <mesh position={[0, 0, 0.01]}>
              <ringGeometry args={[0.22, 0.24, 32]} />
              <meshBasicMaterial color="#ffd60a" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <ringGeometry args={[0.08, 0.1, 32]} />
              <meshBasicMaterial color="#ffd60a" transparent opacity={0.8} />
            </mesh>
            {/* Distance marker text floor line */}
            <mesh position={[0, -1.2, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3, 0.02]} />
              <meshBasicMaterial color="#ffd60a" />
            </mesh>
          </group>
        )}

        {/* Floor Grid (Sleek dark grid helper) */}
        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1e1e38"
          sectionSize={2.5}
          sectionThickness={1.0}
          sectionColor="#ffd60a"
          fadeDistance={10}
          infiniteGrid
        />

        {/* Ground accent glow plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial color="#0a0a0f" transparent opacity={0.8} />
        </mesh>

        {/* Controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          minDistance={1.2}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2 - 0.02} // restrict camera going underground
          target={[0, 0.9, 0]}
        />
      </Canvas>
    </div>
  )
}
