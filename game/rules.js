const PERMANENT_STATS = new Set(["treasury"]);

export function applyEffects(stats, effects, multiplier = 1) {
  for (const key in effects) {
    const raw = PERMANENT_STATS.has(key) ? effects[key] : Math.round(effects[key] * multiplier);
    stats[key] += raw;
    if (key === "happiness" || key === "prosperity" || key === "loyalty") {
      stats[key] = Math.max(0, Math.min(100, stats[key]));
    }
    // treasury is uncapped and can go negative
  }
}

export function getVoteMultiplier(votes, choice) {
  const total = votes[0] + votes[1];
  if (total === 0) return 1;
  const share = votes[choice] / total;
  if (share >= 0.9) return 1.4;
  if (share >= 0.7) return 1.2;
  if (share <= 0.1) return 0.6;
  if (share <= 0.3) return 0.8;
  return 1;
}

export function calculateDefiancePenalty(votes, choice) {
  const total = votes[0] + votes[1];
  if (total === 0) return 0;

  const majority = votes[0] > votes[1] ? 0 : 1;
  if (choice === majority) return 0;

  const alignment = Math.max(votes[0], votes[1]) / total;
  return Math.round(alignment * 15);
}

export function tickModifiers(state) {
  for (const mod of state.activeModifiers) {
    applyEffects(state.stats, { [mod.stat]: mod.amount });
    if (mod.duration !== null) mod.duration--;
  }
  state.activeModifiers = state.activeModifiers.filter(m => m.duration === null || m.duration > 0);
}

export function activateModifiers(choice, modifierDefs, state) {
  if (!choice.applyModifiers || choice.applyModifiers.length === 0) return;
  for (const id of choice.applyModifiers) {
    const def = modifierDefs.find(m => m.id === id);
    if (!def) { console.warn(`Modifier "${id}" not found.`); continue; }
    state.activeModifiers.push({ ...def });
  }
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