// Исправленный главный файл приложения (адаптированный под серверный API)
import { telegramManager } from "./telegram.js"
import { apiManager } from "./api.js"
import { tonConnectManager } from "./ton-connect.js"
import { gameManager } from "./game.js"
import { paymentManager } from "./payments.js"
import { showNotification, showConnectionStatus, renderCases, updateFanticsDisplay } from "./ui.js"
import { STATE } from "./config.js"

class App {
  constructor() {
    this.init()
  }

  async init() {
    try {
      // Показываем предупреждение если нет авторизации
      if (!telegramManager.isAuthAvailable()) {
        showNotification("⚠️ Для полной функциональности откройте в Telegram", "info", 8000)
      } else {
        showNotification("✅ Приложение загружено", "success", 2000)
      }

      // Запускаем тест соединения для отладки
      if (window.location.search.includes("debug=true")) {
        const connectionOk = await apiManager.testConnection()
        showConnectionStatus(
          connectionOk ? "✅ Соединение с сервером установлено" : "❌ Ошибка соединения с сервером",
          !connectionOk,
        )
        STATE.isConnected = connectionOk
      }

      // Инициализируем TON Connect
      await tonConnectManager.init()

      // Загружаем данные
      await this.loadInitialData()

      // Настраиваем обработчики событий
      this.setupEventListeners()

      console.log("✅ Приложение успешно инициализировано")
    } catch (error) {
      console.error("❌ Ошибка инициализации приложения:", error)
      showNotification("❌ Ошибка инициализации приложения", "error", 5000)
    }
  }

  async loadInitialData() {
    try {
      // Загружаем баланс пользователя
      const fantics = await apiManager.fetchUserFantics()
      if (fantics !== null) {
        STATE.userFantics = fantics
        updateFanticsDisplay()
      }

      // Загружаем кейсы
      const cases = await apiManager.fetchCases()
      if (cases) {
        const processedCases = this.processCasesData(cases)
        const sortedCases = this.sortCases(processedCases)
        renderCases(sortedCases, (caseData) => gameManager.openCasePage(caseData))
      }
    } catch (error) {
      console.error("❌ Ошибка загрузки данных:", error)
      showNotification("❌ Ошибка загрузки данных", "error", 5000)
    }
  }

  processCasesData(cases) {
    return cases.map((caseData) => {
      const name = caseData.name.toLowerCase()

      // Определяем иконку в зависимости от названия
      let icon = "⭐"

      if (name.includes("стартовый")) {
        icon = "🟢"
      } else if (name.includes("премиум")) {
        icon = "🟡"
      } else if (name.includes("vip") || name.includes("вип")) {
        icon = "🔴"
      }

      // Адаптируемся под серверный формат
      let possible_prizes = []

      // Если есть presents с сервера (основной формат), конвертируем их
      if (caseData.presents && caseData.presents.length) {
        possible_prizes = caseData.presents.map((present) => ({
          name: `${present.cost} фантиков`,
          cost: present.cost,
          icon: "💎",
          probability: present.probability || 10,
          chance: present.probability || 10,
        }))
      }
      // Если уже есть possible_prizes, используем их
      else if (caseData.possible_prizes && caseData.possible_prizes.length) {
        possible_prizes = caseData.possible_prizes
      }
      // Если ничего нет, генерируем базовые призы
      else {
        possible_prizes = this.generateDefaultPrizes(caseData.cost)
      }

      return {
        ...caseData,
        icon: icon,
        possible_prizes: possible_prizes,
      }
    })
  }

  generateDefaultPrizes(caseCost) {
    if (caseCost <= 100) {
      // Стартовый кейс
      return [
        { name: "50 фантиков", cost: 50, icon: "💎", chance: 40 },
        { name: "100 фантиков", cost: 100, icon: "💎", chance: 35 },
        { name: "200 фантиков", cost: 200, icon: "💎", chance: 20 },
        { name: "500 фантиков", cost: 500, icon: "💎", chance: 5 },
      ]
    } else if (caseCost <= 500) {
      // Премиум кейс
      return [
        { name: "200 фантиков", cost: 200, icon: "💎", chance: 30 },
        { name: "500 фантиков", cost: 500, icon: "💎", chance: 35 },
        { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
        { name: "2500 фантиков", cost: 2500, icon: "💎", chance: 10 },
      ]
    } else {
      // VIP кейс
      return [
        { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
        { name: "2000 фантиков", cost: 2000, icon: "💎", chance: 35 },
        { name: "5000 фантиков", cost: 5000, icon: "💎", chance: 30 },
        { name: "10000 фантиков", cost: 10000, icon: "💎", chance: 10 },
      ]
    }
  }

  sortCases(cases) {
    return cases.sort((a, b) => {
      if (a.name.toLowerCase().includes("стартовый")) return -1
      if (b.name.toLowerCase().includes("стартовый")) return 1
      return a.cost - b.cost
    })
  }

  setupEventListeners() {
    // Кнопка пополнения
    document.getElementById("depositBtn")?.addEventListener("click", () => {
      console.log("🔄 Открытие Topup Modal вместо Deposit Modal")
      paymentManager.openTopupModal()
    })

    // Кнопка топапа
    document.getElementById("topupBtn")?.addEventListener("click", () => {
      paymentManager.openTopupModal()
    })

    // Обновление баланса по клику
    document.querySelectorAll("#userStars, #userStarsCase").forEach((element) => {
      element?.addEventListener("click", async () => {
        try {
          const fantics = await apiManager.fetchUserFantics()
          if (fantics !== null) {
            STATE.userFantics = fantics
            updateFanticsDisplay()
            showNotification("💎 Баланс обновлен", "success", 1000)
          }
        } catch (error) {
          console.error("Ошибка обновления баланса:", error)
          showNotification("❌ Ошибка обновления баланса", "error", 2000)
        }
      })
    })

    // Очистка при закрытии страницы
    window.addEventListener("beforeunload", () => this.cleanup())
  }

  cleanup() {
    // Очистка ресурсов при необходимости
    console.log("🧹 Очистка ресурсов приложения")
  }
}

// Запуск приложения
document.addEventListener("DOMContentLoaded", () => {
  new App()
})

// Экспорт для глобального доступа (если нужно)
window.App = App
