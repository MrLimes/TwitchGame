export function renderState(state) {
  document.getElementById("age").textContent = state.age;
  document.getElementById("treasury-value").textContent = state.stats.treasury;

  for (const key in state.stats) {
    if (key === "treasury") continue;

    const elem = document.getElementById(key);
    const value = document.getElementById(`${key}-value`);
    if (!elem || !value) continue;

    elem.style.width = state.stats[key] + "%";
    value.textContent = state.stats[key];
  }

  const canAfford = state.stats.treasury >= 50;
  document.querySelectorAll(".bribe-btn").forEach(btn => { btn.disabled = !canAfford; });
}

let showEffectNumbers = false;

export function toggleEffectNumbers() {
  showEffectNumbers = !showEffectNumbers;
  return showEffectNumbers;
}

function fmt(val) {
  return val > 0 ? `(+${val})` : `(${val})`;
}

function getEffectIndicators(effects, choice = null) {
  const indicators = [];

  if (effects.happiness > 0) indicators.push(showEffectNumbers ? `↑😊${fmt(effects.happiness)}` : "↑😊");
  if (effects.happiness < 0) indicators.push(showEffectNumbers ? `↓😔${fmt(effects.happiness)}` : "↓😔");

  if (effects.prosperity > 0) indicators.push(showEffectNumbers ? `↑💰${fmt(effects.prosperity)}` : "↑💰");
  if (effects.prosperity < 0) indicators.push(showEffectNumbers ? `↓📉${fmt(effects.prosperity)}` : "↓📉");

  if (effects.loyalty > 0) indicators.push(showEffectNumbers ? `↑👑${fmt(effects.loyalty)}` : "↑👑");
  if (effects.loyalty < 0) indicators.push(showEffectNumbers ? `↓💔${fmt(effects.loyalty)}` : "↓💔");

  if (effects.treasury > 0) indicators.push(showEffectNumbers ? `↑💷${fmt(effects.treasury)}` : "↑💷");
  if (effects.treasury < 0) indicators.push(showEffectNumbers ? `↓💷${fmt(effects.treasury)}` : "↓💷");

  if (showEffectNumbers && choice) {
    choice.applyModifiers?.forEach(m => indicators.push(`+⚙️${m.replace(/_/g, ' ')}`));
    choice.removeModifiers?.forEach(m => indicators.push(`-⚙️${m.replace(/_/g, ' ')}`));
  }

  return indicators;
}

export function updateKingIndicators(effectsA, effectsB, choiceA = null, choiceB = null) {
  document.getElementById("kingA-indicators").textContent = getEffectIndicators(effectsA, choiceA).join(" ");
  document.getElementById("kingB-indicators").textContent = getEffectIndicators(effectsB, choiceB).join(" ");
}

export function renderEvent(event) {
  document.getElementById("eventName").textContent = event.name;
  document.getElementById("eventText").textContent = event.text;

  const imageEl = document.getElementById("eventCardImage");
  if (event.image && (event.image.startsWith("http") || event.image.startsWith("/"))) {
    imageEl.innerHTML = `<img src="${event.image}" alt="${event.name}" />`;
  } else {
    imageEl.textContent = event.image ?? "🏰";
  }

  const choiceA = event.choices[0];
  const choiceB = event.choices[1];

  const indicatorsA = getEffectIndicators(choiceA.effects, choiceA);
  const indicatorsB = getEffectIndicators(choiceB.effects, choiceB);

  document.getElementById("voteA-title").textContent = choiceA.label;
  document.getElementById("voteA-indicators").textContent = indicatorsA.join(" ");
  document.getElementById("voteB-title").textContent = choiceB.label;
  document.getElementById("voteB-indicators").textContent = indicatorsB.join(" ");

  document.getElementById("kingA-title").textContent = choiceA.label;
  document.getElementById("kingA-indicators").textContent = indicatorsA.join(" ");
  document.getElementById("kingB-title").textContent = choiceB.label;
  document.getElementById("kingB-indicators").textContent = indicatorsB.join(" ");
}

export function renderVotes(votes) {
  document.getElementById("votesA").textContent = votes[0];
  document.getElementById("votesB").textContent = votes[1];
}

export function log(text) {
  document.getElementById("log").textContent = text;
}

export function renderHistory(history) {
  const historyContainer = document.getElementById("history");
  historyContainer.innerHTML = "";

  if (history.length === 0) {
    historyContainer.innerHTML = "<p style='color: #8b6540; font-size: 0.85em; text-align: center;'>No decisions yet...</p>";
    return;
  }

  [...history].reverse().forEach((entry) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    
    const effectsText = Object.entries(entry.effects)
      .map(([key, value]) => `${key}: ${value > 0 ? '+' : ''}${value}`)
      .join(", ");

    historyItem.innerHTML = `
      <div class="history-entry">
        <div class="history-header">
          <span class="history-age">Age ${entry.age}</span>
          <span class="history-event">${entry.eventName}</span>
        </div>
        <div class="history-choice">→ ${entry.choiceLabel}</div>
        <div class="history-effects">${effectsText}</div>
        ${entry.modifiers && entry.modifiers.length > 0 ? `<div class="history-modifiers">${entry.modifiers.map(m => {
          const dur = m.duration === null ? "permanent" : `${m.duration} rounds`;
          const effect = m.type === "tag_boost"
            ? `${m.tags.join("/")} treasury +${Math.round(m.percent * 100)}%`
            : `${m.stat} ${m.amount > 0 ? "+" : ""}${m.amount}`;
          return `${m.icon} ${m.label}: ${effect} (${dur})`;
        }).join(" · ")}</div>` : ""}
      </div>
    `;
    historyContainer.appendChild(historyItem);
  });
}

export function showGameOver(reason, state) {
  document.getElementById("gameOverText").textContent = `${state.rulerTitle} ${state.rulerName} — ${reason}`;
  document.getElementById("finalTreasury").textContent = state.stats.treasury;
  document.getElementById("finalHappiness").textContent = state.stats.happiness;
  document.getElementById("finalProsperity").textContent = state.stats.prosperity;
  document.getElementById("finalLoyalty").textContent = state.stats.loyalty;

  document.querySelectorAll(".card-button, #hackHappinessBtn, #hackLoyaltyBtn, .bribe-btn").forEach((btn) => {
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.5";
  });

  document.getElementById("heirBtn").style.display = "block";
  document.getElementById("gameOverScreen").style.display = "flex";
}

export function renderModifiers(activeModifiers) {
  const section = document.getElementById("activeModifiersSection");
  const container = document.getElementById("activeModifiers");

  if (!activeModifiers || activeModifiers.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  container.innerHTML = activeModifiers.map(m => {
    const dur = m.duration === null ? "permanent" : `${m.duration} round${m.duration === 1 ? "" : "s"} left`;
    let effect;
    if (m.type === "tag_boost") {
      effect = `${m.tags.join("/")} treasury +${Math.round(m.percent * 100)}%`;
    } else {
      const sign = m.amount > 0 ? "+" : "";
      effect = `${m.stat} ${sign}${m.amount}`;
    }
    return `<span class="modifier-tag">${m.icon} ${m.label}: ${effect} (${dur})</span>`;
  }).join("");
}

export function updateTimer(seconds) {
  const el = document.getElementById("voteTimer");
  if (seconds > 0) {
    el.textContent = `⏳ ${seconds}s`;
    el.style.color = seconds <= 5 ? "#ff5722" : "#ffd700";
  } else {
    el.textContent = "";
  }
}

export function setVotingPhase(active, votes) {
  const voteCardA = document.getElementById("voteCardA");
  const voteCardB = document.getElementById("voteCardB");
  const kingCardA = document.getElementById("kingCardA");
  const kingCardB = document.getElementById("kingCardB");
  const kingSection = document.getElementById("kingSection");

  voteCardA.style.pointerEvents = active ? "auto" : "none";
  voteCardB.style.pointerEvents = active ? "auto" : "none";
  voteCardA.style.opacity = active ? "1" : "0.5";
  voteCardB.style.opacity = active ? "1" : "0.5";

  kingSection.style.opacity = active ? "0.3" : "1";
  kingCardA.style.pointerEvents = active ? "none" : "auto";
  kingCardB.style.pointerEvents = active ? "none" : "auto";

  if (!active) {
    const total = votes[0] + votes[1];
    const pctA = total > 0 ? Math.round(votes[0] / total * 100) : 50;
    const pctB = 100 - pctA;

    document.getElementById("voteA-indicators").textContent = `👥 ${pctA}%`;
    document.getElementById("voteB-indicators").textContent = `👥 ${pctB}%`;

    const effectsA = document.getElementById("kingA-indicators").textContent;
    const effectsB = document.getElementById("kingB-indicators").textContent;
    document.getElementById("kingA-indicators").textContent = `👥 ${pctA}%  ${effectsA}`;
    document.getElementById("kingB-indicators").textContent = `👥 ${pctB}%  ${effectsB}`;
  }
}

export function resetGameUI() {
  document.querySelectorAll(".card-button, #hackHappinessBtn, #hackLoyaltyBtn, .bribe-btn").forEach((btn) => {
    btn.style.pointerEvents = "auto";
    btn.style.opacity = "1";
  });

  renderModifiers([]);
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("gameOverText").textContent = "";
}

export function showDiceRoll(chance, onComplete) {
  const overlay   = document.getElementById("diceOverlay");
  const face      = document.getElementById("diceFace");
  const numEl     = document.getElementById("diceNumber");
  const outcomeEl = document.getElementById("diceOutcomeLabel");
  const threshEl  = document.getElementById("diceThresholdLabel");

  // d20 threshold (5% increments, clamped so 2-19 are normal range)
  const need = Math.max(2, Math.min(19, Math.round((1 - chance) * 20) + 1));

  // Roll the die — 1 always fails, 20 always succeeds, else compare to threshold
  const rolled = Math.ceil(Math.random() * 20);
  const outcome = rolled === 20 ? "success"
    : rolled === 1  ? "failure"
    : rolled >= need ? "success" : "failure";

  threshEl.textContent = `Need ${need}+ to succeed (1 always fails, 20 always succeeds)`;
  outcomeEl.textContent = "";
  outcomeEl.style.color = "";
  numEl.textContent = "?";
  face.className = "dice-face rolling";
  overlay.style.display = "flex";

  let elapsed = 0;
  const interval = setInterval(() => {
    numEl.textContent = Math.ceil(Math.random() * 20);
    elapsed += 60;
    if (elapsed >= 1500) {
      clearInterval(interval);
      numEl.textContent = rolled;
      face.className = `dice-face ${outcome}`;
      outcomeEl.textContent = outcome === "success" ? "✓ Success!" : "✗ Failure!";
      outcomeEl.style.color = outcome === "success" ? "#4caf50" : "#f44336";
    }
  }, 60);

  let dismissed = false;
  const dismiss = () => {
    if (elapsed < 1500 || dismissed) return;
    dismissed = true;
    overlay.style.display = "none";
    overlay.removeEventListener("click", dismiss);
    onComplete(outcome);
  };

  setTimeout(() => overlay.addEventListener("click", dismiss), 1600);
  setTimeout(() => dismiss(), 3500);
}

``