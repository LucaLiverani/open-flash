export interface SM2Input {
  quality: 0 | 2 | 3 | 5;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: string;
}

export function sm2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input;

  let newReps: number;
  let newInterval: number;
  let newEF: number;

  if (quality >= 3) {
    // Successful recall
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newReps = repetitions + 1;
  } else {
    // Failed recall — reset
    newReps = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEF =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  // Calculate next review date
  const now = new Date();
  now.setDate(now.getDate() + newInterval);
  const nextReview = now.toISOString().split("T")[0];

  return {
    repetitions: newReps,
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    nextReview,
  };
}
