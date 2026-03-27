import { state } from "./state.js";
import { applyEffects, calculateDefiancePenalty, checkEndConditions } from "./rules.js";
import { renderState, renderEvent, renderVotes, log, showGameOver, renderHistory, resetGameUI } from "../ui/ui.js";
import { getNextEvent } from "./eventManager.js";

let events = [];

document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("./data/events.json");
  events = await res.json();

  window.voteCardClick = (choice) => vote(choice);
  window.decideCardClick = (choice) => decide(choice);
  document.getElementById("restartBtn").onclick = () => {
    state.age = 30;
    state.stats.happiness = 50;
    state.stats.prosperity = 50;
    state.stats.loyalty = 50;
    state.stats.treasury = 1000;
    state.votes = [0, 0];
    state.currentEvent = null;
    state.seenEvents = new Set();
    state.unlockedEvents = new Set();
    state.gameOver = false;
    state.history = [];

    resetGameUI();
    startRound();
  };

  document.getElementById("hackHappinessBtn").onclick = () => {
    state.stats.happiness = Math.max(0, state.stats.happiness - 10);
    renderState(state);
    log("Debug: happiness decreased by 10.");
    const endReason = checkEndConditions(state);
    if (endReason) {
      showGameOver(endReason, state);
      state.gameOver = true;
      return;
    }
  };

  startRound();
});

function startRound() {
  if (state.gameOver) return;

  state.votes = [0, 0];
  state.currentEvent = getNextEvent(events, state);

  renderEvent(state.currentEvent);
  renderVotes(state.votes);
  renderState(state);
  renderHistory(state.history);
  log("A new event begins.");
}

function vote(choice) {
  state.votes[choice]++;
  renderVotes(state.votes);
}

function decide(choice) {
  if (state.gameOver) return;

  const event = state.currentEvent;
  const selected = event.choices[choice];

  state.seenEvents.add(event.id);
  applyEffects(state.stats, selected.effects);

  // Record history entry
  state.history.push({
    age: state.age,
    eventName: event.name,
    eventText: event.text,
    choiceLabel: selected.label,
    effects: selected.effects
  });

  const penalty = calculateDefiancePenalty(state.votes, choice);
  if (penalty > 0) {
    state.stats.loyalty -= penalty;
    log(`You defied the people. Loyalty -${penalty}`);
  } else {
    log("You ruled in accordance with the people.");
  }

  state.age++;
  renderState(state);
  renderHistory(state.history);

  const endReason = checkEndConditions(state);
  if (endReason) {
    showGameOver(endReason, state);
    state.gameOver = true;
    return;
  }

  setTimeout(startRound, 1000);
}