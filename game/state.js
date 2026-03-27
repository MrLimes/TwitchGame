export const state = {
  age: 30,
  stats: {
    happiness: 50,
    prosperity: 50,
    loyalty: 50,
    treasury: 1000
  },
  votes: [0, 0],
  currentEvent: null,
  seenEvents: new Set(),
  unlockedEvents: new Set(),
  gameOver: false,
  history: []
};
``