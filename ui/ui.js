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
}

function getEffectIndicators(effects) {
  const indicators = [];
  
  if (effects.happiness > 0) indicators.push("↑😊");
  if (effects.happiness < 0) indicators.push("↓😔");
  
  if (effects.prosperity > 0) indicators.push("↑💰");
  if (effects.prosperity < 0) indicators.push("↓📉");
  
  if (effects.loyalty > 0) indicators.push("↑👑");
  if (effects.loyalty < 0) indicators.push("↓💔");
  
  if (effects.treasury > 0) indicators.push("↑💷");
  if (effects.treasury < 0) indicators.push("↓💷");

  return indicators;
}

export function renderEvent(event) {
  document.getElementById("eventName").textContent = event.name;
  document.getElementById("eventText").textContent = event.text;

  const choiceA = event.choices[0];
  const choiceB = event.choices[1];
  
  const indicatorsA = getEffectIndicators(choiceA.effects);
  const indicatorsB = getEffectIndicators(choiceB.effects);

  // Vote cards
  document.getElementById("voteA-title").textContent = choiceA.label;
  document.getElementById("voteA-indicators").textContent = indicatorsA.join(" ");
  
  document.getElementById("voteB-title").textContent = choiceB.label;
  document.getElementById("voteB-indicators").textContent = indicatorsB.join(" ");

  // King cards
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
    historyContainer.innerHTML = "<p style='color: #999;'>No decisions yet...</p>";
    return;
  }

  history.forEach((entry, index) => {
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
      </div>
    `;
    historyContainer.appendChild(historyItem);
  });
}

export function showGameOver(reason, state) {
  document.getElementById("gameOverText").textContent = reason;
  document.getElementById("finalTreasury").textContent = state.stats.treasury;

  document.querySelectorAll(".card-button, #hackHappinessBtn").forEach((btn) => {
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.5";
  });

  document.getElementById("gameOverScreen").style.display = "flex";
}

export function resetGameUI() {
  document.querySelectorAll(".card-button, #hackHappinessBtn").forEach((btn) => {
    btn.style.pointerEvents = "auto";
    btn.style.opacity = "1";
  });

  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("gameOverText").textContent = "";
}

``