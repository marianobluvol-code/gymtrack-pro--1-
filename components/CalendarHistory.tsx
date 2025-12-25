
import React, { useState, useMemo } from 'react';
import type { Workout } from '../types';
import { TimerIcon, TrashIcon, PencilIcon } from './icons';

interface CalendarHistoryProps {
  workouts: Workout[];
  onDelete: (id: string) => void;
  onEdit: (workout: Workout) => void;
}

const CalendarHistory: React.FC<CalendarHistoryProps> = ({ workouts, onDelete, onEdit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sunday

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0 (Sun) to 6 (Sat)

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Map workouts to dates YYYY-MM-DD
  const workoutsByDate = useMemo(() => {
    const map: Record<string, Workout[]> = {};
    workouts.forEach(w => {
      const dateKey = w.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(w);
    });
    return map;
  }, [workouts]);

  const handleDayClick = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateString);
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 md:h-14"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasWorkout = !!workoutsByDate[dateString];
      const isSelected = selectedDate === dateString;
      const isToday = new Date().toISOString().split('T')[0] === dateString;

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`h-10 md:h-14 rounded-lg flex flex-col items-center justify-center relative transition-colors ${isSelected
            ? 'bg-emerald-600 text-white'
            : isToday
              ? 'bg-gray-700 text-emerald-400 border border-emerald-500/50'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
        >
          <span className="text-sm font-semibold">{day}</span>
          {hasWorkout && (
            <div className="flex gap-0.5 mt-1">
              {workoutsByDate[dateString].map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></div>
              ))}
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  const selectedWorkouts = selectedDate ? workoutsByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">←</button>
          <h2 className="text-xl font-bold text-white capitalize">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-xs text-gray-500 font-bold">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">
          {selectedDate ? (() => {
            const [y, m, d] = selectedDate.split('-').map(Number);
            return `Entrenamientos del ${new Date(y, m - 1, d).toLocaleDateString()}`;
          })() : 'Selecciona un día'}
        </h3>

        {selectedWorkouts.length > 0 ? (
          selectedWorkouts.map(w => (
            <div key={w.id} className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-bold text-emerald-400">{w.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><TimerIcon className="w-3 h-3" /> {Math.round(w.duration / 60)} min</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(w)} className="text-gray-500 hover:text-emerald-400 p-2"><PencilIcon className="w-5 h-5" /></button>
                  <button onClick={() => onDelete(w.id)} className="text-gray-500 hover:text-red-400 p-2"><TrashIcon className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="space-y-2">
                  {w.exercises.map(e => (
                    <div key={e.id} className="text-sm">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold text-gray-200">{e.name}</p>
                        <span className="text-gray-500 text-xs">{e.sets.length} sets</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {e.sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ')}
                      </p>
                      {e.notes && (
                        <p className="text-sm text-gray-400 italic mt-1">
                          {e.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          selectedDate && <p className="text-gray-500 italic">No hay entrenamientos registrados este día.</p>
        )}
      </div>
    </div >
  );
};

export default CalendarHistory;
