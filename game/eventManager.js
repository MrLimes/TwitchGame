export function isEventEligible(event, state) {
  const req = event.requirements;
  if (!req) return true;

  if (req.stats) {
    for (const stat in req.stats) {
      const value = state.stats[stat];
      const rule = req.stats[stat];

      if (rule.lte !== undefined && value > rule.lte) return false;
      if (rule.gte !== undefined && value < rule.gte) return false;
    }
  }

  if (req.eventsSeen) {
    for (const id of req.eventsSeen) {
      if (!state.seenEvents.has(id)) return false;
    }
  }

  return true;
}

export function getNextEvent(events, state) {
  const eligible = events.filter(e => isEventEligible(e, state));
  return eligible[Math.floor(Math.random() * eligible.length)];
}