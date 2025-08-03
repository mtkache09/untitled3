import { telegramManager } from "./telegram.js"
import { apiManager } from "./api.js"
import { tonConnectManager } from "./ton-connect.js"
import { gameManager } from "./game.js"
import { paymentManager } from "./payments.js"
import { showNotification, showConnectionStatus, renderCases, updateFanticsDisplay } from "./ui.js"

class App {
  constructor() {
    this.init()
  }

  async init() {
    try {
      // Показываем предупреждение если нет авторизации
     if (!telegramManager.isAuthAvailable()) {
  showNotification("⚠️ Для полной функциональности откройте в Telegram", "info", 8000)
      }

      // Запускаем тест соединения для отладки
      if (window.location.search.includes("debug=true")) {
        const connectionOk = await apiManager.testConnection()
        showConnectionStatus(
          connectionOk ? "✅ Соединение с сервером установлено" : "❌ Ошибка соединения с сервером",
          !connectionOk,
        )
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
        updateFanticsDisplay()
      }

      // Загружаем кейсы
      const cases = await apiManager.fetchCases()
      if (cases) {
        // Обрабатываем кейсы: добавляем иконки и призы
        const processedCases = cases.map((caseData) => {
          const name = caseData.name.toLowerCase()

          // Определяем иконку в зависимости от названия
         let iconUrl = "images/starter-case-icon.png" // По умолчанию стартовый (убираем слеш)

        if (name.includes("стартовый") || name.includes("starter")) {
  iconUrl = "images/starter-case-icon.png"  // убираем слеш
} else if (name.includes("премиум") || name.includes("premium")) {
  iconUrl = "images/premium-case-icon.png"  // убираем слеш
} else if (name.includes("vip") || name.includes("вип")) {
  iconUrl = "images/vip-case-icon.png"     // убираем слеш
}
          // Создаем призы если их нет
          let possible_prizes = caseData.possible_prizes || []

          if (!possible_prizes.length) {
            // Генерируем призы в зависимости от стоимости кейса
            if (caseData.cost <= 100) {
              // Стартовый кейс
              possible_prizes = [
                { name: "50 фантиков", cost: 50, icon: "💎", chance: 40 },
                { name: "100 фантиков", cost: 100, icon: "💎", chance: 35 },
                { name: "200 фантиков", cost: 200, icon: "💎", chance: 20 },
                { name: "500 фантиков", cost: 500, icon: "💎", chance: 5 },
              ]
            } else if (caseData.cost <= 500) {
              // Премиум кейс
              possible_prizes = [
                { name: "200 фантиков", cost: 200, icon: "💎", chance: 30 },
                { name: "500 фантиков", cost: 500, icon: "💎", chance: 35 },
                { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
                { name: "2500 фантиков", cost: 2500, icon: "💎", chance: 10 },
              ]
            } else {
              // VIP кейс
              possible_prizes = [
                { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
                { name: "2000 фантиков", cost: 2000, icon: "💎", chance: 35 },
                { name: "5000 фантиков", cost: 5000, icon: "💎", chance: 30 },
                { name: "10000 фантиков", cost: 10000, icon: "💎", chance: 10 },
              ]
            }
          }

          return {
            ...caseData,
            iconUrl: iconUrl, // Используем URL изображения
            possible_prizes: possible_prizes,
          }
        })

        // Сортируем кейсы: сначала стартовый, потом остальные по стоимости
        const sortedCases = processedCases.sort((a, b) => {
          if (a.name.toLowerCase().includes("стартовый")) return -1
          if (b.name.toLowerCase().includes("стартовый")) return 1
          return a.cost - b.cost
        })

        renderCases(sortedCases, (caseData) => gameManager.openCasePage(caseData))
      }
    } catch (error) {
      console.error("❌ Ошибка загрузки данных:", error)
      showNotification("❌ Ошибка загрузки данных", "error", 5000)
    }
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
