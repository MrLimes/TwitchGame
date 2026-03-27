export function applyEffects(stats, effects) {
  for (const key in effects) {
    stats[key] += effects[key];
    if (key === "happiness" || key === "prosperity" || key === "loyalty") {
      stats[key] = Math.max(0, Math.min(100, stats[key]));
    }
    // treasury is uncapped and can go negative
  }
}

export function calculateDefiancePenalty(votes, choice) {
  const total = votes[0] + votes[1];
  if (total === 0) return 0;

  const majority = votes[0] > votes[1] ? 0 : 1;
  if (choice === majority) return 0;

  const alignment = Math.max(votes[0], votes[1]) / total;
  return Math.round(alignment * 15);
}

export function checkEndConditions(state) {
  if (state.stats.happiness <= 0)
    return "The people revolt and overthrow you.";
  if (state.stats.loyalty <= 0)
    return "A coup removes you from power.";
  if (state.stats.prosperity <= 0)
    return "The kingdom collapses financially.";
  if (state.age >= 80)
    return "You die of old age.";

  return null;
}