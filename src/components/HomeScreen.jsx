import React from 'react'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { Play, Calendar, Flame, Award, ChevronRight, Activity, Zap, RefreshCw, ChevronDown, Undo2 } from 'lucide-react'
import trainingPlan from '../data/trainingPlan.json'

export default function HomeScreen({ onStart }) {
  const {
    previewDay,
    previewLevel,
    completedDays,
    lastAccessedDay,
    lastAccessedLevel,
    workoutActive,
    selectedDay,
    selectedLevel,
    selectedWorkoutDate,
    currentBlockIndex,
    currentExerciseIndex,
    selectDay,
    setLevel,
    startWorkout,
    startWorkoutAt,
    resetActiveWorkout,
    resetDayCompletion,
    setWorkoutDate
  } = useWorkoutStore()

  // Pre-configured day themes & stats for Phase 1 (Indoor/Wall)
  const daysInfo = [
    { day: 1, title: "Lower Body Power", time: "90m", exercises: 30, icon: Flame, color: "#ef4444" },
    { day: 2, title: "Upper Body & Core", time: "90m", exercises: 33, icon: Zap, color: "#3b82f6" },
    { day: 3, title: "Agility & Explosive", time: "90m", exercises: 32, icon: Activity, color: "#10b981" },
    { day: 4, title: "Full Body Circuit", time: "90m", exercises: 35, icon: Award, color: "#8b5cf6" },
    { day: 5, title: "Game-Speed Cond.", time: "90m", exercises: 39, icon: Flame, color: "#f59e0b" }
  ]

  // Calculate completion percentage for the 5 days
  const completedCount = Object.keys(completedDays).filter(day => completedDays[day]?.length > 0).length
  const progressPercent = Math.min(Math.round((completedCount / 5) * 100), 100)

  const handleDaySelect = (dayNum) => {
    selectDay(dayNum)
  }

  const handleLevelSelect = (lvl) => {
    setLevel(lvl)
  }

  const handleStartWorkout = () => {
    if (workoutActive) {
      if (!window.confirm(`Starting a new workout will discard your current progress for Day ${selectedDay}. Continue?`)) {
        return
      }
    }
    startWorkout()
    onStart()
  }

  const handleResumeLast = () => {
    if (workoutActive) {
      if (!window.confirm(`Starting a new workout will discard your current progress for Day ${selectedDay}. Continue?`)) {
        return
      }
    }
    selectDay(lastAccessedDay)
    setLevel(lastAccessedLevel)
    startWorkout()
    onStart()
  }

  const handleStartAt = (blockIndex, exerciseIndex) => {
    if (workoutActive) {
      if (!window.confirm(`Starting a workout from here will discard your current progress for Day ${selectedDay}. Continue?`)) {
        return
      }
    }
    startWorkoutAt(previewDay, previewLevel, blockIndex, exerciseIndex)
    onStart()
  }

  const handleResetDayHistory = (dayNum) => {
    if (window.confirm(`Reset all completion history logs for Day ${dayNum}?`)) {
      resetDayCompletion(dayNum)
    }
  }

  // Get plan for the current preview day
  const previewPlan = trainingPlan.find(d => d.dayNumber === previewDay) || trainingPlan[0]

  return (
    <div className="home-container" style={styles.container}>
      {/* LEFT COLUMN: Controls, Stats, Actions */}
      <div className="home-left-col" style={styles.leftCol}>
        {/* Top Header & Visual Progress */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.logoSymbol}>VB</div>
            <h1 style={styles.logoText}>COACH</h1>
          </div>
          
          {/* Weekly Completion Progress Card */}
          <div style={styles.progressCard}>
            <div style={styles.progressHeader}>
              <span style={styles.progressTitle}>WEEKLY PROGRESS</span>
              <span style={styles.progressValue}>{completedCount}/5 DAYS DONE</span>
            </div>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        {/* Active Session Card (Show if there is an active session in progress) */}
        {workoutActive && (
          <div className="glass-card active-session-card" style={styles.activeSessionCard}>
            <div style={styles.activeSessionInfo}>
              <span style={styles.activeSessionLabel}>ACTIVE WORKOUT SESSION</span>
              <span style={styles.activeSessionTitle}>Day {selectedDay}</span>
              <span style={styles.activeSessionProgress}>
                Block {currentBlockIndex + 1} · Drill {currentExerciseIndex + 1}
              </span>
            </div>
            <div style={styles.activeSessionActions}>
              <button 
                onClick={onStart}
                className="btn-primary animate-glow"
                style={styles.activeResumeBtn}
              >
                <Play size={14} fill="#0a0a0f" color="#0a0a0f" />
                RESUME
              </button>
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to discard your current workout progress?")) {
                    resetActiveWorkout()
                  }
                }}
                className="btn-secondary"
                style={styles.activeResetBtn}
                title="Discard session"
              >
                <RefreshCw size={12} />
                RESET
              </button>
            </div>
          </div>
        )}


        {/* Workout Session Date Picker */}
        <div className="glass-card" style={styles.pickerCard}>
          <div style={styles.pickerTitleRow}>
            <Calendar size={16} color="var(--accent-color)" />
            <span className="low-text-muted">WORKOUT SESSION DATE</span>
          </div>
          <input 
            type="date" 
            value={selectedWorkoutDate} 
            onChange={(e) => setWorkoutDate(e.target.value)} 
            style={styles.dateInput}
          />
        </div>

        {/* Resume Card (Shows if user has previous session stats AND no active workout) */}
        {!workoutActive && (
          <div 
            onClick={handleResumeLast}
            className="glass-card" 
            style={styles.resumeCard}
          >
            <div style={styles.resumeInfo}>
              <span className="low-text-muted">LAST ACCESSED WORKOUT</span>
              <span style={styles.resumeTitle}>Day {lastAccessedDay}</span>
            </div>
            <div style={styles.resumePlayBtn}>
              <Play size={18} fill="#0a0a0f" color="#0a0a0f" />
            </div>
          </div>
        )}


        {/* Big Action Start Button */}
        <div style={styles.footer}>
          <button 
            onClick={handleStartWorkout}
            className="btn-primary animate-glow"
            style={styles.startBtn}
          >
            <Play size={20} fill="#0a0a0f" />
            START DAY {previewDay}
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN: Days Selection & Expandable Exercises List */}
      <div className="home-right-col" style={styles.rightCol}>
        {/* Day Selector Area */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <span className="low-text-muted">SELECT WORKOUT DAY</span>
          </div>
          <div style={styles.dayGrid}>
            {daysInfo.map(item => {
              const isSelected = previewDay === item.day
              const isDone = completedDays[item.day]?.length > 0
              const Icon = item.icon

              return (
                <div 
                  key={item.day}
                  onClick={() => handleDaySelect(item.day)}
                  style={{
                    ...styles.dayCard,
                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    background: isSelected ? 'rgba(255, 214, 10, 0.04)' : 'rgba(25, 25, 42, 0.3)'
                  }}
                >
                  <div style={styles.dayTopRow}>
                    <span style={{
                      ...styles.dayNumber,
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)'
                    }}>DAY {item.day}</span>
                    <div style={styles.dayBadges}>
                      {isDone && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResetDayHistory(item.day)
                          }}
                          style={styles.resetHistoryBtn}
                          title="Reset day completions"
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}
                      {isDone && <span style={styles.dayDoneBadge}>✓</span>}
                    </div>
                  </div>
                  <span style={styles.dayThemeText}>{item.title}</span>
                  <div style={styles.dayMetaRow}>
                    <Icon size={12} color={isSelected ? 'var(--accent-color)' : 'var(--text-muted)'} />
                    <span style={styles.dayMetaText}>{item.time} · {item.exercises} drills</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Expandable Workout Preview List */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <span className="low-text-muted">DAY {previewDay} WORKOUT DRILLS LIST</span>
          </div>
          
          <div style={styles.accordionContainer}>
            {previewPlan.blocks.map((block, bIdx) => (
              <details key={block.id} open={bIdx === 0} className="exercise-block-details">
                <summary className="exercise-block-summary" style={styles.accordionSummary}>
                  <div style={styles.summaryLeft}>
                    <span style={styles.blockTitleText}>{block.title.toUpperCase()}</span>
                    <span style={styles.blockDurationText}>{block.duration} mins</span>
                  </div>
                  <ChevronDown size={16} className="chevron-icon" />
                </summary>
                
                <div style={styles.accordionContent}>
                  {block.exercises.map((ex, exIdx) => {
                    // Resolve levels if difficulty overrides exist
                    let resolvedEx = ex
                    if (ex.levels && ex.levels[previewLevel]) {
                      resolvedEx = { ...ex, ...ex.levels[previewLevel] }
                    }
                    const isTimed = resolvedEx.type === 'time'
                    const targetStr = isTimed ? `${resolvedEx.targetValue}s Hold` : `${resolvedEx.targetValue} Reps`
                    const setsStr = resolvedEx.sets ? `${resolvedEx.sets} Sets` : '1 Set'
                    
                    return (
                      <div key={ex.id} style={styles.exerciseRow} className="exercise-row-hover">
                        <div style={styles.exerciseInfo}>
                          <div style={styles.exerciseHeaderRow}>
                            <span style={styles.exerciseName}>{resolvedEx.name}</span>
                            <span style={styles.exerciseTarget}>{setsStr} × {targetStr}</span>
                          </div>
                          {resolvedEx.notes && (
                            <p style={styles.exerciseNotes}>{resolvedEx.notes}</p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleStartAt(bIdx, exIdx)}
                          style={styles.drillPlayBtn}
                          title="Start workout from here"
                        >
                          <Play size={12} fill="#0a0a0f" color="#0a0a0f" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '24px 16px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flex: 1,
    overflowY: 'auto'
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoSymbol: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--accent-color)',
    color: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontFamily: 'var(--font-headings)',
    fontSize: '1.1rem'
  },
  logoText: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.5rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)'
  },
  progressCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressTitle: {
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)'
  },
  progressValue: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--accent-color)'
  },
  progressBarBg: {
    height: '6px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'var(--accent-color)',
    borderRadius: '3px',
    transition: 'width 0.4s ease'
  },
  activeSessionCard: {
    padding: '16px',
    border: '1px solid rgba(255, 214, 10, 0.25)',
    background: 'rgba(255, 214, 10, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '16px',
    gap: '12px'
  },
  activeSessionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  activeSessionLabel: {
    fontSize: '0.6rem',
    fontWeight: '800',
    color: 'var(--accent-color)',
    letterSpacing: '0.05em'
  },
  activeSessionTitle: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  activeSessionProgress: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  activeSessionActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'stretch'
  },
  activeResumeBtn: {
    padding: '8px 12px',
    fontSize: '0.75rem',
    borderRadius: '8px',
    fontWeight: '700'
  },
  activeResetBtn: {
    padding: '8px 12px',
    fontSize: '0.75rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontWeight: '600'
  },
  pickerCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  pickerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dateInput: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-body)',
    colorScheme: 'dark'
  },
  resumeCard: {
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer'
  },
  resumeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  resumeTitle: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  resumePlayBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionHeader: {
    borderLeft: '3px solid var(--accent-color)',
    paddingLeft: '8px'
  },
  dayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px'
  },
  dayCard: {
    border: '1px solid',
    borderRadius: '16px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
  },
  dayTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dayNumber: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  dayBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  resetHistoryBtn: {
    color: 'var(--text-muted)',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  dayDoneBadge: {
    color: 'var(--success-color)',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  dayThemeText: {
    fontFamily: 'var(--font-headings)',
    fontSize: '0.95rem',
    fontWeight: '600',
    lineHeight: '1.2',
    color: 'var(--text-primary)',
    minHeight: '2.4em',
    display: 'flex',
    alignItems: 'center'
  },
  dayMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  dayMetaText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '500'
  },
  levelSelector: {
    display: 'flex',
    gap: '10px'
  },
  levelBtn: {
    flex: 1,
    border: '1px solid',
    padding: '12px 6px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    transition: 'all var(--transition-fast)'
  },
  levelBtnLabel: {
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.05em'
  },
  levelBtnDesc: {
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '16px'
  },
  startBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '1.05rem'
  },
  accordionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  accordionSummary: {
    listStyle: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'var(--font-headings)',
    fontWeight: '700'
  },
  summaryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  blockTitleText: {
    fontSize: '0.8rem',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)'
  },
  blockDurationText: {
    fontSize: '0.75rem',
    color: 'var(--accent-color)',
    background: 'rgba(255, 214, 10, 0.08)',
    padding: '2px 8px',
    borderRadius: '8px'
  },
  accordionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 4px 4px'
  },
  exerciseRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: 'rgba(19, 19, 34, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    gap: '12px',
    transition: 'all 0.2s ease'
  },
  exerciseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  exerciseHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '8px'
  },
  exerciseName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  exerciseTarget: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--accent-color)',
    whiteSpace: 'nowrap'
  },
  exerciseNotes: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.3'
  },
  drillPlayBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease',
    flexShrink: 0
  }
}
