import React, { useState, useEffect } from 'react'
import { useWorkoutStore } from './store/useWorkoutStore'
import HomeScreen from './components/HomeScreen'
import WorkoutScreen from './components/WorkoutScreen'
import CompletionScreen from './components/CompletionScreen'

export default function App() {
  const [view, setView] = useState('home') // 'home', 'workout', 'completed'
  const { workoutStatus, workoutActive, resetWorkout, loadActiveWorkoutPlan } = useWorkoutStore()

  // Load active workout plan and set view on mount if session is active
  useEffect(() => {
    loadActiveWorkoutPlan()
    if (workoutActive && workoutStatus !== 'completed') {
      setView('workout')
    }
  }, [])

  // Listen to workout store completion to route to completion screen
  useEffect(() => {
    if (workoutStatus === 'completed') {
      setView('completed')
    }
  }, [workoutStatus])

  const handleStartWorkout = () => {
    setView('workout')
  }

  const handleBackHome = () => {
    // Go back to home, but do NOT reset the workout state, so user can resume it
    setView('home')
  }

  const handleCompletionDone = () => {
    resetWorkout()
    setView('home')
  }

  return (
    <div style={styles.appShell}>
      <div className="app-wrapper">
        {view === 'home' && (
          <HomeScreen onStart={handleStartWorkout} />
        )}
        
        {view === 'workout' && (
          <WorkoutScreen onQuit={handleBackHome} />
        )}
        
        {view === 'completed' && (
          <CompletionScreen onBackHome={handleCompletionDone} />
        )}
      </div>
    </div>
  )
}

const styles = {
  appShell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    minHeight: '100dvh',
    width: '100%',
    background: '#050508',
  }
}

