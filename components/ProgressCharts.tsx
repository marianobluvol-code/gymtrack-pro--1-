
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import type { Workout, Routine } from '../types';

interface ProgressChartsProps {
  workouts: Workout[];
  routines: Routine[];
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ workouts, routines }) => {

  // Extract all unique exercises from workouts
  const allHistoryExercises = useMemo(() =>
    [...new Set(workouts.flatMap(w => w.exercises.map(e => e.name)))],
    [workouts]);

  const processDataForExercise = (exerciseName: string) => {
    const data: { date: string; weight: number; reps: number; volumeLoad: number; fullDate: string }[] = [];
    workouts
      .filter(w => w.exercises.some(e => e.name === exerciseName))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(w => {
        const exercise = w.exercises.find(e => e.name === exerciseName);
        if (exercise && exercise.sets.length > 0) {
          // Find Top Set: Highest Weight, then Highest Reps
          const topSet = [...exercise.sets].sort((a, b) => {
            if (b.weight !== a.weight) return b.weight - a.weight;
            return b.reps - a.reps;
          })[0];

          if (topSet) {
            data.push({
              date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              fullDate: new Date(w.date).toLocaleDateString(),
              weight: topSet.weight,
              reps: topSet.reps,
              volumeLoad: topSet.weight * topSet.reps,
            });
          }
        }
      });
    return data;
  };

  if (allHistoryExercises.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold text-gray-400">Sin datos de progreso</h2>
        <p className="mt-2 text-gray-500">Completa algunos entrenamientos para ver tus gráficos de progreso aquí.</p>
      </div>
    );
  }

  // Organize exercises by Routine
  const routineGroups = routines.map(routine => {
    const routineExercises = routine.exercises.map(e => e.name);
    // Intersection of exercises in this routine AND exercises that have history
    const visibleExercises = routineExercises.filter(name => allHistoryExercises.includes(name));
    return {
      name: routine.name,
      exercises: visibleExercises
    };
  });

  // Find exercises that are NOT in any routine
  const allRoutineExerciseNames = new Set(routines.flatMap(r => r.exercises.map(e => e.name)));
  const otherExercises = allHistoryExercises.filter(name => !allRoutineExerciseNames.has(name));

  const CustomLabel = (props: any) => {
    const { x, y, value, index, data } = props;
    const pointData = data[index]; // Access the data point
    return (
      <text x={x} y={y} dy={-10} fill="#9CA3AF" fontSize={10} textAnchor="middle">
        {pointData.weight}x{pointData.reps}
      </text>
    );
  };

  const renderChart = (exName: string) => {
    const chartData = processDataForExercise(exName);
    if (chartData.length < 2) return null;

    return (
      <div key={exName} className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-2 ml-2 border-l-4 border-emerald-500 pl-2">{exName}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} padding={{ left: 30, right: 30 }} />
            <YAxis stroke="#10B981" tick={{ fontSize: 12 }} domain={['dataMin - 10%', 'dataMax + 10%']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                borderColor: '#4B5563',
                color: '#F3F4F6',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string, props: any) => {
                const { weight, reps } = props.payload;
                return [`${weight}kg x ${reps}`, 'Mejor Serie'];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Line
              type="monotone"
              dataKey="volumeLoad"
              name="Volume Load"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            >
              {/* @ts-ignore */}
              <LabelList content={<CustomLabel data={chartData} />} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {routineGroups.map(group => {
        if (group.exercises.length === 0) return null;

        // Check if there is actual chart data for this group
        const hasData = group.exercises.some(ex => processDataForExercise(ex).length >= 2);
        if (!hasData) return null;

        return (
          <div key={group.name} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
            <h2 className="text-2xl font-bold text-emerald-400 mb-6 sticky top-0 bg-gray-900/90 p-2 backdrop-blur-sm z-10 rounded-lg">{group.name}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {group.exercises.map(ex => renderChart(ex))}
            </div>
          </div>
        );
      })}

      {otherExercises.length > 0 && otherExercises.some(ex => processDataForExercise(ex).length >= 2) && (
        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
          <h2 className="text-2xl font-bold text-gray-300 mb-6 sticky top-0 bg-gray-900/90 p-2 backdrop-blur-sm z-10 rounded-lg">Otros Ejercicios</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {otherExercises.map(ex => renderChart(ex))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressCharts;
