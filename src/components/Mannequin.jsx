import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import animations from '../data/animations.json'

const mapAnimationId = (id) => {
  if (!id) return 'idle'
  const lower = id.toLowerCase()
  if (animations[lower]) return lower

  if (lower === 'squat_slow' || lower === 'squat_pulse' || lower.includes('squat')) {
    if (lower.includes('jump')) return 'jump_squat'
    return 'squat_atg'
  }
  if (lower.includes('lunge')) return 'forward_lunge'
  if (lower.includes('jog') || lower.includes('quick_feet') || lower.includes('skip_in_place')) return 'jog_in_place'
  if (lower.includes('pushup') || lower.includes('push_up') || lower.includes('press_up')) return 'pushup'
  if (lower.includes('plank')) return 'plank'
  if (lower.includes('jump') || lower.includes('hop') || lower.includes('drop') || lower.includes('bound') || lower.includes('approach')) return 'block_jump'
  if (lower.includes('pass') || lower.includes('dig') || lower.includes('rally')) {
    if (lower.includes('overhead') || lower.includes('set')) return 'overhead_pass_l1'
    return 'forearm_pass_l1'
  }
  if (lower.includes('set') || lower.includes('toss')) return 'overhead_pass_l1'
  if (lower.includes('swing') || lower.includes('hit') || lower.includes('attack') || lower.includes('spike')) return 'arm_swing_l1'
  if (lower.includes('knee')) return 'high_knees'
  if (lower.includes('butt') || lower.includes('kick')) return 'butt_kicks'
  if (lower.includes('calf') || lower.includes('raise')) return 'calf_raise'
  return 'idle'
}

const findLowestSkinnedVertexY = (model, vertex) => {
  let lowestY = Infinity

  model.updateMatrixWorld(true)
  model.traverse((child) => {
    if (!child.isSkinnedMesh) return

    child.skeleton?.update()
    const position = child.geometry.attributes.position
    if (!position) return

    for (let i = 0; i < position.count; i++) {
      child.getVertexPosition(i, vertex)
      child.localToWorld(vertex)
      lowestY = Math.min(lowestY, vertex.y)
    }
  })

  return Number.isFinite(lowestY) ? lowestY : 0
}

export default function Mannequin({ animationId = 'idle', workoutStatus = 'idle', showWall = false, wallDistance = 2 }) {
  // Load the Mixamo rigged FBX model
  const fbx = useFBX('/BodyBlock.fbx')

  // Refs for tracking animation time, ball, and default bind-pose rotations
  const timeRef = useRef(0)
  const ballRef = useRef()
  const outerGroupRef = useRef()
  const groundVertexRef = useRef(new THREE.Vector3())
  const defaultRotations = useRef({})

  // Reset timer on animation change
  useEffect(() => {
    timeRef.current = 0
  }, [animationId])

  // Materials system
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({
      color: '#fffbe0', // Light white-toned yellow
      roughness: 0.6,
      metalness: 0.2,
    }),
    glasses: new THREE.MeshBasicMaterial({
      color: '#1a1a2e'
    })
  }), [])

  // Calculate the scale factor and y-offset dynamically to make the character stand on the ground and be 1.8m tall
  const { scaleFactor, yOffset } = useMemo(() => {
    if (!fbx) return { scaleFactor: 1, yOffset: 0 }
    
    // Save current transformations to avoid mutating the cached object across renders
    const oldScale = fbx.scale.clone()
    const oldPos = fbx.position.clone()
    const oldRot = fbx.rotation.clone()
    
    // Reset to raw defaults to measure the true bounding box
    fbx.scale.set(1, 1, 1)
    fbx.position.set(0, 0, 0)
    fbx.rotation.set(0, 0, 0)
    
    // Force bones back to bind pose before measuring or storing default rotations
    fbx.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.pose()
      }
    })
    
    // Force world matrix update immediately so Box3.expandByObject measures unscaled raw dimensions
    fbx.updateMatrixWorld(true)

    // Store default rotations synchronously on first load (before any frames mutate the bones)
    if (!fbx.userData.defaultRotations) {
      const defaultRots = {}
      fbx.traverse((child) => {
        if (child.isBone) {
          defaultRots[child.name] = child.rotation.clone()
        }
      })
      fbx.userData.defaultRotations = defaultRots
      
      const hipsBone = fbx.getObjectByName('mixamorigHips')
      if (hipsBone) {
        fbx.userData.defaultHipsPos = hipsBone.position.clone()
      }
      
      console.log('[DEBUG FBX] Stored default rotations synchronously in useMemo for', Object.keys(defaultRots).length, 'bones')
    }
    
    // Calculate bounding box excluding glasses
    const box = new THREE.Box3()
    fbx.traverse((child) => {
      if (child.isMesh) {
        let isGlasses = false
        let p = child
        while (p) {
          if (p.name === 'athleteGlasses') {
            isGlasses = true
            break
          }
          p = p.parent
        }
        if (!isGlasses) {
          box.expandByObject(child)
        }
      }
    })

    const size = new THREE.Vector3()
    box.getSize(size)
    let height = size.y || 471.30
    if (isNaN(height) || height === 0) height = 471.30
    const sf = 1.8 / height
    let minY = box.min.y
    if (isNaN(minY)) minY = -237.39
    const yOff = -minY * sf
    
    // Restore transformations
    fbx.scale.copy(oldScale)
    fbx.position.copy(oldPos)
    fbx.rotation.copy(oldRot)
    
    console.log('[DEBUG FBX] MEASURED RAW: box min y:', minY.toFixed(2), 'height:', height.toFixed(2), 'scaleFactor:', sf.toFixed(6), 'yOffset:', yOff.toFixed(4))
    return { scaleFactor: sf, yOffset: yOff }
  }, [fbx])

  // Apply materials and restore default bone rotations when model loads
  useEffect(() => {
    if (fbx) {
      fbx.traverse((child) => {
        if (child.isMesh) {
          child.material = mats.skin
          child.castShadow = false
          child.receiveShadow = false
        }
      })
      if (fbx.userData.defaultRotations) {
        defaultRotations.current = fbx.userData.defaultRotations
        console.log('[DEBUG FBX] Retrieved default rotations from fbx.userData')
      }
    }
  }, [fbx, mats])

  // Attach 3D glasses to the character's head bone
  useEffect(() => {
    if (fbx) {
      const head = fbx.getObjectByName('mixamorigHead')
      if (head) {
        const existingGlasses = head.getObjectByName('athleteGlasses')
        if (!existingGlasses) {
          const glassesGroup = new THREE.Group()
          glassesGroup.name = 'athleteGlasses'
          
          // Position relative to Mixamo head bone.
          // Raw head position is in centimeters in the skeleton space.
          // Glasses are positioned ~9 cm up and ~8 cm forward.
          glassesGroup.position.set(0, 9, 8)
          
          // Scale glasses to fit the character head (gScale converts meters to FBX local units)
          const gScale = 1 / scaleFactor
          glassesGroup.scale.set(gScale, gScale, gScale)
          
          // Lens geometry
          const lensGeo = new THREE.TorusGeometry(0.022, 0.003, 8, 16)
          
          // Left lens
          const leftLens = new THREE.Mesh(lensGeo, mats.glasses)
          leftLens.position.set(-0.032, 0, 0)
          glassesGroup.add(leftLens)
          
          // Right lens
          const rightLens = new THREE.Mesh(lensGeo, mats.glasses)
          rightLens.position.set(0.032, 0, 0)
          glassesGroup.add(rightLens)
          
          // Bridge
          const bridgeGeo = new THREE.BoxGeometry(0.02, 0.004, 0.004)
          const bridge = new THREE.Mesh(bridgeGeo, mats.glasses)
          bridge.position.set(0, 0, 0)
          glassesGroup.add(bridge)
          
          // Left temple arm
          const armGeo = new THREE.BoxGeometry(0.004, 0.004, 0.06)
          const leftArm = new THREE.Mesh(armGeo, mats.glasses)
          leftArm.position.set(-0.054, 0, -0.025)
          leftArm.rotation.set(0, 0.25, 0)
          glassesGroup.add(leftArm)
          
          // Right temple arm
          const rightArm = new THREE.Mesh(armGeo, mats.glasses)
          rightArm.position.set(0.054, 0, -0.025)
          rightArm.rotation.set(0, -0.25, 0)
          glassesGroup.add(rightArm)
          
          head.add(glassesGroup)
        }
      }
    }
  }, [fbx, mats, scaleFactor])

  useFrame((state, delta) => {
    if (!fbx) return
    window.myScene = state.scene
    window.myState = state
    window.myFbx = fbx

    // 1. Determine active animation
    const mappedAnimId = mapAnimationId(animationId)
    const activeAnimId = workoutStatus === 'playing' ? mappedAnimId : 'idle'
    
    // Determine base animation keyframes to use
    let baseAnimId = activeAnimId
    
    const anim = animations[baseAnimId] || animations['idle']
    const duration = anim.duration || 2.0

    // 2. Increment animation time (freeze if paused)
    if (workoutStatus !== 'paused') {
      timeRef.current += delta
    }
    const t = timeRef.current % duration

    // 3. Find keyframes to interpolate
    const keyframes = anim.keyframes
    let k1 = keyframes[0]
    let k2 = keyframes[keyframes.length - 1]

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
        k1 = keyframes[i]
        k2 = keyframes[i + 1]
        break
      }
    }

    const timeDiff = k2.time - k1.time
    const alpha = timeDiff > 0 ? (t - k1.time) / timeDiff : 0

    // 4. Map skeleton bones (Hips bone is left completely untouched to preserve defaults)
    const bones = {
      spine: fbx.getObjectByName('mixamorigSpine'),
      shoulderLeft: fbx.getObjectByName('mixamorigLeftArm'),
      elbowLeft: fbx.getObjectByName('mixamorigLeftForeArm'),
      wristLeft: fbx.getObjectByName('mixamorigLeftHand'),
      shoulderRight: fbx.getObjectByName('mixamorigRightArm'),
      elbowRight: fbx.getObjectByName('mixamorigRightForeArm'),
      wristRight: fbx.getObjectByName('mixamorigRightHand'),
      head: fbx.getObjectByName('mixamorigHead'),
      hipLeft: fbx.getObjectByName('mixamorigLeftUpLeg'),
      kneeLeft: fbx.getObjectByName('mixamorigLeftLeg'),
      ankleLeft: fbx.getObjectByName('mixamorigLeftFoot'),
      hipRight: fbx.getObjectByName('mixamorigRightUpLeg'),
      kneeRight: fbx.getObjectByName('mixamorigRightLeg'),
      ankleRight: fbx.getObjectByName('mixamorigRightFoot')
    }

    // 5. Apply joint rotations relative to default bind pose rotations
    Object.keys(bones).forEach(jointName => {
      const bone = bones[jointName]
      if (bone) {
        const rot1 = k1.joints[jointName] || [0, 0, 0]
        const rot2 = k2.joints[jointName] || [0, 0, 0]
        
        const rx = THREE.MathUtils.lerp(rot1[0], rot2[0], alpha)
        const ry = THREE.MathUtils.lerp(rot1[1], rot2[1], alpha)
        const rz = THREE.MathUtils.lerp(rot1[2], rot2[2], alpha)

        const defaultRot = defaultRotations.current[bone.name] || new THREE.Euler()

        // Mixamo limb bones point down their local Y axis. Bending happens on the
        // perpendicular local X/Z axes; local Y is mostly twist.
        if (jointName === 'shoulderLeft') {
          bone.rotation.set(
            defaultRot.x + rz,
            defaultRot.y + ry,
            defaultRot.z + rx
          )
        } else if (jointName === 'shoulderRight') {
          bone.rotation.set(
            defaultRot.x + rz,
            defaultRot.y - ry,
            defaultRot.z - rx
          )
        } else if (jointName === 'elbowLeft') {
          bone.rotation.set(
            defaultRot.x,
            defaultRot.y + ry,
            defaultRot.z + rx
          )
        } else if (jointName === 'elbowRight') {
          bone.rotation.set(
            defaultRot.x,
            defaultRot.y - ry,
            defaultRot.z - rx
          )
        } else if (jointName === 'wristLeft' || jointName === 'wristRight') {
          bone.rotation.set(
            defaultRot.x + rx,
            defaultRot.y + ry,
            defaultRot.z + rz
          )
        } else if (jointName === 'kneeLeft' || jointName === 'kneeRight') {
          bone.rotation.set(
            defaultRot.x - rx,
            defaultRot.y + ry,
            defaultRot.z + rz
          )
        } else if (jointName === 'hipLeft' || jointName === 'hipRight') {
          bone.rotation.set(
            defaultRot.x + rx,
            defaultRot.y + ry,
            defaultRot.z + rz
          )
        } else {
          // Spine, head, ankles, etc. share local orientation coordinates
          bone.rotation.set(
            defaultRot.x + rx,
            defaultRot.y + ry,
            defaultRot.z + rz
          )
        }
      }
    })

    // 5.5. Special procedural adjustments (e.g. hip circle pelvic rotation & translation)
    const hipsBone = fbx.getObjectByName('mixamorigHips')
    if (hipsBone) {
      if (activeAnimId === 'hip_circle') {
        const angle = (t / duration) * Math.PI * 2
        const tiltX = Math.sin(angle) * 0.2
        const tiltZ = Math.cos(angle) * 0.15
        
        const defaultHipsRot = defaultRotations.current['mixamorigHips'] || new THREE.Euler()
        hipsBone.rotation.set(
          defaultHipsRot.x + tiltX,
          defaultHipsRot.y,
          defaultHipsRot.z + tiltZ
        )
        
        const defaultHipsPos = fbx.userData.defaultHipsPos || new THREE.Vector3(0, 90.72, 0)
        const offsetX = Math.cos(angle) * 8
        const offsetZ = Math.sin(angle) * 8
        hipsBone.position.set(
          defaultHipsPos.x + offsetX,
          defaultHipsPos.y,
          defaultHipsPos.z + offsetZ
        )

        // Counter-rotate leg joints to keep feet planted
        const hipLeft = bones.hipLeft
        const hipRight = bones.hipRight
        if (hipLeft) {
          const defL = defaultRotations.current[hipLeft.name] || new THREE.Euler()
          hipLeft.rotation.set(defL.x - tiltX, defL.y, defL.z - tiltZ)
        }
        if (hipRight) {
          const defR = defaultRotations.current[hipRight.name] || new THREE.Euler()
          hipRight.rotation.set(defR.x - tiltX, defR.y, defR.z - tiltZ)
        }

        // Counter-rotate spine to keep upper body upright
        const spine = bones.spine
        if (spine) {
          const defS = defaultRotations.current[spine.name] || new THREE.Euler()
          spine.rotation.set(defS.x - tiltX * 0.8, defS.y, defS.z - tiltZ * 0.8)
        }
      } else {
        if (fbx.userData.defaultHipsPos) {
          hipsBone.position.copy(fbx.userData.defaultHipsPos)
        }
        const defaultHipsRot = defaultRotations.current['mixamorigHips'] || new THREE.Euler()
        hipsBone.rotation.copy(defaultHipsRot)
      }
    }

    // 6. Calculate root position and rotation in world coordinates
    const pos1 = k1.root || [0, 0, 0]
    const pos2 = k2.root || [0, 0, 0]
    const px = THREE.MathUtils.lerp(pos1[0], pos2[0], alpha)
    const py = THREE.MathUtils.lerp(pos1[1], pos2[1], alpha)
    const pz = THREE.MathUtils.lerp(pos1[2], pos2[2], alpha)

    const rotHips1 = k1.joints.hips || [0, 0, 0]
    const rotHips2 = k2.joints.hips || [0, 0, 0]
    const rxHips = THREE.MathUtils.lerp(rotHips1[0], rotHips2[0], alpha)
    const ryHips = THREE.MathUtils.lerp(rotHips1[1], rotHips2[1], alpha)
    const rzHips = THREE.MathUtils.lerp(rotHips1[2], rotHips2[2], alpha)

    // Set position and rotation on the wrapper group (world space, meters)
    if (outerGroupRef.current) {
      outerGroupRef.current.position.set(px, py, pz)
      // Face camera by rotating 180 degrees (Math.PI) on Y-axis
      outerGroupRef.current.rotation.set(rxHips, ryHips + Math.PI, rzHips)

      outerGroupRef.current.updateMatrixWorld(true)
      const lowestY = findLowestSkinnedVertexY(fbx, groundVertexRef.current)
      
      // Grounding correction: Only push the model up if it clips below the floor (lowestY < 0).
      // This prevents character hovering/dangling and allows natural jumping (when py > 0).
      if (lowestY < 0) {
        outerGroupRef.current.position.y += -lowestY
        outerGroupRef.current.updateMatrixWorld(true)
      }
    }

    // 7. Volleyball Trajectory System
    if (ballRef.current) {
      const isBallExercise = 
        activeAnimId.startsWith('forearm_pass') || 
        activeAnimId.startsWith('overhead_pass') || 
        activeAnimId.startsWith('arm_swing') ||
        activeAnimId.includes('set') ||
        activeAnimId.includes('pass') ||
        activeAnimId.includes('dig') ||
        activeAnimId.includes('rally') ||
        activeAnimId.includes('hit') ||
        activeAnimId.includes('attack') ||
        activeAnimId.includes('swing') ||
        activeAnimId.includes('tracking')

      if (isBallExercise && workoutStatus === 'playing') {
        ballRef.current.visible = true

        if (showWall) {
          const progress = t / duration
          const startZ = -0.3
          const endZ = -wallDistance + 0.1
          let zPos
          let yPos
          
          if (progress < 0.5) {
            const subAlpha = progress / 0.5
            zPos = THREE.MathUtils.lerp(startZ, endZ, subAlpha)
            yPos = 1.3 + Math.sin(subAlpha * Math.PI) * 0.25
          } else {
            const subAlpha = (progress - 0.5) / 0.5
            zPos = THREE.MathUtils.lerp(endZ, startZ, subAlpha)
            yPos = 1.3 + Math.sin(subAlpha * Math.PI) * 0.15
          }
          
          ballRef.current.position.set(0, yPos, zPos)
        } else {
          const progress = t / duration
          const height = 1.3 + Math.sin(progress * Math.PI) * 1.5
          ballRef.current.position.set(0, height, -0.2)
        }
      } else {
        ballRef.current.visible = false
      }
    }
  })

  // Render the FBX model inside our Three.js Canvas
  return (
    <group>
      {/* Wrapper group handles translation (meters) and camera orientation (facing +Z) */}
      <group ref={outerGroupRef} rotation={[0, Math.PI, 0]}>
        {/* FBX Character model scaled to scaleFactor, shifted by yOffset to stand on floor */}
        <primitive object={fbx} scale={scaleFactor} position={[0, yOffset, 0]} rotation={[0, 0, 0]} />
      </group>

      {/* Procedurally animated volleyball */}
      <mesh ref={ballRef} position={[0, 1.2, -0.3]}>
        <sphereGeometry args={[0.095, 16, 16]} />
        <meshStandardMaterial 
          color="#fef08a" 
          roughness={0.6}
          emissive="#ca8a04"
          emissiveIntensity={0.1}
        />
        <mesh>
          <sphereGeometry args={[0.097, 8, 8]} />
          <meshBasicMaterial color="#a16207" wireframe={true} transparent={true} opacity={0.3} />
        </mesh>
      </mesh>
    </group>
  )
}
