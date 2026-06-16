import React, { useState, useEffect } from 'react'
import { useWorkoutStore } from '../store/useWorkoutStore'
import MannequinScene from './MannequinScene'
import { playSound } from '../utils/audio'
import { Play, Pause, Check, SkipForward, SkipBack, X, RefreshCw, Eye } from 'lucide-react'

export default function WorkoutScreen({ onQuit }) {
  const {
    workoutStatus,
    timerRemaining,
    timerTotal,
    restRemaining,
    restTotal,
    currentSet,
    currentBlockIndex,
    currentExerciseIndex,
    activeDayPlan,
    selectedLevel,
    tickTimer,
    pauseWorkout,
    resumeWorkout,
    markExerciseDone,
    previousExercise,
    getCurrentExercise,
    getCurrentBlock,
    getNextExercisePreview,
    resetWorkout
  } = useWorkoutStore()

  // State for quit confirmation modal
  const [showQuitModal, setShowQuitModal] = useState(false)

  // 1. Set up tick interval
  useEffect(() => {
    let interval = null;
    if (workoutStatus === 'playing' || workoutStatus === 'rest') {
      interval = setInterval(() => {
        tickTimer(playSound);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workoutStatus, tickTimer]);

  // 2. Set up keyboard listener for Enter and Space to go next or skip
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore keydown if quit confirmation modal is open
      if (showQuitModal) return;

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        markExerciseDone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [markExerciseDone, showQuitModal]);

  // Handle back/quit trigger
  const handleQuitTrigger = () => {
    setShowQuitModal(true)
  }

  // Get active workout elements
  const block = getCurrentBlock();
  const exercise = getCurrentExercise();
  const nextExercise = getNextExercisePreview();

  if (!activeDayPlan || !block || !exercise) {
    return <div style={styles.loading}>Loading workout details...</div>;
  }

  // Calculate overall progress across exercises in the plan
  const totalExercises = activeDayPlan.blocks.reduce((acc, b) => acc + b.exercises.length, 0);
  // Calculate completed index
  let completedIndex = 0;
  for (let i = 0; i < currentBlockIndex; i++) {
    completedIndex += activeDayPlan.blocks[i].exercises.length;
  }
  completedIndex += currentExerciseIndex;
  const overallProgressPercent = Math.round((completedIndex / totalExercises) * 100);

  // SVG circular timer calculations
  const strokeWidth = 6;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  
  // Timer circle fill (timed vs. rest)
  const isResting = workoutStatus === 'rest';
  const activeRemaining = isResting ? restRemaining : timerRemaining;
  const activeTotal = isResting ? restTotal : timerTotal;
  const fillPercent = activeTotal > 0 ? activeRemaining / activeTotal : 1;
  const strokeDashoffset = circumference - fillPercent * circumference;

  return (
    <div className="workout-container" style={styles.container}>
      {/* LEFT COLUMN: 3D Animation Scene */}
      <div className="workout-left-col" style={styles.leftCol}>
        <div style={styles.sceneContainer}>
          <MannequinScene
            animationId={exercise.animationId || 'idle'}
            workoutStatus={workoutStatus}
            showWall={exercise.showWall || false}
            wallDistance={exercise.wallDistance || 2}
            hideBall={exercise.notes?.toLowerCase().includes('no ball') || exercise.name?.toLowerCase().includes('no ball')}
          />
          
          {/* Floating visual cue indicating wall distance if applicable */}
          {exercise.showWall && workoutStatus === 'playing' && (
            <div style={styles.distanceIndicator} className="glass-panel">
              <Eye size={12} color="var(--accent-color)" />
              <span>DISTANCE: {exercise.wallDistance}M</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Details, Instructions, Timer, Controls */}
      <div className="workout-right-col" style={styles.rightCol}>
        {/* Top Header Row */}
        <header style={styles.header}>
          <button onClick={handleQuitTrigger} style={styles.backBtn} title="Exit workout">
            <X size={20} />
          </button>
          <div style={styles.headerText}>
            <span style={styles.blockTitle}>{block.title.toUpperCase()}</span>
            <span style={styles.exerciseTitle} title={exercise.name}>{exercise.name}</span>
          </div>
          <div style={styles.setCounter}>
            <span style={styles.setLabel}>SET</span>
            <span style={styles.setValue}>{currentSet}/{exercise.sets || 1}</span>
          </div>
        </header>

        {/* Progress Bar under header */}
        <div style={styles.overallProgressBarBg}>
          <div style={{ ...styles.overallProgressBarFill, width: `${overallProgressPercent}%` }} />
        </div>

        {/* Middle Scrollable Section for Details */}
        <div style={styles.rightContentScroll}>
          {/* Visual Instruction & Notes Panel */}
          <div style={styles.instructionPanel}>
            <p style={styles.instructionText}>{exercise.notes}</p>
            {exercise.goal && <div style={styles.goalBadge}>{exercise.goal.toUpperCase()}</div>}
          </div>

          {/* Visual Feedback overlay for Active Exercise */}
          <div style={styles.feedbackContainer}>
            {exercise.type === 'time' ? (
              /* Circular Visual Countdown */
              <div style={styles.timerWrapper}>
                <svg width="120" height="120" style={styles.timerSvg}>
                  <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="var(--accent-color)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 0.1s linear',
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%'
                    }}
                  />
                </svg>
                <div style={styles.timerValue}>
                  {activeRemaining}
                  <span style={styles.timerUnit}>s</span>
                </div>
              </div>
            ) : (
              /* Big Visual Rep Target & Done Trigger */
              <div style={styles.repWrapper}>
                <span style={styles.repNumber}>{exercise.targetValue}</span>
                <span style={styles.repLabel}>REPS</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <footer style={styles.controlsBar}>
          <button onClick={previousExercise} style={styles.ctrlBtnSecondary} title="Previous exercise">
            <SkipBack size={20} fill="currentColor" />
          </button>

          {workoutStatus === 'playing' ? (
            <button onClick={pauseWorkout} style={styles.ctrlBtnPlay} title="Pause workout">
              <Pause size={24} fill="#0a0a0f" color="#0a0a0f" />
            </button>
          ) : (
            <button onClick={resumeWorkout} style={styles.ctrlBtnPlay} title="Resume workout">
              <Play size={24} fill="#0a0a0f" color="#0a0a0f" />
            </button>
          )}

          {exercise.type === 'reps' ? (
            <button onClick={markExerciseDone} style={styles.ctrlBtnConfirm} title="Mark set done">
              <Check size={24} strokeWidth={3} />
            </button>
          ) : (
            <button onClick={markExerciseDone} style={styles.ctrlBtnSecondary} title="Skip/Forward">
              <SkipForward size={20} fill="currentColor" />
            </button>
          )}
        </footer>
      </div>

      {/* Fullscreen REST OVERLAY */}
      {isResting && (
        <div style={styles.restOverlay}>
          <div style={styles.restCircle}>
            <svg width="160" height="160" style={styles.timerSvg}>
              <circle cx="80" cy="80" r={70} stroke="rgba(255,214,10,0.05)" strokeWidth={8} fill="transparent" />
              <circle
                cx="80"
                cy="80"
                r={70}
                stroke="var(--accent-color)"
                strokeWidth={8}
                fill="transparent"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={(2 * Math.PI * 70) - (restRemaining / restTotal) * (2 * Math.PI * 70)}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.1s linear',
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%'
                }}
              />
            </svg>
            <div style={styles.restTimeText}>
              <span style={styles.restLabelText}>REST</span>
              <span style={styles.restSecText}>{restRemaining}s</span>
            </div>
          </div>

          <div className="glass-card" style={styles.nextPreviewCard}>
            <span className="low-text-muted">UP NEXT</span>
            <span style={styles.nextExName}>{nextExercise?.name}</span>
            <span style={styles.nextExTarget}>
              {nextExercise?.type === 'time' ? `${nextExercise.targetValue}s Hold/Timed` : `${nextExercise?.targetValue} Reps`}
            </span>
            <span style={styles.nextExNotes}>{nextExercise?.notes}</span>
          </div>

          <button onClick={markExerciseDone} className="btn-secondary" style={styles.skipRestBtn}>
            SKIP REST
          </button>
        </div>
      )}

      {/* QUIT CONFIRMATION MODAL OVERLAY */}
      {showQuitModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalCard}>
            <h3 style={styles.modalTitle}>EXIT WORKOUT</h3>
            <p style={styles.modalText}>
              Would you like to save your workout progress to continue later, or reset this workout day?
            </p>
            <div style={styles.modalActions}>
              <button 
                onClick={() => {
                  setShowQuitModal(false)
                  onQuit() // navigate back, preserving active state
                }}
                className="btn-primary animate-glow"
                style={styles.modalBtn}
              >
                SAVE & EXIT
              </button>
              
              <button 
                onClick={() => {
                  setShowQuitModal(false)
                  resetWorkout() // clear active progress
                  onQuit()
                }}
                className="btn-secondary"
                style={{ 
                  ...styles.modalBtn, 
                  color: 'var(--danger-color)', 
                  borderColor: 'rgba(244, 63, 94, 0.2)' 
                }}
              >
                RESET SESSION
              </button>
              
              <button 
                onClick={() => setShowQuitModal(false)}
                className="btn-secondary"
                style={styles.modalBtn}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    height: '100dvh',
    background: '#0a0a0f',
    position: 'relative',
    overflow: 'hidden'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    position: 'relative'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0a0a0f',
    position: 'relative',
    zIndex: 5
  },
  rightContentScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 16px',
    gap: '24px'
  },
  loading: {
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'var(--font-headings)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'rgba(10, 10, 15, 0.85)',
    zIndex: 10,
    width: '100%'
  },
  backBtn: {
    color: 'var(--text-secondary)',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.04)'
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    flex: 1,
    padding: '0 8px'
  },
  blockTitle: {
    fontSize: '0.65rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    color: 'var(--text-muted)'
  },
  exerciseTitle: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px'
  },
  setCounter: {
    background: 'rgba(255, 214, 10, 0.1)',
    border: '1px solid rgba(255, 214, 10, 0.2)',
    borderRadius: '12px',
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '54px'
  },
  setLabel: {
    fontSize: '0.55rem',
    fontWeight: '800',
    color: 'var(--accent-color)'
  },
  setValue: {
    fontFamily: 'var(--font-headings)',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  overallProgressBarBg: {
    height: '3px',
    background: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
    zIndex: 10
  },
  overallProgressBarFill: {
    height: '100%',
    background: 'var(--accent-color)',
    transition: 'width 0.3s ease'
  },
  sceneContainer: {
    flex: 1,
    position: 'relative',
    height: '100%',
    width: '100%'
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)'
  },
  instructionPanel: {
    padding: '0 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'center',
    zIndex: 5
  },
  instructionText: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: '1.4',
    maxWidth: '320px'
  },
  goalBadge: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--accent-color)',
    border: '1px solid rgba(255, 214, 10, 0.2)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.04em'
  },
  feedbackContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5
  },
  timerWrapper: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timerSvg: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  timerValue: {
    fontSize: '2rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '800',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'baseline'
  },
  timerUnit: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginLeft: '1px'
  },
  repWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  repNumber: {
    fontSize: '3.2rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: '1'
  },
  repLabel: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--accent-color)',
    letterSpacing: '0.1em'
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '16px 16px 32px',
    background: 'rgba(10, 10, 15, 0.95)',
    zIndex: 10,
    width: '100%'
  },
  ctrlBtnSecondary: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)'
  },
  ctrlBtnConfirm: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--success-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0a0a0f',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
  },
  ctrlBtnPlay: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    background: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0a0a0f',
    boxShadow: '0 4px 16px var(--accent-glow)'
  },
  restOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(10, 10, 15, 0.96)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  restCircle: {
    position: 'relative',
    width: '160px',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px'
  },
  restTimeText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  restLabelText: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em'
  },
  restSecText: {
    fontSize: '2.5rem',
    fontFamily: 'var(--font-headings)',
    fontWeight: '800',
    color: 'var(--accent-color)'
  },
  nextPreviewCard: {
    width: '100%',
    maxWidth: '320px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '6px',
    marginBottom: '24px'
  },
  nextExName: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginTop: '4px'
  },
  nextExTarget: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--accent-color)'
  },
  nextExNotes: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginTop: '6px'
  },
  skipRestBtn: {
    padding: '14px 28px'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(5, 5, 8, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '20px'
  },
  modalCard: {
    width: '100%',
    maxWidth: '340px',
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
  },
  modalTitle: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--accent-color)'
  },
  modalText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  modalBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '0.85rem',
    fontWeight: '700'
  }
}
