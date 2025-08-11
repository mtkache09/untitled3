// Конфигурация приложения
export const CONFIG = {
  API_BASE: (() => {
    const hostname = window.location.hostname;
    console.log("🔍 Текущий hostname:", hostname);
    
    if (hostname === "mtkache09.github.io") {
      const apiUrl = "https://p01--telegrambackend--29cdb8b4bnhv.code.run";
      console.log("🌐 Используем продакшен API:", apiUrl);
      return apiUrl;
    } else {
      const localUrl = "http://localhost:8000";
      console.log("🏠 Используем локальный API:", localUrl);
      return localUrl;
    }
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

// Отладочная информация при загрузке
console.log("🚀 Конфигурация загружена:");
console.log("📍 API_BASE:", CONFIG.API_BASE);
console.log("🌍 Hostname:", window.location.hostname);
console.log("🔗 Полный URL:", window.location.href);

export default { CONFIG, STATE }
