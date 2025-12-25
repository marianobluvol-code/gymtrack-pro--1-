
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CardioSession } from '../types';
import { TimerIcon, TrashIcon, HeartPulseIcon } from './icons';

interface CardioTrackerProps {
  sessions: CardioSession[];
  setSessions: React.Dispatch<React.SetStateAction<CardioSession[]>>;
}

const CARDIO_TYPES = [
  "Correr (Cinta)",
  "Correr (Aire Libre)",
  "Bicicleta Estática",
  "Ciclismo",
  "Elíptica",
  "Caminar",
  "Natación",
  "Remo",
  "Escaladora",
  "Comba (Salto de cuerda)",
  "HIIT"
];

const CardioTracker: React.FC<CardioTrackerProps> = ({ sessions, setSessions }) => {
  const [type, setType] = useState(CARDIO_TYPES[0]);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    if (!duration) {
      alert("Por favor ingresa al menos la duración.");
      return;
    }

    const newSession: CardioSession = {
      id: self.crypto.randomUUID(),
      date: new Date(date + 'T12:00:00').toISOString(), // Force mid-day to avoid timezone shifts on simple date display
      type,
      duration: parseFloat(duration),
      distance: distance ? parseFloat(distance) : undefined,
      notes
    };

    setSessions([newSession, ...sessions]);
    setDuration('');
    setDistance('');
    setNotes('');
    alert("Sesión guardada");
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar sesión de cardio?")) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  // Group data for charts (by type if selected or aggregate)
  const chartData = useMemo(() => {
    // Sort by date ascending for charts
    return [...sessions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => {
        // Calculate speed if distance exists
        const speed = s.distance ? (s.distance / (s.duration / 60)).toFixed(1) : 0;
        return {
          date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          duration: s.duration,
          distance: s.distance || 0,
          speed: parseFloat(speed as string),
          type: s.type
        };
      });
  }, [sessions]);

  // Filter charts by specific type if user has a lot of mixed data? 
  // For simplicity, we show a general chart, or we can add a filter later.
  // Let's filter by the currently selected "Type" in the dropdown to show relevant progress
  const filteredChartData = chartData.filter(d => d.type === type);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-2">
        <HeartPulseIcon className="w-8 h-8 text-rose-500" />
        <h1 className="text-3xl md:text-4xl font-bold text-white">Cardio Tracker</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-1 bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-700 h-fit">
          <h2 className="text-xl font-bold text-rose-400 mb-4">Nueva Sesión</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de Cardio</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
              >
                {CARDIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duración (min)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                  className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Distancia (km)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="5.2"
                  className="w-full bg-gray-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl mt-2 shadow-lg transition-colors"
            >
              Registrar Sesión
            </button>
          </div>
        </div>

        {/* Gráficas */}
        <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-2xl shadow-md border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Progreso: {type}</h2>
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">Últimas 10 sesiones</span>
          </div>

          {filteredChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredChartData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#F43F5E" tick={{ fontSize: 12 }} label={{ value: 'Km', angle: -90, position: 'insideLeft', fill: '#F43F5E' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#34D399" tick={{ fontSize: 12 }} label={{ value: 'Min', angle: 90, position: 'insideRight', fill: '#34D399' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                  formatter={(value: number, name: string) => [
                    name === 'speed' ? `${value} km/h` : name === 'duration' ? `${value} min` : `${value} km`,
                    name === 'speed' ? 'Velocidad' : name === 'duration' ? 'Tiempo' : 'Distancia'
                  ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="distance" name="Distancia" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="duration" name="Tiempo" stroke="#34D399" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="left" type="monotone" dataKey="speed" name="Velocidad (km/h)" stroke="#60A5FA" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 text-center">
              Registra al menos 2 sesiones de <b>{type}</b> para ver tu progreso.
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-gray-800 rounded-2xl shadow-md border border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Historial Reciente</h2>
          <span className="text-sm text-gray-400">{sessions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Actividad</th>
                <th className="p-4 text-center">Tiempo</th>
                <th className="p-4 text-center">Distancia</th>
                <th className="p-4 text-center">Velocidad</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sessions.map(s => {
                const speed = s.distance ? (s.distance / (s.duration / 60)).toFixed(1) : '-';
                return (
                  <tr key={s.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 font-medium text-white whitespace-nowrap">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-rose-400">{s.type}</td>
                    <td className="p-4 text-center">{s.duration} min</td>
                    <td className="p-4 text-center">{s.distance ? `${s.distance} km` : '-'}</td>
                    <td className="p-4 text-center">{speed !== '-' ? `${speed} km/h` : '-'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-400 p-2">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hay sesiones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CardioTracker;
