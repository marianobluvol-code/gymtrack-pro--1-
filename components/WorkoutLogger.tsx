import React, { useState, useEffect } from 'react';
import type { Workout, Exercise, SetData, Routine } from '../types';
import { PlusIcon, TrashIcon, TimerIcon, GripVerticalIcon } from './icons';
import { getBestSetForExercise } from '../utils/prLogic';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RestTimerProps {
  onClose: () => void;
}

const RestTimer: React.FC<RestTimerProps> = ({ onClose }) => {
  const [time, setTime] = useState(60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning && time > 0) {
      interval = window.setInterval(() => {
        setTime(prevTime => prevTime - 1);
      }, 1000);
    } else if (time === 0) {
      setIsRunning(false);
      // Optional: Play a sound
      // new Audio('/path/to/sound.mp3').play();
    }
    return () => clearInterval(interval);
  }, [isRunning, time]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl text-center w-full max-w-sm border border-gray-700">
        <h3 className="text-2xl font-bold mb-4 text-emerald-400">Descanso</h3>
        <div className="text-7xl font-mono mb-8 text-white">{formatTime(time)}</div>
        <div className="grid grid-cols-2 gap-3">
          {!isRunning ? (
            <button onClick={() => setIsRunning(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg">
              Iniciar
            </button>
          ) : (
            <button onClick={() => setIsRunning(false)} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg">
              Pausar
            </button>
          )}
          <button onClick={() => { setTime(60); setIsRunning(false); }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg">
            Reset (60s)
          </button>
          <button onClick={onClose} className="col-span-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg mt-2">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

interface SortableExerciseItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableExerciseItem: React.FC<SortableExerciseItemProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 mb-4">
      <div {...attributes} {...listeners} className="mt-6 cursor-grab active:cursor-grabbing text-gray-500 hover:text-emerald-400 touch-none p-1">
        <GripVerticalIcon className="w-6 h-6" />
      </div>
      <div className="flex-grow min-w-0">
        {children}
      </div>
    </div>
  );
};
interface WorkoutLoggerProps {
  onSave: (workout: Workout) => void;
  onCancel: () => void;
  activeRoutine: Routine | null;
  allExerciseNames: string[];
  initialWorkout?: Workout | null;
  workouts: Workout[];
}

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({ onSave, onCancel, activeRoutine, allExerciseNames, initialWorkout, workouts }) => {
  const [workoutName, setWorkoutName] = useState(initialWorkout?.name || activeRoutine?.name || 'Nuevo Entrenamiento');
  const today = new Date();
  const todayString = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const [workoutDate, setWorkoutDate] = useState(initialWorkout ? initialWorkout.date.split('T')[0] : todayString);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [startTime] = useState(Date.now());
  const [showRestTimer, setShowRestTimer] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Silent Save Logic
  const saveWorkoutStateToLocal = () => {
    const duration = initialWorkout ? initialWorkout.duration : Math.round((Date.now() - startTime) / 1000);
    const draft: Workout = {
      id: initialWorkout?.id || self.crypto.randomUUID(),
      name: workoutName,
      date: workoutDate,
      exercises: exercises,
      duration: duration
      // Note: We might want to store startTime too if we want accurate duration on resume, 
      // but for now relying on existing fields. 
      // If we want exact resume of timer, we'd need to store startTime timestamp in draft.
    };
    localStorage.setItem('gymtrack_active_draft', JSON.stringify(draft));
  };

  // Auto-save draft on background (Silent)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveWorkoutStateToLocal();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [exercises, workoutName, workoutDate, startTime]);

  // Cleanup draft on unmount or finish
  const clearDraft = () => {
    localStorage.removeItem('gymtrack_active_draft');
  };

  useEffect(() => {
    if (initialWorkout) {
      setExercises(initialWorkout.exercises);
      setWorkoutName(initialWorkout.name);
      setWorkoutDate(initialWorkout.date.split('T')[0]);
    } else if (activeRoutine) {
      const initialExercises: Exercise[] = activeRoutine.exercises.map(e => ({
        id: self.crypto.randomUUID(),
        name: e.name,
        sets: [{ id: self.crypto.randomUUID(), weight: 0, reps: 0 }],
        notes: ''
      }));
      setExercises(initialExercises);
      setWorkoutName(activeRoutine.name);
    }
  }, [initialWorkout, activeRoutine]);

  const handleAddExercise = () => {
    setExercises([
      ...exercises,
      {
        id: self.crypto.randomUUID(),
        name: allExerciseNames.length > 0 ? allExerciseNames[0] : '',
        sets: [{ id: self.crypto.randomUUID(), weight: 0, reps: 0 }],
      },
    ]);
  };

  const handleRemoveExercise = (exIndex: number) => {
    setExercises(exercises.filter((_, i) => i !== exIndex));
  };

  const handleExerciseChange = <K extends keyof Exercise,>(exIndex: number, field: K, value: Exercise[K]) => {
    const newExercises = [...exercises];
    newExercises[exIndex][field] = value;
    setExercises(newExercises);
  };

  const handleAddSet = (exIndex: number) => {
    const newExercises = [...exercises];
    const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1] || { weight: 0, reps: 0 };
    newExercises[exIndex].sets.push({
      id: self.crypto.randomUUID(),
      weight: lastSet.weight,
      reps: lastSet.reps,
    });
    setExercises(newExercises);
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    if (newExercises[exIndex].sets.length > 1) {
      newExercises[exIndex].sets = newExercises[exIndex].sets.filter((_, i) => i !== setIndex);
      setExercises(newExercises);
    }
  };

  const handleSetChange = (exIndex: number, setIndex: number, field: keyof SetData, value: number) => {
    const newExercises = [...exercises];
    const newSet = { ...newExercises[exIndex].sets[setIndex], [field]: value };
    newExercises[exIndex].sets[setIndex] = newSet;
    setExercises(newExercises);
  };

  const handleSaveWorkout = () => {
    const duration = initialWorkout ? initialWorkout.duration : Math.round((Date.now() - startTime) / 1000);
    const dateWithCurrentTime = new Date(`${workoutDate}T${new Date().toTimeString().split(' ')[0]}`);
    const workout: Workout = {
      id: initialWorkout ? initialWorkout.id : self.crypto.randomUUID(),
      name: workoutName,
      date: dateWithCurrentTime.toISOString(),
      exercises: exercises.filter(e => e.name.trim() !== ''),
      duration,
    };
    clearDraft();
    onSave(workout);
  };

  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto pb-24 md:pb-6">
      {showRestTimer && <RestTimer onClose={() => setShowRestTimer(false)} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-800 p-4 rounded-xl shadow-sm">
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-gray-600 focus:border-emerald-500 outline-none w-full md:w-auto"
          placeholder="Nombre del entreno"
        />
        <div className="flex w-full md:w-auto gap-2">
          <input
            type="date"
            value={workoutDate}
            onChange={e => setWorkoutDate(e.target.value)}
            className="bg-gray-700 p-2 rounded-lg text-gray-200 h-10 md:h-12 flex-grow md:flex-grow-0"
            aria-label="Fecha del entrenamiento"
          />
          <button onClick={() => setShowRestTimer(true)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors h-10 md:h-12 flex-grow md:flex-grow-0">
            <TimerIcon className="w-5 h-5" />
            <span className="hidden md:inline">Descanso</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={exercises} strategy={verticalListSortingStrategy}>
            {exercises.map((exercise, exIndex) => (
              <SortableExerciseItem key={exercise.id} id={exercise.id}>
                <div className="bg-gray-800 p-3 md:p-4 rounded-xl shadow-md border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <input
                      type="text"
                      list="exercise-datalist"
                      value={exercise.name}
                      onChange={(e) => handleExerciseChange(exIndex, 'name', e.target.value)}
                      className="font-bold text-lg md:text-xl bg-gray-700 p-2 md:p-3 rounded-lg w-full focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Nombre del Ejercicio"
                    />
                    <button onClick={() => handleRemoveExercise(exIndex)} className="text-red-400 hover:text-red-300 pl-3 p-2">
                      <TrashIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>

                  {/* Visual Reference */}
                  {getBestSetForExercise(exercise.name, workouts) && (
                    <div className="text-xs text-emerald-400 mb-3 px-1 font-medium">
                      Anterior: {getBestSetForExercise(exercise.name, workouts)}
                    </div>
                  )}

                  {/* Header */}
                  <div className="grid grid-cols-12 gap-1 md:gap-2 text-xs md:text-sm text-gray-400 font-semibold mb-2 px-1 text-center">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">kg</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-2">RPE</div>
                    <div className="col-span-2">RIR</div>
                    <div className="col-span-1"></div>
                  </div>

                  {exercise.sets.map((set, setIndex) => (
                    <div key={set.id} className="grid grid-cols-12 gap-1 md:gap-2 items-center mb-2">
                      <div className="col-span-1 text-center font-bold text-gray-500 text-sm">{setIndex + 1}</div>
                      <div className="col-span-3">
                        <input type="number" inputMode="decimal" value={set.weight} onChange={(e) => handleSetChange(exIndex, setIndex, 'weight', parseFloat(e.target.value))} className="w-full bg-gray-700 text-center p-1 md:p-2 rounded-md text-sm md:text-base focus:ring-1 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" inputMode="decimal" value={set.reps} onChange={(e) => handleSetChange(exIndex, setIndex, 'reps', parseInt(e.target.value))} className="w-full bg-gray-700 text-center p-1 md:p-2 rounded-md text-sm md:text-base focus:ring-1 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" inputMode="decimal" placeholder="-" value={set.rpe ?? ''} onChange={(e) => handleSetChange(exIndex, setIndex, 'rpe', parseInt(e.target.value))} className="w-full bg-gray-700 text-center p-1 md:p-2 rounded-md text-sm md:text-base focus:ring-1 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" inputMode="decimal" placeholder="-" value={set.rir ?? ''} onChange={(e) => handleSetChange(exIndex, setIndex, 'rir', parseInt(e.target.value))} className="w-full bg-gray-700 text-center p-1 md:p-2 rounded-md text-sm md:text-base focus:ring-1 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => handleRemoveSet(exIndex, setIndex)} className="text-gray-500 hover:text-red-400 p-1">
                          <TrashIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => handleAddSet(exIndex)} className="mt-2 w-full text-center bg-gray-700 hover:bg-gray-600 text-emerald-400 font-semibold py-2 rounded-lg transition-colors text-sm md:text-base">
                    + Añadir Set
                  </button>
                  <textarea
                    value={exercise.notes || ''}
                    onChange={(e) => handleExerciseChange(exIndex, 'notes', e.target.value)}
                    placeholder="Notas..."
                    className="w-full bg-gray-700 p-2 rounded-lg mt-3 text-sm text-gray-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                    rows={1}
                  ></textarea>
                </div>
              </SortableExerciseItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <datalist id="exercise-datalist">
        {allExerciseNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <button onClick={handleAddExercise} className="w-full flex items-center justify-center gap-2 bg-gray-800 border-2 border-dashed border-gray-600 hover:border-emerald-500 text-gray-300 hover:text-emerald-400 font-bold py-4 rounded-xl transition-colors">
        <PlusIcon className="w-6 h-6" />
        Añadir Ejercicio
      </button>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800 flex gap-3 md:relative md:bg-transparent md:border-none md:p-0 z-40">
        <button onClick={handleSaveWorkout} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 md:py-3 px-4 rounded-xl shadow-lg transition-colors">
          Terminar
        </button>
        <button onClick={handleCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 md:py-3 px-4 rounded-xl shadow-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default WorkoutLogger;