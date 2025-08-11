// Конфигурация приложения
export const CONFIG = {
  API_BASE: (() => {
    if (window.location.hostname === "mtkache09.github.io") {
      return "https://telegramcases.onrender.com"
    }
    return "http://localhost:8000"
  })(),

  ANIMATION: {
    SPIN_DURATION: 6000,
    PRIZE_WIDTH: 144,
    NOTIFICATION_DURATION: 3000,
  },

  DEPOSIT_AMOUNTS: [10, 50, 100, 500, 1000, 5000],

  RATE_LIMITS: {
    MAX_CASES_PER_MINUTE: 10,
  },
}

// Глобальное состояние приложения
export const STATE = {
  tonConnectUI: null,
  walletData: null,
  currentCase: null,
  isSpinning: false,
  userFantics: 0,
  selectedDepositAmount: null,
  selectedWithdrawalAmount: null,
  topupPayload: null,
  currentPaymentId: null,
}

export default { CONFIG, STATE }
