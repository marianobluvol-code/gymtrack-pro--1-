import type { Workout } from '../types.ts';

export interface RecentPR {
    exerciseName: string;
    weight: number;
    reps: number;
    date: string;
    workoutId: string;
    previousBest: string; // Description of what was beaten (e.g., "70kg x 5")
    type: 'weight' | 'reps';
}

export const getRecentPRs = (workouts: Workout[]): RecentPR[] => {
    // 1. Sort workouts chronologically (oldest to newest) to replay history
    const sortedWorkouts = [...workouts].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const prs: RecentPR[] = [];
    const history: { [exerciseName: string]: { maxWeight: number; maxRepsAtMaxWeight: number } } = {};

    // 2. Replay history
    for (const workout of sortedWorkouts) {
        for (const exercise of workout.exercises) {
            const exerciseName = exercise.name;

            for (const set of exercise.sets) {
                // Skip warmups or invalid sets if necessary (assuming all logged sets are valid for now)
                if (set.weight <= 0) continue;

                if (!history[exerciseName]) {
                    // First time doing this exercise - technically a PR, but usually we want to beat *something*.
                    // However, for a "Recent PRs" feed, the first time IS a record.
                    // Let's count it, but maybe mark it differently? 
                    // User requirement: "Analiza el historial... comparado con el historial ANTERIOR".
                    // If there is no history, it's a baseline, not necessarily a "broken record".
                    // BUT, if I just started using the app, I want to see achievements.
                    // Let's count it as a PR if it's the first time, or maybe just initialize history.
                    // The prompt says: "Un set cuenta como 'Nuevo PR' si cumple... comparado con el historial anterior".
                    // This implies there MUST be history. So first time is NOT a PR.
                    history[exerciseName] = { maxWeight: set.weight, maxRepsAtMaxWeight: set.reps };
                    continue;
                }

                const currentBest = history[exerciseName];
                let isPR = false;
                let type: 'weight' | 'reps' = 'weight'; // Default
                let previousBestStr = `${currentBest.maxWeight}kg x ${currentBest.maxRepsAtMaxWeight}`;

                // Condition 1: Higher Weight
                if (set.weight > currentBest.maxWeight) {
                    isPR = true;
                    type = 'weight';
                }
                // Condition 2: More Reps at SAME Max Weight
                else if (set.weight === currentBest.maxWeight && set.reps > currentBest.maxRepsAtMaxWeight) {
                    isPR = true;
                    type = 'reps';
                }

                if (isPR) {
                    prs.push({
                        exerciseName: exerciseName,
                        weight: set.weight,
                        reps: set.reps,
                        date: workout.date,
                        workoutId: workout.id,
                        previousBest: previousBestStr,
                        type: type
                    });

                    // Update history
                    if (set.weight > currentBest.maxWeight) {
                        history[exerciseName] = { maxWeight: set.weight, maxRepsAtMaxWeight: set.reps };
                    } else if (set.weight === currentBest.maxWeight) {
                        history[exerciseName].maxRepsAtMaxWeight = Math.max(history[exerciseName].maxRepsAtMaxWeight, set.reps);
                    }
                }
            }
        }
    }

    // 3. Return last 5 UNIQUE PRs (reverse chronological)
    // Since we processed workouts chronologically, 'prs' is already in chronological order.
    // We just need to reverse it to get newest first.
    const allPRsDescending = [...prs].reverse();

    // Deduplicate: Keep only the first occurrence (most recent) of each exercise
    const uniquePRs: RecentPR[] = [];
    const seenExercises = new Set<string>();

    for (const pr of allPRsDescending) {
        if (!seenExercises.has(pr.exerciseName)) {
            uniquePRs.push(pr);
            seenExercises.add(pr.exerciseName);
        }
    }

    return uniquePRs.slice(0, 5);
};

export const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Justo ahora';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    if (diffInSeconds < 172800) return 'Ayer';

    const days = Math.floor(diffInSeconds / 86400);
    if (days < 7) return `Hace ${days} días`;

    return date.toLocaleDateString();
};

export const getBestSetForExercise = (exerciseName: string, workouts: Workout[]): string | null => {
    let bestWeight = 0;
    let bestReps = 0;
    let found = false;

    for (const workout of workouts) {
        for (const exercise of workout.exercises) {
            if (exercise.name === exerciseName) {
                for (const set of exercise.sets) {
                    if (set.weight > bestWeight) {
                        bestWeight = set.weight;
                        bestReps = set.reps;
                        found = true;
                    } else if (set.weight === bestWeight && set.reps > bestReps) {
                        bestReps = set.reps;
                        found = true;
                    }
                }
            }
        }
    }

    if (!found) return null;
    return `${bestWeight}kg x ${bestReps}`;
};
