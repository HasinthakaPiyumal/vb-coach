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

export default function Mannequin({ animationId = 'idle', workoutStatus = 'idle', showWall = false, wallDistance = 2, hideBall = false }) {
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
    
    // Measure and store foot and toe bone vertical offsets in bind pose (relative to minY)
    if (!fbx.userData.bindFootOffsets) {
      const leftFootBone = fbx.getObjectByName('mixamorigLeftFoot')
      const rightFootBone = fbx.getObjectByName('mixamorigRightFoot')
      const leftToeBone = fbx.getObjectByName('mixamorigLeftToeBase')
      const rightToeBone = fbx.getObjectByName('mixamorigRightToeBase')

      const leftFootPos = new THREE.Vector3()
      const rightFootPos = new THREE.Vector3()
      const leftToePos = new THREE.Vector3()
      const rightToePos = new THREE.Vector3()

      if (leftFootBone) leftFootBone.getWorldPosition(leftFootPos)
      if (rightFootBone) rightFootBone.getWorldPosition(rightFootPos)
      if (leftToeBone) leftToeBone.getWorldPosition(leftToePos)
      if (rightToeBone) rightToeBone.getWorldPosition(rightToePos)

      fbx.userData.bindFootOffsets = {
        leftFoot: leftFootBone ? leftFootPos.y - minY : 17,
        rightFoot: rightFootBone ? rightFootPos.y - minY : 17,
        leftToe: leftToeBone ? leftToePos.y - minY : 17,
        rightToe: rightToeBone ? rightToePos.y - minY : 17
      }
    }
    
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
        const tiltX = Math.sin(angle) * 0.35
        const tiltZ = Math.cos(angle) * 0.28
        
        const defaultHipsRot = defaultRotations.current['mixamorigHips'] || new THREE.Euler()
        hipsBone.rotation.set(
          defaultHipsRot.x + tiltX,
          defaultHipsRot.y,
          defaultHipsRot.z + tiltZ
        )
        
        const defaultHipsPos = fbx.userData.defaultHipsPos || new THREE.Vector3(0, 90.72, 0)
        const offsetX = Math.cos(angle) * 14
        const offsetZ = Math.sin(angle) * 14
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
          spine.rotation.set(defS.x - tiltX * 0.85, defS.y, defS.z - tiltZ * 0.85)
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

    const isJump = 
      activeAnimId.includes('jump') || 
      activeAnimId.includes('hop') || 
      activeAnimId.includes('bound') ||
      activeAnimId.includes('drop') ||
      activeAnimId.includes('approach') ||
      activeAnimId.includes('burpee') ||
      activeAnimId.includes('skater') ||
      activeAnimId.includes('jack') ||
      activeAnimId.includes('crossover') ||
      activeAnimId.includes('slide_block')

    // Apply physics-based easing for jump vertical translation to create natural hang-time
    let alphaY = alpha
    if (isJump) {
      const y1 = pos1[1]
      const y2 = pos2[1]
      if (y1 <= 0.01 && y2 > 0.01) {
        // Rising phase: ease out (slow down towards peak)
        alphaY = Math.sin(alpha * Math.PI / 2)
      } else if (y1 > 0.01 && y2 <= 0.01) {
        // Falling phase: ease in (speed up as we land)
        alphaY = 1 - Math.cos(alpha * Math.PI / 2)
      } else if (y1 > 0.01 && y2 > 0.01) {
        // Hovering at peak: smoothstep
        alphaY = alpha * alpha * (3 - 2 * alpha)
      }
    }

    const px = THREE.MathUtils.lerp(pos1[0], pos2[0], alpha)
    const py = THREE.MathUtils.lerp(pos1[1], pos2[1], alphaY)
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

      let lowestY = 0

      const isFloorExercise = 
        activeAnimId.includes('plank') ||
        activeAnimId.includes('bridge') ||
        activeAnimId.includes('pushup') ||
        activeAnimId.includes('dead_bug') ||
        activeAnimId.includes('crunch') ||
        activeAnimId.includes('raises') ||
        activeAnimId.includes('superman') ||
        activeAnimId.includes('climbers') ||
        activeAnimId.includes('taps') ||
        activeAnimId.includes('cow') ||
        activeAnimId.includes('child') ||
        activeAnimId.includes('cobra') ||
        activeAnimId.includes('pigeon') ||
        activeAnimId.includes('glute_stretch') ||
        activeAnimId.includes('seated_twist')

      if (!isFloorExercise) {
        const leftFootBone = fbx.getObjectByName('mixamorigLeftFoot')
        const rightFootBone = fbx.getObjectByName('mixamorigRightFoot')
        const leftToeBone = fbx.getObjectByName('mixamorigLeftToeBase')
        const rightToeBone = fbx.getObjectByName('mixamorigRightToeBase')

        const leftFootWorld = new THREE.Vector3()
        const rightFootWorld = new THREE.Vector3()
        const leftToeWorld = new THREE.Vector3()
        const rightToeWorld = new THREE.Vector3()

        if (leftFootBone) leftFootBone.getWorldPosition(leftFootWorld)
        if (rightFootBone) rightFootBone.getWorldPosition(rightFootWorld)
        if (leftToeBone) leftToeBone.getWorldPosition(leftToeWorld)
        if (rightToeBone) rightToeBone.getWorldPosition(rightToeWorld)

        const offsets = fbx.userData.bindFootOffsets || { leftFoot: 17, rightFoot: 17, leftToe: 17, rightToe: 17 }

        const yLeftFoot = leftFootWorld.y - (offsets.leftFoot * scaleFactor)
        const yRightFoot = rightFootWorld.y - (offsets.rightFoot * scaleFactor)
        const yLeftToe = leftToeWorld.y - (offsets.leftToe * scaleFactor)
        const yRightToe = rightToeWorld.y - (offsets.rightToe * scaleFactor)

        lowestY = Math.min(yLeftFoot, yRightFoot, yLeftToe, yRightToe)
      }
      
      // Grounding correction:
      // For jump animations, we only prevent clipping below the floor (lowestY < 0).
      // For non-jump animations, we enforce exact ground contact (lowestY = 0) to prevent floating.
      if (isJump) {
        if (lowestY < 0) {
          outerGroupRef.current.position.y += -lowestY
          outerGroupRef.current.updateMatrixWorld(true)
        }
      } else {
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

      if (isBallExercise && workoutStatus === 'playing' && !hideBall) {
        ballRef.current.visible = true

        let xPos = 0
        let yPos = 1.2
        let zPos = -0.3

        if (activeAnimId.startsWith('forearm_pass') || activeAnimId.includes('dig') || activeAnimId.includes('rally')) {
          // Duration: 1.8. Compression: 0.7, Release: 1.0. Flight: 1.5s
          // Loop repeats every 1.8s. Flight is from t = 1.0 to t = 1.8 + 0.7 = 2.5s.
          const tFlightStart = 1.0
          const tFlightEnd = 1.8 + 0.7 // 2.5
          const totalFlightTime = tFlightEnd - tFlightStart // 1.5
          
          let tCurrent = t
          if (tCurrent < 0.7) {
            tCurrent += 1.8
          }

          if (tCurrent >= tFlightStart && tCurrent <= tFlightEnd) {
            // Ball is in flight
            const f = (tCurrent - tFlightStart) / totalFlightTime
            const startZ = -0.3
            const endZ = -wallDistance + 0.1
            
            // Z-travel to wall (at f=0.5) and back
            if (f < 0.5) {
              zPos = THREE.MathUtils.lerp(startZ, endZ, f / 0.5)
            } else {
              zPos = THREE.MathUtils.lerp(endZ, startZ, (f - 0.5) / 0.5)
            }
            
            // Y-travel parabolic arc
            yPos = 0.95 + Math.sin(f * Math.PI) * 0.8
          } else {
            // Ball is in hands (held/compressed)
            const fHand = (t - 0.7) / (1.0 - 0.7) // 0 to 1
            zPos = -0.3
            yPos = THREE.MathUtils.lerp(0.8, 0.95, fHand)
          }
        } 
        else if (activeAnimId.startsWith('overhead_pass') || activeAnimId.startsWith('wall_set') || activeAnimId.startsWith('quick_set') || activeAnimId.startsWith('pass_set_combo')) {
          // Duration: 1.6. Compression: 0.6, Release: 0.9. Flight: 1.3s
          const tFlightStart = 0.9
          const tFlightEnd = 1.6 + 0.6
          const totalFlightTime = tFlightEnd - tFlightStart
          
          let tCurrent = t
          if (tCurrent < 0.6) {
            tCurrent += 1.6
          }

          if (tCurrent >= tFlightStart && tCurrent <= tFlightEnd) {
            const f = (tCurrent - tFlightStart) / totalFlightTime
            const startZ = -0.25
            const endZ = -wallDistance + 0.1
            
            if (f < 0.5) {
              zPos = THREE.MathUtils.lerp(startZ, endZ, f / 0.5)
            } else {
              zPos = THREE.MathUtils.lerp(endZ, startZ, (f - 0.5) / 0.5)
            }
            
            yPos = 1.95 + Math.sin(f * Math.PI) * 0.6
          } else {
            const fHand = (t - 0.6) / (0.9 - 0.6)
            zPos = -0.25
            yPos = THREE.MathUtils.lerp(1.65, 1.95, fHand)
          }
        } 
        else if (activeAnimId.startsWith('self_set') || activeAnimId.startsWith('kneeling_set')) {
          // Duration: 1.8. Compression: 0.675, Release: 1.012. Flight: 1.463s
          const tFlightStart = 1.012
          const tFlightEnd = 1.8 + 0.675
          const totalFlightTime = tFlightEnd - tFlightStart
          
          let tCurrent = t
          if (tCurrent < 0.675) {
            tCurrent += 1.8
          }

          if (tCurrent >= tFlightStart && tCurrent <= tFlightEnd) {
            const f = (tCurrent - tFlightStart) / totalFlightTime
            zPos = -0.15
            yPos = 1.95 + Math.sin(f * Math.PI) * 1.8 // high self-set
          } else {
            const fHand = (t - 0.675) / (1.012 - 0.675)
            zPos = -0.15
            yPos = THREE.MathUtils.lerp(1.65, 1.95, fHand)
          }
        } 
        else if (activeAnimId.startsWith('wall_hit') || activeAnimId.startsWith('arm_swing') || activeAnimId.startsWith('directed_attack') || activeAnimId.startsWith('power_hit') || activeAnimId.startsWith('attack_rally') || activeAnimId.startsWith('jump_hit')) {
          // Spike/Hit: duration = 2.0s
          if (t < 0.8) {
            const f = t / 0.8
            xPos = THREE.MathUtils.lerp(-0.15, 0.05, f)
            yPos = 1.25 + Math.sin(f * Math.PI / 2) * 0.9
            zPos = -0.2
          } else if (t >= 0.8 && t < 1.2) {
            const f = (t - 0.8) / 0.4
            xPos = 0.05
            yPos = 2.15 - f * 0.2
            zPos = -0.2
          } else {
            const f = (t - 1.2) / 0.8
            xPos = THREE.MathUtils.lerp(0.05, 0, f)
            const startZ = -0.2
            const endZ = -wallDistance + 0.1
            if (f < 0.5) {
              zPos = THREE.MathUtils.lerp(startZ, endZ, f / 0.5)
            } else {
              zPos = THREE.MathUtils.lerp(endZ, startZ, (f - 0.5) / 0.5)
            }
            yPos = 1.95 - (f * 0.7)
          }
        } 
        else if (activeAnimId.includes('tracking') || activeAnimId.includes('vision') || activeAnimId.includes('sound')) {
          const f = t / duration
          if (activeAnimId.includes('vision')) {
            const startZ = -0.3
            const endZ = -wallDistance + 0.1
            if (f < 0.5) {
              zPos = THREE.MathUtils.lerp(startZ, endZ, f / 0.5)
            } else {
              zPos = THREE.MathUtils.lerp(endZ, startZ, (f - 0.5) / 0.5)
            }
            yPos = 1.35 + Math.sin(f * Math.PI) * 0.8
          } else {
            // Sound-tracking clap is at t = 0.9s (halfway)
            zPos = -0.3
            if (f < 0.5) {
              yPos = THREE.MathUtils.lerp(1.3, 0.1, f / 0.5)
            } else {
              yPos = THREE.MathUtils.lerp(0.1, 1.3, (f - 0.5) / 0.5)
            }
          }
        }
        else {
          const progress = t / duration
          yPos = 1.3 + Math.sin(progress * Math.PI) * 1.5
          zPos = -0.2
        }

        ballRef.current.position.set(xPos, yPos, zPos)
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
