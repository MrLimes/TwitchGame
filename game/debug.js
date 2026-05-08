import { state } from "./state.js";
import { checkEndConditions } from "./rules.js";
import { renderState, renderEvent, renderVotes, renderModifiers, log, showGameOver, toggleEffectNumbers } from "../ui/ui.js";

export function rebuildEventSelect(events) {
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

function makeDebugDraggable(el) {
  const STORAGE_KEY = 'debug-panel-pos';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } })();
  if (saved) {
    el.style.left = saved.left + 'px';
    el.style.top = saved.top + 'px';
    el.style.transform = 'none';
  }

  const handle = el.querySelector('summary');
  let dragging = false, didDrag = false;
  let startX, startY, origLeft, origTop;

  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true;
    didDrag = false;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    el.style.transform = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
    if (!didDrag) return;
    el.style.left = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  origLeft + dx)) + 'px';
    el.style.top  = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origTop  + dy)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    if (didDrag) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: el.getBoundingClientRect().left, top: el.getBoundingClientRect().top }));
    }
  });

  handle.addEventListener('click', e => {
    if (didDrag) { e.preventDefault(); didDrag = false; }
  });
}

export function initDebug({ events, modifierDefs, endVotingPhase, startVotingPhase }) {
  const hackEventSelect = document.getElementById("hackEventSelect");
  makeDebugDraggable(document.getElementById("debugPanel"));

  rebuildEventSelect(events);
  document.getElementById("debugPanel").addEventListener("toggle", () => {
    if (document.getElementById("debugPanel").open) rebuildEventSelect(events);
  });

  document.getElementById("hackHappinessBtn").onclick = () => {
    state.stats.happiness = Math.max(0, state.stats.happiness - 10);
    renderState(state);
    log("Debug: happiness decreased by 10.");
    const endReason = checkEndConditions(state);
    if (endReason) { endVotingPhase(); showGameOver(endReason, state); state.gameOver = true; }
  };

  document.getElementById("hackHappinessPlusBtn").onclick = () => {
    state.stats.happiness = Math.min(100, state.stats.happiness + 10);
    renderState(state);
    log("Debug: happiness increased by 10.");
  };

  document.getElementById("hackLoyaltyBtn").onclick = () => {
    state.stats.loyalty = 0;
    renderState(state);
    log("Debug: loyalty set to 0.");
    const endReason = checkEndConditions(state);
    if (endReason) { endVotingPhase(); showGameOver(endReason, state); state.gameOver = true; }
  };

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
    endVotingPhase();
  };

  document.getElementById("hackVotesLandslideBtn").onclick = () => {
    if (state.gameOver) return;
    const majority = Math.random() < 0.5 ? 0 : 1;
    state.votes[majority] += 48;
    state.votes[1 - majority] += 2;
    renderVotes(state.votes);
    endVotingPhase();
  };
}
