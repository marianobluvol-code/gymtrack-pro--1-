
import { getRecentPRs } from './prLogic.ts';
import type { Workout } from '../types.ts';

const mockWorkouts: Workout[] = [
    {
        id: 'w1',
        name: 'Test Workout',
        date: new Date().toISOString(),
        duration: 60,
        exercises: [
            {
                id: 'e1',
                name: 'Bench Press',
                sets: [
                    { id: 's1', weight: 15, reps: 14 },
                    { id: 's2', weight: 17.5, reps: 12 },
                    { id: 's3', weight: 25, reps: 4 }
                ]
            }
        ]
    }
];

console.log("Running PR Deduplication Verification...");
const recentPRs = getRecentPRs(mockWorkouts);

console.log("Recent PRs found:", recentPRs.length);
recentPRs.forEach(pr => {
    console.log(`- ${pr.exerciseName}: ${pr.weight}kg x ${pr.reps} (${pr.type})`);
});

if (recentPRs.length === 1 && recentPRs[0].weight === 25 && recentPRs[0].reps === 4) {
    console.log("SUCCESS: Deduplication works correctly.");
} else {
    console.error("FAILURE: Deduplication failed.");
    process.exit(1);
}
