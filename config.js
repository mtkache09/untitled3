// Конфигурация приложения
export const CONFIG = {
  API_BASE: (() => {
    if (window.location.hostname === "mtkache09.github.io") {
      return "https://telegramcases-production.up.railway.app"
    }
    return "http://localhost:8000"
  })(),

  ANIMATION: {
    SPIN_DURATION: 8000, // 8 секунд медленной прокрутки
    PRIZE_WIDTH: 144, // 128px + 16px gap
    NOTIFICATION_DURATION: 3000,
  },

  TOPUP: {
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 100000,
    DEFAULT_AMOUNT: 10,
  },

  RATE_LIMITS: {
    MAX_CASES_PER_MINUTE: 10,
  },

  TON: {
    TESTNET: true,
    TRANSACTION_TIMEOUT: 600, // 10 minutes
  },
}

// Глобальное состояние приложения
export const STATE = {
  tonConnectUI: null,
  walletData: null,
  currentCase: null,
  isSpinning: false,
  userFantics: 0,
  topupPayload: null,
}

export default { CONFIG, STATE }
