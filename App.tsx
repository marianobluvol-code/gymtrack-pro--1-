
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AppView, Workout, Routine, BodyMetric, CardioSession } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DumbbellIcon, BarChartIcon, RepeatIcon, SparklesIcon, DownloadIcon, TrashIcon, PlusIcon, HomeIcon, HeartPulseIcon, UploadIcon } from './components/icons';
import WorkoutLogger from './components/WorkoutLogger';
import ProgressCharts from './components/ProgressCharts';
import CalendarHistory from './components/CalendarHistory';
import CardioTracker from './components/CardioTracker';
import { EXERCISE_LIST } from './constants';
import { exportWorkoutsToCSV, exportBodyMetricsToCSV, exportDataToJSON, importDataFromJSON } from './services/dataService';
import { generateRoutineWithAI } from './services/geminiService';
import { getRecentPRs, formatTimeAgo } from './utils/prLogic';

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg mb-1 ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
  >
    {icon}
    <span className="mx-4 font-medium text-base">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-2 transition-colors duration-200 ${isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
      }`}
  >
    <div className={`p-1 rounded-full ${isActive ? 'bg-emerald-900/30' : ''}`}>
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
    </div>
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);

const WorkoutSelectionModal: React.FC<{
  isOpen: boolean,
  onClose: () => void,
  routines: Routine[],
  onSelectRoutine: (r: Routine) => void,
  onFreeWorkout: () => void
}> = ({ isOpen, onClose, routines, onSelectRoutine, onFreeWorkout }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-gray-800 w-full md:w-full md:max-w-lg rounded-t-2xl md:rounded-2xl shadow-2xl border-t md:border border-gray-700 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-white">Iniciar Entrenamiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2">✕</button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <button onClick={onFreeWorkout} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 shadow-lg mb-4">
            <DumbbellIcon className="w-6 h-6" />
            Entrenamiento Libre
          </button>

          <h3 className="text-gray-400 font-semibold text-sm uppercase tracking-wider pl-1">Mis Rutinas</h3>
          {routines.length === 0 ? (
            <div className="bg-gray-700/50 p-4 rounded-xl text-center text-gray-400 text-sm">
              No tienes rutinas guardadas.
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map(routine => (
                <button
                  key={routine.id}
                  onClick={() => onSelectRoutine(routine)}
                  className="w-full text-left bg-gray-700 hover:bg-gray-600 p-4 rounded-xl transition-colors flex justify-between items-center group"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{routine.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{routine.exercises.length} ejercicios</div>
                  </div>
                  <PlusIcon className="w-5 h-5 text-gray-500 group-hover:text-white" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 md:rounded-b-2xl">
          <button onClick={onClose} className="w-full bg-gray-900 hover:bg-black text-gray-300 font-bold py-3 rounded-xl border border-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};


const Dashboard: React.FC<{ workouts: Workout[], bodyMetrics: BodyMetric[], onStartWorkoutClick: () => void, onStartRoutine: (routine: Routine) => void, routines: Routine[] }> = ({ workouts, bodyMetrics, onStartWorkoutClick, onStartRoutine, routines }) => {
  const lastWorkout = workouts.length > 0 ? workouts[0] : null;
  const lastBodyMetric = bodyMetrics.length > 0 ? bodyMetrics[0] : null;

  const recentPRs = useMemo(() => getRecentPRs(workouts), [workouts]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="md:hidden flex items-center justify-center gap-2 mb-4">
        <DumbbellIcon className="w-8 h-8 text-emerald-500" />
        <h1 className="text-3xl font-bold text-white text-center">GymTrack</h1>
      </div>
      <h1 className="text-4xl font-bold text-white hidden md:block">GymTrack</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <button onClick={onStartWorkoutClick} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 px-4 rounded-2xl shadow-lg transition-all transform active:scale-95 text-xl md:text-2xl flex flex-col items-center justify-center gap-2 md:col-span-2 lg:col-span-1">
          <PlusIcon className="w-10 h-10 md:w-12 md:h-12" />
          Nuevo Entrenamiento
        </button>
        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-md hidden lg:block">
          <h3 className="font-bold text-lg mb-3 text-gray-200">Acceso Rápido Rutinas</h3>
          {routines.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {routines.slice(0, 3).map(r => (
                <button key={r.id} onClick={() => onStartRoutine(r)} className="w-full text-left bg-gray-700 hover:bg-gray-600 text-emerald-400 font-semibold py-3 px-4 rounded-xl transition flex justify-between items-center">
                  <span>{r.name}</span>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">{r.exercises.length} ex</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <p>No tienes rutinas.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-gray-800 p-5 md:p-6 rounded-2xl shadow-md border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Logros Recientes</h2>
            <SparklesIcon className="text-yellow-500 w-5 h-5" />
          </div>
          {recentPRs.length > 0 ? (
            <ul className="space-y-3">
              {recentPRs.map((pr, index) => (
                <li key={`${pr.workoutId}-${pr.exerciseName}-${index}`} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-xl border border-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-200 text-sm md:text-base truncate">{pr.exerciseName}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(pr.date)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 whitespace-nowrap block">{pr.weight} kg <span className="text-gray-500 text-xs">x{pr.reps}</span></span>
                    <span className="text-[10px] text-gray-400 block">vs {pr.previousBest}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-400 italic">Entrena para romper récords.</p>}
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-gray-800 p-5 md:p-6 rounded-2xl shadow-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Último Entreno</h2>
            {lastWorkout ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-emerald-400 mb-1">{lastWorkout.name}</p>
                  <p className="text-gray-400 text-sm">{new Date(lastWorkout.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{Math.round(lastWorkout.duration / 60)}<span className="text-sm font-normal text-gray-500">m</span></p>
                </div>
              </div>
            ) : <p className="text-gray-400 italic">Sin datos recientes.</p>}
          </div>

          <div className="bg-gray-800 p-5 md:p-6 rounded-2xl shadow-md border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Estado Físico</h2>
            {lastBodyMetric ? (
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Peso Actual</p>
                  <p className="font-bold text-2xl md:text-3xl text-white">{lastBodyMetric.weight} <span className="text-sm text-gray-500">kg</span></p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha</p>
                  <p className="text-gray-300">{new Date(lastBodyMetric.date).toLocaleDateString()}</p>
                </div>
              </div>
            ) : <p className="text-gray-400 italic">Registra tu peso en Progreso.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RoutineBuilderProps {
  routine: Routine;
  onSave: (routine: Routine) => void;
  onCancel: () => void;
  allExercises: string[];
}

const RoutineBuilder: React.FC<RoutineBuilderProps> = ({ routine, onSave, onCancel, allExercises }) => {
  const [currentRoutine, setCurrentRoutine] = useState(routine);

  const handleNameChange = (name: string) => {
    setCurrentRoutine({ ...currentRoutine, name });
  };

  const handleAddExercise = () => {
    const newExercise = { name: '' };
    setCurrentRoutine({ ...currentRoutine, exercises: [...currentRoutine.exercises, newExercise] });
  };

  const handleExerciseChange = (index: number, name: string) => {
    const newExercises = [...currentRoutine.exercises];
    newExercises[index] = { name };
    setCurrentRoutine({ ...currentRoutine, exercises: newExercises });
  };

  const handleRemoveExercise = (index: number) => {
    const newExercises = currentRoutine.exercises.filter((_, i) => i !== index);
    setCurrentRoutine({ ...currentRoutine, exercises: newExercises });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-24 md:pb-6">
      <h2 className="text-2xl md:text-3xl font-bold">Editar Rutina</h2>
      <input
        type="text"
        value={currentRoutine.name}
        onChange={(e) => handleNameChange(e.target.value)}
        className="w-full text-xl font-bold bg-gray-800 p-3 rounded-xl border border-gray-600 focus:border-emerald-500 outline-none"
        placeholder="Nombre de la rutina"
      />
      <div className="space-y-3">
        {currentRoutine.exercises.map((ex, index) => (
          <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700">
            <span className="text-gray-500 pl-2 font-mono">{index + 1}.</span>
            <input
              type="text"
              list="exercise-datalist-builder"
              value={ex.name}
              onChange={(e) => handleExerciseChange(index, e.target.value)}
              className="font-semibold bg-transparent p-2 w-full focus:outline-none text-white"
              placeholder="Ejercicio"
            />
            <button onClick={() => handleRemoveExercise(index)} className="text-gray-500 hover:text-red-400 p-2">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <datalist id="exercise-datalist-builder">
        {allExercises.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <button onClick={handleAddExercise} className="w-full bg-gray-800 border-2 border-dashed border-gray-600 hover:border-emerald-500 text-gray-300 hover:text-emerald-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
        <PlusIcon className="w-5 h-5" /> Añadir Ejercicio
      </button>
      <div className="flex gap-3 pt-4">
        <button onClick={() => onSave(currentRoutine)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl">Guardar</button>
        <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl">Cancelar</button>
      </div>
    </div>
  );
};

interface RoutinesViewProps {
  routines: Routine[];
  setRoutines: React.Dispatch<React.SetStateAction<Routine[]>>;
  onStartRoutine: (routine: Routine) => void;
  allExercises: string[];
  setCustomExercises: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenAI: () => void;
}

const RoutinesView: React.FC<RoutinesViewProps> = ({ routines, setRoutines, onStartRoutine, allExercises, setCustomExercises, onOpenAI }) => {
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  const handleSaveRoutine = (routineToSave: Routine) => {
    const currentKnownExercises = new Set(allExercises);
    const newCustomExercises = [...new Set(routineToSave.exercises
      .map(e => e.name.trim())
      .filter(name => name && !currentKnownExercises.has(name)))];

    if (newCustomExercises.length > 0) {
      setCustomExercises(prev => [...new Set([...prev, ...newCustomExercises])]);
    }

    if (routines.some(r => r.id === routineToSave.id)) {
      setRoutines(routines.map(r => r.id === routineToSave.id ? routineToSave : r));
    } else {
      setRoutines([...routines, routineToSave]);
    }
    setEditingRoutine(null);
  };

  const handleNewRoutine = () => {
    setEditingRoutine({ id: self.crypto.randomUUID(), name: 'Nueva Rutina', exercises: [] });
  };

  const handleDeleteRoutine = (id: string) => {
    if (window.confirm("¿Seguro que quieres eliminar esta rutina?")) {
      setRoutines(routines.filter(r => r.id !== id));
    }
  };

  if (editingRoutine) {
    return <RoutineBuilder routine={editingRoutine} onSave={handleSaveRoutine} onCancel={() => setEditingRoutine(null)} allExercises={allExercises} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-4 pb-24 md:pb-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Mis Rutinas</h1>
        <div className="flex gap-2">
          <button onClick={handleNewRoutine} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2">
            <PlusIcon className="w-5 h-5" /> <span className="whitespace-nowrap">Crear</span>
          </button>
          <button onClick={onOpenAI} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2">
            <SparklesIcon className="w-5 h-5 text-yellow-300" /> <span className="whitespace-nowrap">Generar con IA</span>
          </button>
        </div>
      </div>
      {routines.length === 0 ? <div className="text-center py-10 bg-gray-800 rounded-2xl"><p className="text-gray-400">No tienes rutinas.</p></div> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routines.map(r => (
          <div key={r.id} className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700 flex flex-col justify-between min-h-[140px]">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white truncate">{r.name}</h2>
              <p className="text-sm text-gray-400">{r.exercises.length} ejercicios</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <button onClick={() => onStartRoutine(r)} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-semibold py-2 px-3 rounded-lg border border-emerald-600/50">Iniciar</button>
              <button onClick={() => setEditingRoutine(r)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-3 rounded-lg"><HomeIcon className="w-5 h-5 rotate-12" /></button>
              <button onClick={() => handleDeleteRoutine(r.id)} className="bg-gray-700 hover:bg-red-900/50 text-red-400 py-2 px-3 rounded-lg"><TrashIcon className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleWeightTracker: React.FC<{ metrics: BodyMetric[], setMetrics: React.Dispatch<React.SetStateAction<BodyMetric[]>> }> = ({ metrics, setMetrics }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddMetric = () => {
    if (!weight) {
      alert("El peso es obligatorio.");
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const newMetric: BodyMetric = {
      id: self.crypto.randomUUID(),
      date: dateObj.toISOString(),
      weight: parseFloat(weight),
    };
    // Add new metric and sort by date descending
    const newMetrics = [newMetric, ...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMetrics(newMetrics);
    setWeight('');
    alert("Peso registrado");
  };

  const chartData = useMemo(() => metrics.map(m => ({
    date: new Date(m.date).toLocaleDateString(),
    Peso: m.weight
  })).reverse(), [metrics]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 h-fit">
          <h2 className="text-xl font-bold mb-4 text-emerald-400">Registrar Peso</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Peso (kg)</label>
              <input type="number" inputMode="decimal" placeholder="Ej: 75.5" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-gray-700 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white text-lg" />
            </div>
            <button onClick={handleAddMetric} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl mt-2 shadow-lg">
              Guardar
            </button>
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 pl-2">Evolución de Peso</h3>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis stroke="#10B981" width={40} tick={{ fontSize: 12 }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="Peso" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center pt-20">Registra más datos para ver la tendencia.</p>}
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <h3 className="text-lg font-bold">Historial de Peso</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Peso</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {metrics.map(m => (
                <tr key={m.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold text-white">{m.weight} kg</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setMetrics(metrics.filter(met => met.id !== m.id))} className="text-gray-500 hover:text-red-400"><TrashIcon className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">No hay registros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface ProgressHubProps {
  workouts: Workout[];
  routines: Routine[];
  onDeleteWorkout: (id: string) => void;
  metrics: BodyMetric[];
  setMetrics: React.Dispatch<React.SetStateAction<BodyMetric[]>>;
  onExport: () => void;
  onImport: (file: File) => void;
  onEditWorkout: (workout: Workout) => void;
}

const ProgressHub: React.FC<ProgressHubProps> = ({ workouts, routines, onDeleteWorkout, metrics, setMetrics, onExport, onImport, onEditWorkout }) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'calendar' | 'weight'>('charts');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <BarChartIcon className="w-8 h-8 text-emerald-500" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Mi Progreso</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-800 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all whitespace-nowrap ${activeTab === 'charts' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Rendimiento
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Calendario
        </button>
        <button
          onClick={() => setActiveTab('weight')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all whitespace-nowrap ${activeTab === 'weight' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Peso Corporal
        </button>
      </div>

      {/* Export/Import Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onExport} className="flex items-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors">
          <DownloadIcon className="w-4 h-4 mr-1" /> Exportar Datos
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors">
          <UploadIcon className="w-4 h-4 mr-1" /> Importar Datos
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[50vh]">
        {activeTab === 'charts' && (
          <div className="animate-fade-in">
            <ProgressCharts workouts={workouts} routines={routines} />
          </div>
        )}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in">
            <CalendarHistory workouts={workouts} onDelete={onDeleteWorkout} onEdit={onEditWorkout} />
          </div>
        )}
        {activeTab === 'weight' && (
          <div className="animate-fade-in">
            <SimpleWeightTracker metrics={metrics} setMetrics={setMetrics} />
          </div>
        )}
      </div>
    </div>
  );
};

const AIGeneratorView: React.FC<{ onSaveRoutines: (routines: Routine[]) => void, onCancel: () => void }> = ({ onSaveRoutines, onCancel }) => {
  const [goal, setGoal] = useState('hipertrofia');
  const [level, setLevel] = useState('principiante');
  const [days, setDays] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!process.env.API_KEY) {
      setError("La clave de API de Gemini no está configurada.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await generateRoutineWithAI(goal, level, parseInt(days));
      onSaveRoutines(result.routines);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="text-center pt-6">
        <div className="inline-block p-3 bg-gray-800 rounded-full mb-4">
          <SparklesIcon className="text-indigo-400 w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-white">Generador IA</h1>
        <p className="text-gray-400 mt-2 px-4">Describe tus metas y obtén una rutina personalizada en segundos.</p>
      </div>

      <div className="bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Objetivo</label>
          <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="hipertrofia">Ganar Músculo</option>
            <option value="fuerza">Ganar Fuerza</option>
            <option value="perdida_grasa">Perder Grasa</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Nivel</label>
          <select value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Días por semana</label>
          <select value={days} onChange={e => setDays(e.target.value)} className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="2">2 días</option>
            <option value="3">3 días</option>
            <option value="4">4 días</option>
            <option value="5">5 días</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="flex flex-col md:flex-row gap-3">
        <button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-xl disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-lg">
          {isLoading ? 'Creando Rutina...' : 'Generar Rutina'}
        </button>
        <button onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('gymtrack_workouts', []);
  const [routines, setRoutines] = useLocalStorage<Routine[]>('gymtrack_routines', []);
  const [bodyMetrics, setBodyMetrics] = useLocalStorage<BodyMetric[]>('gymtrack_metrics', []);
  const [cardioSessions, setCardioSessions] = useLocalStorage<CardioSession[]>('gymtrack_cardio', []);
  const [customExercises, setCustomExercises] = useLocalStorage<string[]>('gymtrack_custom_exercises', []);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);

  // Restore Active Draft
  useEffect(() => {
    const draftJson = localStorage.getItem('gymtrack_active_draft');
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson);
        // We set the draft as editingWorkout so WorkoutLogger picks it up as initialWorkout
        setEditingWorkout(draft);
        setView('workout');
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  const allExerciseNames = useMemo(() =>
    [...new Set([...EXERCISE_LIST, ...customExercises])].sort(),
    [customExercises]
  );

  const handleSaveWorkout = (workout: Workout) => {
    const currentKnownExercises = new Set(allExerciseNames);
    const newCustomExercises = [...new Set(workout.exercises
      .map(e => e.name)
      .filter(name => !currentKnownExercises.has(name) && name.trim() !== ''))];

    if (newCustomExercises.length > 0) {
      setCustomExercises(prev => [...new Set([...prev, ...newCustomExercises])]);
    }

    if (editingWorkout) {
      setWorkouts(workouts.map(w => w.id === workout.id ? workout : w));
      setEditingWorkout(null);
    } else {
      setWorkouts([workout, ...workouts]);
    }
    // Redirect to progress calendar tab (conceptually)
    setView('progress');
  };

  const handleDeleteWorkout = (id: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este entrenamiento? Esta acción no se puede deshacer.")) {
      setWorkouts(workouts.filter(w => w.id !== id));
    }
  };

  const handleStartRoutine = (routine: Routine) => {
    setActiveRoutine(routine);
    setShowWorkoutModal(false);
    setView('workout');
  }

  const handleStartFreeWorkout = () => {
    setActiveRoutine(null);
    setShowWorkoutModal(false);
    setView('workout');
  }

  const handleOpenWorkoutModal = () => {
    setEditingWorkout(null);
    setShowWorkoutModal(true);
  }

  const handleEditWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setActiveRoutine(null);
    setView('workout');
  };

  const handleSaveAIRoutines = (newRoutines: Routine[]) => {
    setRoutines([...routines, ...newRoutines]);
    alert(`¡${newRoutines.length} rutinas añadidas!`);
    setView('routines');
  };

  const handleExportData = () => {
    const data = {
      workouts,
      routines,
      bodyMetrics,
      cardioSessions,
      customExercises
    };
    exportDataToJSON(data);
  };

  const handleImportData = async (file: File) => {
    if (!window.confirm("Importar datos sobrescribirá tus datos actuales. ¿Estás seguro?")) return;
    try {
      const data = await importDataFromJSON(file);
      if (data.workouts) setWorkouts(data.workouts);
      if (data.routines) setRoutines(data.routines);
      if (data.bodyMetrics) setBodyMetrics(data.bodyMetrics);
      if (data.cardioSessions) setCardioSessions(data.cardioSessions);
      if (data.customExercises) setCustomExercises(data.customExercises);
      alert("Datos importados correctamente.");
    } catch (error) {
      alert("Error al importar datos: " + error);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard workouts={workouts} bodyMetrics={bodyMetrics} onStartWorkoutClick={handleOpenWorkoutModal} onStartRoutine={handleStartRoutine} routines={routines} />;
      case 'workout':
        return <WorkoutLogger onSave={handleSaveWorkout} onCancel={() => { setView('dashboard'); setEditingWorkout(null); }} activeRoutine={activeRoutine} allExerciseNames={allExerciseNames} initialWorkout={editingWorkout} workouts={workouts} />;
      case 'routines':
        return <RoutinesView routines={routines} setRoutines={setRoutines} onStartRoutine={handleStartRoutine} allExercises={allExerciseNames} setCustomExercises={setCustomExercises} onOpenAI={() => setView('ai_generator')} />;
      case 'cardio':
        return <CardioTracker sessions={cardioSessions} setSessions={setCardioSessions} />;
      case 'ai_generator':
        return <AIGeneratorView onSaveRoutines={handleSaveAIRoutines} onCancel={() => setView('routines')} />;
      case 'progress':
        return <ProgressHub workouts={workouts} routines={routines} onDeleteWorkout={handleDeleteWorkout} metrics={bodyMetrics} setMetrics={setBodyMetrics} onExport={handleExportData} onImport={handleImportData} onEditWorkout={handleEditWorkout} />;
      default:
        return <Dashboard workouts={workouts} bodyMetrics={bodyMetrics} onStartWorkoutClick={handleOpenWorkoutModal} onStartRoutine={handleStartRoutine} routines={routines} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 flex-col md:flex-row font-sans">
      <WorkoutSelectionModal
        isOpen={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        routines={routines}
        onSelectRoutine={handleStartRoutine}
        onFreeWorkout={handleStartFreeWorkout}
      />

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-72 flex-shrink-0 bg-gray-800 p-6 flex-col justify-between border-r border-gray-700">
        <div>
          <div className="flex items-center mb-10 px-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <DumbbellIcon className="h-8 w-8 text-emerald-500" />
            </div>
            <span className="ml-3 text-2xl font-bold text-white tracking-tight">GymTrack</span>
          </div>
          <nav className="space-y-1">
            <NavItem icon={<HomeIcon className="w-6 h-6" />} label="Dashboard" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <NavItem icon={<RepeatIcon className="w-6 h-6" />} label="Rutinas" isActive={view === 'routines'} onClick={() => setView('routines')} />
            <NavItem icon={<HeartPulseIcon className="w-6 h-6" />} label="Cardio" isActive={view === 'cardio'} onClick={() => setView('cardio')} />
            <NavItem icon={<BarChartIcon className="w-6 h-6" />} label="Progreso" isActive={view === 'progress'} onClick={() => setView('progress')} />
            <div className="pt-4 mt-4 border-t border-gray-700">
              <NavItem icon={<SparklesIcon className="w-6 h-6 text-indigo-400" />} label="Generador IA" isActive={view === 'ai_generator'} onClick={() => setView('ai_generator')} />
            </div>
          </nav>
        </div>
        <div className="space-y-2">
          <button onClick={() => exportWorkoutsToCSV(workouts)} className="flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm">
            <DownloadIcon className="w-5 h-5" />
            <span className="mx-3 font-medium">CSV Entrenos</span>
          </button>
          <button onClick={() => exportBodyMetricsToCSV(bodyMetrics)} className="flex items-center w-full px-4 py-3 transition-colors duration-200 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white text-sm">
            <DownloadIcon className="w-5 h-5" />
            <span className="mx-3 font-medium">CSV Métricas</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-900 scroll-smooth">
        {renderView()}
      </main>

      {/* Bottom Nav for Mobile */}
      {view !== 'workout' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-2 pb-safe pt-1 flex justify-around items-center z-50 h-[60px] pb-3">
          <MobileNavItem icon={<HomeIcon />} label="Inicio" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <MobileNavItem icon={<RepeatIcon />} label="Rutinas" isActive={view === 'routines' || view === 'ai_generator'} onClick={() => setView('routines')} />
          <div className="relative -top-5">
            <button onClick={handleOpenWorkoutModal} className="bg-emerald-500 hover:bg-emerald-400 text-white p-4 rounded-full shadow-lg border-4 border-gray-900">
              <PlusIcon className="w-7 h-7" />
            </button>
          </div>
          <MobileNavItem icon={<HeartPulseIcon />} label="Cardio" isActive={view === 'cardio'} onClick={() => setView('cardio')} />
          <MobileNavItem icon={<BarChartIcon />} label="Progreso" isActive={view === 'progress'} onClick={() => setView('progress')} />
        </div>
      )}
    </div>
  );
};


export default App;
