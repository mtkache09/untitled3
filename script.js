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
        // Сортируем кейсы: сначала стартовый, потом остальные по стоимости
        const sortedCases = cases.sort((a, b) => {
          // Если один из кейсов стартовый - он идет первым
          if (a.name.toLowerCase().includes("стартовый")) return -1
          if (b.name.toLowerCase().includes("стартовый")) return 1
          // Остальные сортируем по стоимости
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

    // Убираем обработчик для кнопки подключения TON кошелька
    // так как теперь используется только TON Connect UI

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
