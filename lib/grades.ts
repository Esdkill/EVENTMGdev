export const gradeLabels = {
  passed: "Сдано",
  planned: "Предстоит",
  retake: "Пересдача",
} as const;

export function gradeSummary(records: { score: number | null; status: keyof typeof gradeLabels }[]) {
  const scores = records.flatMap(record => record.score === null ? [] : [record.score]);
  const average = scores.length
    ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1).replace(".", ",")
    : "—";
  return { average, passed: records.filter(record => record.status === "passed").length, total: records.length };
}
