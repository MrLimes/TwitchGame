export function isEventEligible(event, state) {
  if (!event.repeatable && state.seenEvents.has(event.id)) return false;

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

  if (req.choicesMade) {
    for (const id of req.choicesMade) {
      if (!state.choicesMade.has(id)) return false;
    }
  }

  return true;
}

export function queueFollowUp(state, eventId) {
  state.followUpQueue.push(eventId);
}

export function resolveNextEvent(events, state) {
  if (state.followUpQueue.length > 0) {
    const id = state.followUpQueue.shift();
    const event = events.find(e => e.id === id);
    if (!event) {
      console.warn(`followUp event "${id}" not found, falling back to normal selection.`);
    } else {
      return event;
    }
  }
  return getNextEvent(events, state);
}

export function getNextEvent(events, state) {
  const eligible = events.filter(e => isEventEligible(e, state));
  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of eligible) {
    roll -= event.weight ?? 1;
    if (roll <= 0) return event;
  }
  return eligible[eligible.length - 1];
}