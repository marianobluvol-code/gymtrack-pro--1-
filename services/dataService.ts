
import type { Workout, BodyMetric } from '../types';

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const exportWorkoutsToCSV = (workouts: Workout[]) => {
  const flattenedData = workouts.flatMap(w =>
    w.exercises.flatMap(e =>
      e.sets.map(s => ({
        workout_id: w.id,
        workout_date: w.date,
        workout_name: w.name,
        exercise_name: e.name,
        set_id: s.id,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir ?? '',
        rpe: s.rpe ?? '',
        notes: e.notes ?? ''
      }))
    )
  );

  if (flattenedData.length === 0) {
    alert("No hay datos de entrenamiento para exportar.");
    return;
  }

  const csv = convertToCSV(flattenedData);
  downloadCSV(csv, 'gymtrack_pro_workouts.csv');
};


export const exportBodyMetricsToCSV = (metrics: BodyMetric[]) => {
  const dataToExport = metrics.map(m => ({
    date: m.date,
    weight: m.weight,
    body_fat_percent: m.bodyFat ?? '',
    ...m.measurements
  }));

  if (dataToExport.length === 0) {
    alert("No hay métricas corporales para exportar.");
    return;
  }

  const csv = convertToCSV(dataToExport);
  downloadCSV(csv, 'gymtrack_pro_body_metrics.csv');
};

export const exportDataToJSON = (data: any) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `gymtrack_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

export const importDataFromJSON = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};
