import { state } from "./state.js";
import { applyEffects, calculateDefiancePenalty, checkEndConditions, tickModifiers, activateModifiers, getVoteMultiplier } from "./rules.js";
import { renderState, renderEvent, renderVotes, log, showGameOver, renderHistory, resetGameUI, setVotingPhase, updateTimer, renderModifiers, toggleEffectNumbers } from "../ui/ui.js";
import { resolveNextEvent, queueFollowUp } from "./eventManager.js";

let events = [];
let modifierDefs = [];

function rebuildEventSelect() {
  const hackEventSelect = document.getElementById("hackEventSelect");
  if (!hackEventSelect) return;
  const current = hackEventSelect.value;
  hackEventSelect.innerHTML = "";
  events.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = state.seenEvents.has(e.id) ? `${e.name} ✓` : e.name;
    hackEventSelect.appendChild(opt);
  });
  hackEventSelect.value = current || events[0]?.id;
}
let votingActive = false;
let votingTimerId = null;
let votingTimeLeft = 30;

document.addEventListener("DOMContentLoaded", async () => {
  const [eventsRes, modifiersRes] = await Promise.all([
    fetch("./data/events.json"),
    fetch("./data/modifiers.json")
  ]);
  events = await eventsRes.json();
  modifierDefs = await modifiersRes.json();

  window.voteCardClick = (choice) => vote(choice);
  window.decideCardClick = (choice) => decide(choice);

  const kingNames = ["Edward", "Henry", "Richard", "William", "Arthur", "Edmund", "Alfred", "Emil", "Harold", "Geoffrey", "Roland", "Leopold", "Magnus", "Aldric", "Conrad", "Sigurd"];
  const queenNames = ["Eleanor", "Margaret", "Isabella", "Catherine", "Matilda", "Adelaide", "Josse", "Astrid", "Beatrice", "Cecily", "Elspeth", "Guinevere", "Hildegard", "Isolde", "Rowena", "Seraphina", "Vivienne"];

  document.getElementById("randomNameBtn").onclick = () => {
    const title = document.querySelector(".gender-option.selected")?.dataset.value ?? "King";
    const pool = title === "Queen" ? queenNames : kingNames;
    document.getElementById("rulerName").value = pool[Math.floor(Math.random() * pool.length)];
  };

  // Gender picker
  document.querySelectorAll(".gender-option").forEach(el => {
    el.onclick = () => {
      document.querySelectorAll(".gender-option").forEach(o => o.classList.remove("selected"));
      el.classList.add("selected");
    };
  });

  document.getElementById("startBtn").onclick = () => beginReign();

  document.getElementById("restartBtn").onclick = () => {
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
  };

  document.getElementById("hackHappinessBtn").onclick = () => {
    state.stats.happiness = Math.max(0, state.stats.happiness - 10);
    renderState(state);
    log("Debug: happiness decreased by 10.");
    const endReason = checkEndConditions(state);
    if (endReason) { endVotingPhase(); showGameOver(endReason, state); state.gameOver = true; }
  };

  document.getElementById("hackLoyaltyBtn").onclick = () => {
    state.stats.loyalty = 0;
    renderState(state);
    log("Debug: loyalty set to 0.");
    const endReason = checkEndConditions(state);
    if (endReason) { endVotingPhase(); showGameOver(endReason, state); state.gameOver = true; }
  };

  const hackEventSelect = document.getElementById("hackEventSelect");

  rebuildEventSelect();
  document.getElementById("debugPanel").addEventListener("toggle", () => {
    if (document.getElementById("debugPanel").open) rebuildEventSelect();
  });

  document.getElementById("hackEffectNumbersBtn").onclick = () => {
    const on = toggleEffectNumbers();
    document.getElementById("hackEffectNumbersBtn").textContent = on ? "Hide effect numbers" : "Show effect numbers";
    if (state.currentEvent) renderEvent(state.currentEvent);
  };

  document.getElementById("hackAddModifierBtn").onclick = () => {
    if (!modifierDefs.length) return;
    const def = modifierDefs[Math.floor(Math.random() * modifierDefs.length)];
    state.activeModifiers.push({ ...def });
    renderModifiers(state.activeModifiers);
    log(`Debug: added modifier "${def.label}".`);
  };

  document.getElementById("hackClearModifiersBtn").onclick = () => {
    state.activeModifiers = [];
    renderModifiers(state.activeModifiers);
    log("Debug: all modifiers cleared.");
  };

  document.getElementById("hackEventBtn").onclick = () => {
    if (state.gameOver) return;
    const selected = events.find(e => e.id === hackEventSelect.value);
    if (!selected) return;
    endVotingPhase();
    state.votes = [0, 0];
    state.currentEvent = selected;
    renderEvent(selected);
    renderVotes(state.votes);
    renderState(state);
    log(`Debug: forced event "${selected.name}".`);
    startVotingPhase();
  };

  document.getElementById("hackVotesBtn").onclick = () => {
    if (state.gameOver) return;
    const a = Math.floor(Math.random() * 51);
    state.votes[0] += a;
    state.votes[1] += (50 - a);
    renderVotes(state.votes);
    if (votingActive) endVotingPhase();
  };

});

function beginReign() {
  const name = document.getElementById("rulerName").value.trim() || "Ruler";
  const title = document.querySelector(".gender-option.selected").dataset.value;
  const age = parseInt(document.getElementById("rulerAge").value, 10) || 18;

  state.rulerName = name;
  state.rulerTitle = title;
  state.age = age;
  state.stats.happiness = 50;
  state.stats.prosperity = 50;
  state.stats.loyalty = 50;
  state.stats.treasury = 150;
  state.votes = [0, 0];
  state.currentEvent = null;
  state.seenEvents = new Set();
  state.choicesMade = new Set();
  state.gameOver = false;
  state.history = [];
  state.followUpQueue = [];
  state.activeModifiers = [];

  clearInterval(votingTimerId);
  votingTimerId = null;
  votingActive = false;
  updateTimer(0);

  document.getElementById("startScreen").style.display = "none";
  document.getElementById("rulerHeading").textContent = `${title} ${name}`;
  resetGameUI();
  startRound();
}

function startRound() {
  if (state.gameOver) return;

  state.votes = [0, 0];

  tickModifiers(state);
  renderModifiers(state.activeModifiers);
  renderState(state);

  state.currentEvent = resolveNextEvent(events, state);

  if (!state.currentEvent) {
    log("No more events available.");
    return;
  }

  renderEvent(state.currentEvent);
  renderVotes(state.votes);
  renderHistory(state.history);
  startVotingPhase();
}

function startVotingPhase() {
  votingActive = true;
  votingTimeLeft = 30;
  setVotingPhase(true, state.votes);
  updateTimer(votingTimeLeft);

  votingTimerId = setInterval(() => {
    votingTimeLeft--;
    updateTimer(votingTimeLeft);
    if (votingTimeLeft <= 0) endVotingPhase();
  }, 1000);
}

function endVotingPhase() {
  if (!votingActive && votingTimerId === null) return;
  clearInterval(votingTimerId);
  votingTimerId = null;
  votingActive = false;
  setVotingPhase(false, state.votes);
  updateTimer(0);
  log("Voting closed. The King must decide.");
}

function vote(choice) {
  if (!votingActive) return;
  state.votes[choice]++;
  renderVotes(state.votes);
}

function decide(choice) {
  if (state.gameOver || votingActive) return;

  const event = state.currentEvent;
  const selected = event.choices[choice];

  state.seenEvents.add(event.id);
  state.choicesMade.add(selected.id);
  const voteMultiplier = getVoteMultiplier(state.votes, choice);

  // Build the actual applied effects (with vote multiplier)
  const appliedEffects = {};
  for (const key in selected.effects) {
    const isPermanent = key === "treasury";
    appliedEffects[key] = isPermanent
      ? selected.effects[key]
      : Math.round(selected.effects[key] * voteMultiplier);
  }
  applyEffects(state.stats, selected.effects, voteMultiplier);

  if (selected.followUp) queueFollowUp(state, selected.followUp);
  activateModifiers(selected, modifierDefs, state);
  renderModifiers(state.activeModifiers);

  // Record history entry — snapshot all active modifiers with current durations
  state.history.push({
    age: state.age,
    eventName: event.name,
    eventText: event.text,
    choiceLabel: selected.label,
    effects: appliedEffects,
    modifiers: state.activeModifiers.map(m => ({ ...m }))
  });

  const penalty = calculateDefiancePenalty(state.votes, choice);
  const total = state.votes[0] + state.votes[1];
  const share = total > 0 ? Math.round(state.votes[choice] / total * 100) : 50;
  let logMsg = penalty > 0
    ? `You defied the people. Loyalty -${penalty}`
    : "You ruled in accordance with the people.";
  if (voteMultiplier !== 1) {
    const pct = voteMultiplier > 1
      ? `+${Math.round((voteMultiplier - 1) * 100)}%`
      : `-${Math.round((1 - voteMultiplier) * 100)}%`;
    logMsg += ` The people's will (${share}% support) ${voteMultiplier > 1 ? "boosted" : "reduced"} effects by ${pct}.`;
  }
  if (penalty > 0) state.stats.loyalty -= penalty;
  log(logMsg);

  state.age++;
  renderState(state);
  renderHistory(state.history);
  rebuildEventSelect();

  const endReason = checkEndConditions(state);
  if (endReason) {
    showGameOver(endReason, state);
    state.gameOver = true;
    return;
  }

  setTimeout(startRound, 1000);
}