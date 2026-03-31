export const state = {
  rulerName: "Ruler",
  rulerTitle: "King",
  age: 18,
  stats: {
    happiness: 50,
    prosperity: 50,
    loyalty: 50,
    treasury: 150
  },
  votes: [0, 0],
  currentEvent: null,
  seenEvents: new Set(),
  choicesMade: new Set(),
  gameOver: false,
  history: [],
  followUpQueue: [],
  activeModifiers: []
};
``