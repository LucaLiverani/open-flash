export function normalizeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAccents(userAnswer) === normalizeAccents(correctAnswer);
}
