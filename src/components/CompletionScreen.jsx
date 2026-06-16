import React, { useEffect } from 'react'
import { useWorkoutStore } from '../store/useWorkoutStore'
import { playSound } from '../utils/audio'
import { Trophy, Clock, CheckCircle2, Calendar, ArrowRight } from 'lucide-react'

export default function CompletionScreen({ onBackHome }) {
  const { selectedDay, selectedLevel, completedDays } = useWorkoutStore()

  // Play a celebration chime on mount
  useEffect(() => {
    playSound('complete')
  }, [])

  // Calculate day completions for progress representation
  const days = [1, 2, 3, 4, 5]

  return (
    <div style={styles.container}>
      {/* Trophy & Title Header */}
      <div style={styles.celebration}>
        <div style={styles.trophyWrapper} className="animate-glow">
          <Trophy size={48} color="#0a0a0f" fill="#0a0a0f" />
        </div>
        <h1 style={styles.title}>WORKOUT DONE!</h1>
        <p style={styles.subtitle}>Day {selectedDay} completed successfully.</p>
      </div>

      {/* Visual Statistics Cards */}
      <div style={styles.statsContainer}>
        <div className="glass-card" style={styles.statCard}>
          <Clock size={20} color="var(--accent-color)" />
          <div style={styles.statInfo}>
            <span style={styles.statVal}>90</span>
            <span style={styles.statLabel}>MINUTES</span>
          </div>
        </div>

        <div className="glass-card" style={styles.statCard}>
          <CheckCircle2 size={20} color="var(--accent-color)" />
          <div style={styles.statInfo}>
            <span style={styles.statVal}>ALL</span>
            <span style={styles.statLabel}>DRILLS DONE</span>
          </div>
        </div>
      </div>

      {/* Weekly Progress Tracker Timeline */}
      <div className="glass-card" style={styles.progressTimelineCard}>
        <span className="low-text-muted" style={styles.timelineLabel}>YOUR WEEKLY TRACK</span>
        <div style={styles.timelineRow}>
          {days.map(d => {
            const isCompleted = completedDays[d]?.length > 0
            const isCurrent = selectedDay === d
            
            return (
              <div key={d} style={styles.timelineNodeContainer}>
                <div style={{
                  ...styles.timelineNode,
                  borderColor: isCompleted ? 'var(--success-color)' : isCurrent ? 'var(--accent-color)' : 'var(--border-color)',
                  background: isCompleted ? 'var(--success-color)' : isCurrent ? 'rgba(255, 214, 10, 0.1)' : 'rgba(255,255,255,0.02)'
                }}>
                  {isCompleted ? (
                    <span style={styles.nodeCheck}>✓</span>
                  ) : (
                    <span style={{
                      ...styles.nodeNum,
                      color: isCurrent ? 'var(--accent-color)' : 'var(--text-muted)'
                    }}>{d}</span>
                  )}
                </div>
                <span style={{
                  ...styles.timelineNodeText,
                  color: isCompleted ? 'var(--text-primary)' : isCurrent ? 'var(--accent-color)' : 'var(--text-muted)'
                }}>DAY {d}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Navigation Button */}
      <div style={styles.footer}>
        <button 
          onClick={onBackHome}
          className="btn-primary animate-glow"
          style={styles.doneBtn}
        >
          CONTINUE TO DASHBOARD
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '40px 24px',
    maxWidth: '420px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    justifyContent: 'center',
    flex: 1
  },
  celebration: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px'
  },
  trophyWrapper: {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: 'var(--accent-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px var(--accent-glow-strong)',
    marginBottom: '8px'
  },
  title: {
    fontFamily: 'var(--font-headings)',
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    maxWidth: '280px'
  },
  statsContainer: {
    display: 'flex',
    width: '100%',
    gap: '12px'
  },
  statCard: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  statVal: {
    fontFamily: 'var(--font-headings)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.1'
  },
  statLabel: {
    fontSize: '0.6rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em'
  },
  progressTimelineCard: {
    width: '100%',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  timelineLabel: {
    textAlign: 'center'
  },
  timelineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
    padding: '0 8px'
  },
  timelineNodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 2
  },
  timelineNode: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  nodeCheck: {
    color: '#0a0a0f',
    fontWeight: 'bold',
    fontSize: '1rem'
  },
  nodeNum: {
    fontSize: '0.85rem',
    fontWeight: '700'
  },
  timelineNodeText: {
    fontSize: '0.65rem',
    fontWeight: '700',
    letterSpacing: '0.04em'
  },
  footer: {
    width: '100%',
    marginTop: '16px'
  },
  doneBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '1rem'
  }
}
