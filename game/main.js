import { state } from "./state.js";
import { applyEffects, calculateDefiancePenalty, checkEndConditions, tickModifiers, activateModifiers, removeModifiers, getVoteMultiplier, applyTagBoosts } from "./rules.js";
import { renderState, renderEvent, renderVotes, log, showGameOver, renderHistory, resetGameUI, setVotingPhase, updateTimer, renderModifiers, updateKingIndicators, showDiceRoll } from "../ui/ui.js";
import { resolveNextEvent, queueFollowUp } from "./eventManager.js";
import { initDebug, rebuildEventSelect } from "./debug.js";
import { saveLineage, loadLineage, clearLineage, ordinal, stripOrdinal } from "./save.js";

let events = [];
let modifierDefs = [];
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

  const kingNames = ["Neil", "Jonas", "Elias", "Kaka", "Harry", "Richard", "Sergei", "Julian", "Harold", "Geoffrey", "Roland", "Leopold", "Magnus", "Aldric", "Conrad", "Sigurd"];
  const queenNames = ["Eleanor", "Margaret", "Isabella", "Lily", "Vilma", "Adelaide", "Josse", "Astrid", "Beatrice", "Cecily", "Elspeth", "Guinevere", "Hildegard", "Isolde", "Rowena", "Seraphina", "Vivienne"];

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

  document.getElementById("startBtn").onclick = () => beginReign(loadLineage());

  const BRIBE_COST = 50;
  const BRIBE_BOOST = 5;
  function bribe(stat, label) {
    if (state.gameOver || state.stats.treasury < BRIBE_COST) return;
    state.stats.treasury -= BRIBE_COST;
    state.stats[stat] = Math.min(100, state.stats[stat] + BRIBE_BOOST);
    renderState(state);
    log(`The King spends 🪙${BRIBE_COST} to boost ${label} by ${BRIBE_BOOST}.`);
  }
  document.getElementById("bribeHappinessBtn").onclick = () => bribe("happiness", "Happiness");
  document.getElementById("bribeProsperityBtn").onclick = () => bribe("prosperity", "Prosperity");
  document.getElementById("bribeLoyaltyBtn").onclick = () => bribe("loyalty", "Loyalty");

  document.getElementById("restartBtn").onclick = () => {
    clearLineage();
    document.getElementById("heirNotice").style.display = "none";
    document.getElementById("rulerName").value = "";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
  };

  document.getElementById("heirBtn").onclick = () => {
    const lineage = {
      baseName: stripOrdinal(state.rulerName),
      generation: (loadLineage()?.generation ?? 1) + 1,
      treasury: state.stats.treasury,
      permanentModifiers: state.activeModifiers.filter(m => m.duration === null)
    };
    saveLineage(lineage);

    const heirName = `${lineage.baseName} ${ordinal(lineage.generation)}`;
    document.getElementById("rulerName").value = heirName;

    const notice = document.getElementById("heirNotice");
    const modCount = lineage.permanentModifiers.length;
    notice.textContent = `Heir to the throne. Inherits £${lineage.treasury}${modCount > 0 ? ` and ${modCount} permanent effect${modCount > 1 ? "s" : ""}` : ""}.`;
    notice.style.display = "block";

    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("startScreen").style.display = "flex";
  };

  initDebug({ events, modifierDefs, endVotingPhase, startVotingPhase });
});

function beginReign(heirData = null) {
  const name = document.getElementById("rulerName").value.trim() || "Ruler";
  const title = document.querySelector(".gender-option.selected").dataset.value;
  const age = parseInt(document.getElementById("rulerAge").value, 10) || 18;

  state.rulerName = name;
  state.rulerTitle = title;
  state.age = age;
  state.stats.happiness = 50;
  state.stats.prosperity = 50;
  state.stats.loyalty = 50;
  state.stats.treasury = heirData ? heirData.treasury : 150;
  state.votes = [0, 0];
  state.currentEvent = null;
  state.seenEvents = new Set();
  state.choicesMade = new Set();
  state.gameOver = false;
  state.history = [];
  state.followUpQueue = [];
  state.activeModifiers = heirData ? heirData.permanentModifiers.map(m => ({ ...m })) : [];

  document.getElementById("heirNotice").style.display = "none";

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

function scaleEffects(effects, event, voteMultiplier) {
  const boosted = applyTagBoosts(effects, event, state.activeModifiers);
  const scaled = {};
  for (const key in boosted) {
    scaled[key] = key === "treasury" ? boosted[key] : Math.round(boosted[key] * voteMultiplier);
  }
  return scaled;
}

function endVotingPhase() {
  if (!votingActive && votingTimerId === null) return;
  clearInterval(votingTimerId);
  votingTimerId = null;
  votingActive = false;

  if (state.currentEvent) {
    const choices = state.currentEvent.choices;
    updateKingIndicators(
      scaleEffects(choices[0].effects, state.currentEvent, getVoteMultiplier(state.votes, 0)),
      scaleEffects(choices[1].effects, state.currentEvent, getVoteMultiplier(state.votes, 1))
    );
  }

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

  const applyDecision = (rollOutcome = null) => {
    const baseEffects = { ...selected.effects };
    if (rollOutcome && selected.roll) {
      const rollEffects = selected.roll[rollOutcome] ?? {};
      for (const key in rollEffects) {
        baseEffects[key] = (baseEffects[key] ?? 0) + rollEffects[key];
      }
    }
    const boostedEffects = applyTagBoosts(baseEffects, event, state.activeModifiers);
    const appliedEffects = {};
    for (const key in boostedEffects) {
      const isPermanent = key === "treasury";
      appliedEffects[key] = isPermanent
        ? boostedEffects[key]
        : Math.round(boostedEffects[key] * voteMultiplier);
    }
    applyEffects(state.stats, boostedEffects, voteMultiplier);

    if (selected.followUp) queueFollowUp(state, selected.followUp);
    activateModifiers(selected, modifierDefs, state);
    removeModifiers(selected, state);
    renderModifiers(state.activeModifiers);

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
    if (rollOutcome) {
      logMsg += rollOutcome === "success"
        ? " The dice rolled in your favour!"
        : " The dice were unkind.";
    }
    if (penalty > 0) state.stats.loyalty -= penalty;
    log(logMsg);

    state.age++;
    renderState(state);
    renderHistory(state.history);
    rebuildEventSelect(events);

    const endReason = checkEndConditions(state);
    if (endReason) {
      showGameOver(endReason, state);
      state.gameOver = true;
      return;
    }

    setTimeout(startRound, 1000);
  };

  if (selected.roll) {
    showDiceRoll(selected.roll.chance, applyDecision);
  } else {
    applyDecision(null);
  }
}