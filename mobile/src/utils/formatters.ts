export function formatScore(score: number): string {
  return score.toFixed(2);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
