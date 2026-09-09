export function subjective(type: string) {
  return type === "essay" || type === "translation";
}
export function grade(
  type: string,
  value: string,
  rule?: {
    standardAnswer: string;
    acceptableAnswers: string | null;
    caseSensitive: boolean;
    disputed?: boolean;
  }
) {
  if (subjective(type) || rule?.disputed) return null;
  if (!value.trim() || !rule) return false;
  if (type !== "word_formation") return value.trim() === rule.standardAnswer;
  let variants: string[] = [];
  try {
    const parsed = JSON.parse(rule.acceptableAnswers || "[]");
    if (Array.isArray(parsed)) variants = parsed.filter((x) => typeof x === "string");
  } catch {
    /* A malformed optional variant must not discard the standard answer. */
  }
  const normalize = (s: string) => (rule.caseSensitive ? s.trim() : s.trim().toLowerCase());
  return [rule.standardAnswer, ...variants].some((s) => normalize(s) === normalize(value));
}
export function mastery(previous: number, correct: boolean, sameVersion: boolean) {
  const count = correct ? Math.min(2, (sameVersion ? previous : 0) + 1) : 0;
  return {
    consecutiveCorrect: count,
    masteryStatus: count >= 2 ? "mastered" : count === 1 ? "consolidating" : "unmastered",
  };
}
