export function buildResponseVisualSummary(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return { kind: 'empty' };
  }

  const objectiveResult = results.find((result) => {
    const summaryEntries = result.summary ? Object.entries(result.summary) : [];
    return summaryEntries.length > 0;
  });

  if (objectiveResult) {
    const summaryEntries = Object.entries(objectiveResult.summary)
      .map(([label, value]) => ({ label, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const total = summaryEntries.reduce((acc, current) => acc + current.value, 0) || 1;
    return {
      kind: 'objective',
      question: objectiveResult.question || '객관식 응답',
      bars: summaryEntries.map((entry) => ({
        label: entry.label,
        value: entry.value,
        percent: Math.max(8, Math.round((entry.value / total) * 100))
      }))
    };
  }

  const subjectiveResult = results.find((result) => Array.isArray(result.comments) && result.comments.length > 0);
  if (subjectiveResult) {
    return {
      kind: 'subjective',
      question: subjectiveResult.question || '주관식 응답',
      count: subjectiveResult.comments.length
    };
  }

  return { kind: 'empty' };
}
