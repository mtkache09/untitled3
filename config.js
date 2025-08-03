// config.js
export const CONFIG = {
  ANIMATION: {
    SPIN_DURATION: 3000,
    NOTIFICATION_DURATION: 3000,
    PRIZE_WIDTH: 144, // 128px + 16px gap (w-32 + gap-4)
    EASING: {
      EASE_OUT_CUBIC: (t) => 1 - Math.pow(1 - t, 3),
      EASE_IN_OUT_QUART: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
    },
  },
  API: {
    BASE_URL: "http://localhost:8000",
    TIMEOUT: 10000,
  },
  GAME: {
    MIN_SPIN_ROUNDS: 3,
    MAX_SPIN_ROUNDS: 5,
  },
}

export const STATE = {
  userFantics: 0,
  currentCase: null,
  isSpinning: false,
  isConnected: false,
  lastOpenedCase: null,
}
