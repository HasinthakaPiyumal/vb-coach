import React, { useEffect } from 'react'
import { useFBX } from '@react-three/drei'

export default function InspectFBX() {
  const fbx = useFBX('/BodyBlock.fbx')
  
  useEffect(() => {
    if (fbx) {
      console.log('--- Mixamo FBX Structure ---')
      console.log('FBX Object Name:', fbx.name)
      
      const bones = []
      fbx.traverse((child) => {
        if (child.isBone) {
          bones.push(child.name)
        }
      })
      console.log('Bones found:', JSON.stringify(bones))
      
      const meshes = []
      fbx.traverse((child) => {
        if (child.isMesh) {
          meshes.push({
            name: child.name,
            material: child.material ? (Array.isArray(child.material) ? child.material.map(m => m.name) : child.material.name) : null
          })
        }
      })
      console.log('Meshes found:', JSON.stringify(meshes))
      
      if (fbx.animations && fbx.animations.length > 0) {
        const anims = fbx.animations.map(a => ({ name: a.name, duration: a.duration }))
        console.log('Animations found in FBX:', JSON.stringify(anims))
      } else {
        console.log('No animations found in FBX')
      }
    }
  }, [fbx])

  return <primitive object={fbx} scale={0.01} position={[0, 0, 0]} />
}
