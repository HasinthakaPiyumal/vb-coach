import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import trainingPlan from '../data/trainingPlan.json'

export const useWorkoutStore = create(
  persist(
    (set, get) => ({
      // --- Persisted State ---
      completedDays: {}, // e.g. { "2026-06-16": [1] } or { 1: ["2026-06-16"] }
      lastAccessedDay: 1,
      lastAccessedLevel: "1",
      previewDay: 1,
      previewLevel: "1",
      selectedWorkoutDate: new Date().toISOString().split('T')[0],
      
      // --- Active/Live Workout State ---
      workoutActive: false,
      selectedDay: 1,
      selectedLevel: "1",
      currentBlockIndex: 0,
      currentExerciseIndex: 0,
      currentSet: 1,
      workoutStatus: "idle", // "idle", "playing", "paused", "rest", "completed"
      timerRemaining: 0,
      timerTotal: 0,
      restRemaining: 0,
      restTotal: 0,
      
      // Loaded day plan data
      activeDayPlan: null,

      // --- Actions ---
      selectDay: (dayNumber) => set({ previewDay: dayNumber, lastAccessedDay: dayNumber }),
      setLevel: (level) => set({ previewLevel: level, lastAccessedLevel: level }),
      setWorkoutDate: (dateStr) => set({ selectedWorkoutDate: dateStr }),
      
      loadWorkout: (dayNumber, level) => {
        const dayPlan = trainingPlan.find(d => d.dayNumber === dayNumber) || trainingPlan[0];
        set({
          previewDay: dayNumber,
          previewLevel: level,
          activeDayPlan: dayPlan,
          currentBlockIndex: 0,
          currentExerciseIndex: 0,
          currentSet: 1,
          workoutStatus: "idle",
          workoutActive: false
        });
      },

      loadActiveWorkoutPlan: () => {
        const { selectedDay, workoutActive } = get();
        if (workoutActive) {
          const dayPlan = trainingPlan.find(d => d.dayNumber === selectedDay) || trainingPlan[0];
          set({ activeDayPlan: dayPlan });
        }
      },


      getCurrentExercise: () => {
        const { activeDayPlan, currentBlockIndex, currentExerciseIndex, selectedLevel } = get();
        if (!activeDayPlan) return null;
        const block = activeDayPlan.blocks[currentBlockIndex];
        if (!block) return null;
        const exercise = block.exercises[currentExerciseIndex];
        if (!exercise) return null;
        
        // Resolve level properties if they exist
        if (exercise.levels) {
          const levelData = exercise.levels[selectedLevel] || exercise.levels["1"];
          return {
            ...exercise,
            ...levelData,
            isSkillsBlock: block.id === "skills"
          };
        }
        
        return {
          ...exercise,
          isSkillsBlock: block.id === "skills"
        };
      },

      getCurrentBlock: () => {
        const { activeDayPlan, currentBlockIndex } = get();
        if (!activeDayPlan) return null;
        return activeDayPlan.blocks[currentBlockIndex] || null;
      },

      getNextExercisePreview: () => {
        const { activeDayPlan, currentBlockIndex, currentExerciseIndex, currentSet, selectedLevel, workoutStatus } = get();
        if (!activeDayPlan) return null;
        
        const currentBlock = activeDayPlan.blocks[currentBlockIndex];
        const currentExercise = currentBlock.exercises[currentExerciseIndex];
        const totalSets = currentExercise.sets || 1;
        
        // If we are currently resting, the next thing is the current set of the active exercise
        if (workoutStatus === 'rest') {
          const resolvedEx = currentExercise.levels 
            ? { ...currentExercise, ...currentExercise.levels[selectedLevel] }
            : currentExercise;
          
          return {
            ...resolvedEx,
            name: totalSets > 1 ? `${resolvedEx.name} (Set ${currentSet}/${totalSets})` : resolvedEx.name
          };
        }
        
        // If there's another set of the same exercise (fallback)
        if (currentSet < totalSets) {
          if (currentExercise.levels) {
            return {
              name: `${currentExercise.name} (Set ${currentSet + 1}/${totalSets})`,
              ...currentExercise.levels[selectedLevel]
            };
          }
          return {
            name: `${currentExercise.name} (Set ${currentSet + 1}/${totalSets})`,
            ...currentExercise
          };
        }
        
        // If there's another exercise in the current block
        if (currentExerciseIndex + 1 < currentBlock.exercises.length) {
          const nextEx = currentBlock.exercises[currentExerciseIndex + 1];
          if (nextEx.levels) {
            return { ...nextEx, ...nextEx.levels[selectedLevel] };
          }
          return nextEx;
        }
        
        // If there's another block
        if (currentBlockIndex + 1 < activeDayPlan.blocks.length) {
          const nextBlock = activeDayPlan.blocks[currentBlockIndex + 1];
          if (nextBlock.exercises.length > 0) {
            const nextEx = nextBlock.exercises[0];
            if (nextEx.levels) {
              return { ...nextEx, ...nextEx.levels[selectedLevel] };
            }
            return nextEx;
          }
        }
        
        return { name: "Cool-Down Complete!" };
      },

      startWorkout: () => {
        const { previewDay, previewLevel } = get();
        const dayPlan = trainingPlan.find(d => d.dayNumber === previewDay) || trainingPlan[0];
        
        set({
          selectedDay: previewDay,
          selectedLevel: previewLevel,
          lastAccessedDay: previewDay,
          lastAccessedLevel: previewLevel,
          activeDayPlan: dayPlan,
          currentBlockIndex: 0,
          currentExerciseIndex: 0,
          currentSet: 1,
          workoutActive: true,
          workoutStatus: "playing"
        });
        
        get().initActiveExercise();
      },

      startWorkoutAt: (dayNumber, level, blockIndex, exerciseIndex) => {
        const dayPlan = trainingPlan.find(d => d.dayNumber === dayNumber) || trainingPlan[0];
        set({
          selectedDay: dayNumber,
          selectedLevel: level,
          lastAccessedDay: dayNumber,
          lastAccessedLevel: level,
          activeDayPlan: dayPlan,
          currentBlockIndex: blockIndex,
          currentExerciseIndex: exerciseIndex,
          currentSet: 1,
          workoutActive: true,
          workoutStatus: "playing"
        });
        get().initActiveExercise();
      },


      initActiveExercise: () => {
        const exercise = get().getCurrentExercise();
        if (!exercise) return;
        
        const duration = exercise.type === "time" ? exercise.targetValue : 0;
        set({
          timerRemaining: duration,
          timerTotal: duration,
          workoutStatus: "playing"
        });
      },

      pauseWorkout: () => {
        const { workoutStatus } = get();
        if (workoutStatus === "playing" || workoutStatus === "rest") {
          set({ workoutStatus: "paused" });
        }
      },

      resumeWorkout: () => {
        const { workoutStatus, timerRemaining, restRemaining } = get();
        if (workoutStatus === "paused") {
          // Determine if we were resting or playing
          if (restRemaining > 0) {
            set({ workoutStatus: "rest" });
          } else {
            set({ workoutStatus: "playing" });
          }
        }
      },

      tickTimer: (playSound) => {
        const { workoutStatus, timerRemaining, restRemaining } = get();
        
        if (workoutStatus === "playing") {
          const exercise = get().getCurrentExercise();
          if (exercise && exercise.type === "time") {
            if (timerRemaining > 0) {
              const nextVal = timerRemaining - 1;
              set({ timerRemaining: nextVal });
              
              // Sound cues: play count down on last 3 secs
              if (nextVal <= 3 && nextVal > 0) {
                playSound('tick');
              } else if (nextVal === 0) {
                playSound('complete');
                get().handleExerciseSegmentEnd();
              }
            }
          }
        } else if (workoutStatus === "rest") {
          if (restRemaining > 0) {
            const nextVal = restRemaining - 1;
            set({ restRemaining: nextVal });
            
            // Sound cues: countdown on last 3 secs of rest
            if (nextVal <= 3 && nextVal > 0) {
              playSound('tick');
            } else if (nextVal === 0) {
              playSound('start');
              set({ restRemaining: 0, workoutStatus: "playing" });
              get().initActiveExercise();
            }
          }
        }
      },

      handleExerciseSegmentEnd: () => {
        const { currentSet } = get();
        const exercise = get().getCurrentExercise();
        if (!exercise) return;

        const totalSets = exercise.sets || 1;
        const restBetweenSets = exercise.rest || 0;

        if (currentSet < totalSets) {
          // Increment set number first so that the rest screen previews the next set
          set({ currentSet: currentSet + 1 });
          
          if (restBetweenSets > 0) {
            set({
              workoutStatus: "rest",
              restRemaining: restBetweenSets,
              restTotal: restBetweenSets
            });
          } else {
            // No rest, straight to next set
            get().initActiveExercise();
          }
        } else {
          // All sets of this exercise done, advance to next exercise
          get().advanceExercise();
        }
      },

      markExerciseDone: () => {
        const { workoutStatus } = get();
        if (workoutStatus === 'rest') {
          get().skipRest();
        } else {
          get().handleExerciseSegmentEnd();
        }
      },

      skipRest: () => {
        const { workoutStatus } = get();
        if (workoutStatus === 'rest') {
          set({
            restRemaining: 0,
            workoutStatus: "playing"
          });
          get().initActiveExercise();
        }
      },

      advanceExercise: () => {
        const { activeDayPlan, currentBlockIndex, currentExerciseIndex, selectedDay } = get();
        if (!activeDayPlan) return;
        
        const currentBlock = activeDayPlan.blocks[currentBlockIndex];
        
        // Try next exercise in block
        if (currentExerciseIndex + 1 < currentBlock.exercises.length) {
          set({
            currentExerciseIndex: currentExerciseIndex + 1,
            currentSet: 1
          });
          get().initActiveExercise();
          return;
        }
        
        // Try next block
        if (currentBlockIndex + 1 < activeDayPlan.blocks.length) {
          set({
            currentBlockIndex: currentBlockIndex + 1,
            currentExerciseIndex: 0,
            currentSet: 1
          });
          get().initActiveExercise();
          return;
        }
        
        // No more blocks - Workout Complete!
        const { selectedWorkoutDate } = get();
        const targetDate = selectedWorkoutDate || new Date().toISOString().split('T')[0];
        const updatedCompleted = { ...get().completedDays };
        
        if (!updatedCompleted[selectedDay]) {
          updatedCompleted[selectedDay] = [];
        }
        if (!updatedCompleted[selectedDay].includes(targetDate)) {
          updatedCompleted[selectedDay].push(targetDate);
        }
        
        set({
          workoutStatus: "completed",
          workoutActive: false,
          completedDays: updatedCompleted
        });
      },


      previousExercise: () => {
        const { currentExerciseIndex, currentBlockIndex, activeDayPlan } = get();
        if (!activeDayPlan) return;

        // If we are on set > 1, go back to set 1
        const { currentSet } = get();
        if (currentSet > 1) {
          set({ currentSet: currentSet - 1 });
          get().initActiveExercise();
          return;
        }

        // Try previous exercise in same block
        if (currentExerciseIndex > 0) {
          set({
            currentExerciseIndex: currentExerciseIndex - 1,
            currentSet: 1
          });
          get().initActiveExercise();
          return;
        }

        // Try previous block's last exercise
        if (currentBlockIndex > 0) {
          const prevBlockIndex = currentBlockIndex - 1;
          const prevBlock = activeDayPlan.blocks[prevBlockIndex];
          set({
            currentBlockIndex: prevBlockIndex,
            currentExerciseIndex: prevBlock.exercises.length - 1,
            currentSet: 1
          });
          get().initActiveExercise();
          return;
        }

        // If at start, do nothing
      },

      resetWorkout: () => {
        set({
          workoutActive: false,
          workoutStatus: "idle",
          currentBlockIndex: 0,
          currentExerciseIndex: 0,
          currentSet: 1,
          timerRemaining: 0,
          restRemaining: 0
        });
      },

      resetActiveWorkout: () => {
        set({
          workoutActive: false,
          workoutStatus: "idle",
          currentBlockIndex: 0,
          currentExerciseIndex: 0,
          currentSet: 1,
          timerRemaining: 0,
          restRemaining: 0,
          activeDayPlan: null
        });
      },

      resetDayCompletion: (dayNumber) => {
        const updated = { ...get().completedDays };
        delete updated[dayNumber];
        set({ completedDays: updated });
      }
    }),
    {
      name: 'vb-coach-workout-state',
      partialize: (state) => ({
        completedDays: state.completedDays,
        lastAccessedDay: state.lastAccessedDay,
        lastAccessedLevel: state.lastAccessedLevel,
        previewDay: state.previewDay,
        previewLevel: state.previewLevel,
        selectedWorkoutDate: state.selectedWorkoutDate,
        workoutActive: state.workoutActive,
        selectedDay: state.selectedDay,
        selectedLevel: state.selectedLevel,
        currentBlockIndex: state.currentBlockIndex,
        currentExerciseIndex: state.currentExerciseIndex,
        currentSet: state.currentSet,
        workoutStatus: state.workoutStatus,
        timerRemaining: state.timerRemaining,
        timerTotal: state.timerTotal,
        restRemaining: state.restRemaining,
        restTotal: state.restTotal
      })
    }
  )
)

