// Главный файл приложения
import { STATE } from "./config.js"
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
        renderCases(cases, (caseData) => gameManager.openCasePage(caseData))
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

    // Кнопка подключения TON кошелька
    document.getElementById("connectTonWalletBtn")?.addEventListener("click", async () => {
      if (STATE.tonConnectUI && !STATE.walletData) {
        try {
          await STATE.tonConnectUI.connectWallet()
        } catch (error) {
          console.error("Ошибка подключения кошелька:", error)
          showNotification("Ошибка подключения кошелька", "error")
        }
      }
    })

    // Тестирование TON Connect (для отладки)
    if (window.location.search.includes("debug=true")) {
      const testBtn = document.createElement("button")
      testBtn.textContent = "🧪 Тест TON Connect"
      testBtn.className = "fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded z-50"
      testBtn.addEventListener("click", () => this.testTonConnectDebug())
      document.body.appendChild(testBtn)
    }

    // Очистка при закрытии страницы
    window.addEventListener("beforeunload", () => this.cleanup())
  }

  testTonConnectDebug() {
    console.log("🧪 Запуск теста TON Connect...")

    console.log(`📚 TON_CONNECT_UI доступен: ${typeof TON_CONNECT_UI !== "undefined"}`)

    if (typeof TON_CONNECT_UI === "undefined") {
      console.log("❌ TON_CONNECT_UI не загружен")
      return
    }

    console.log("✅ TON_CONNECT_UI загружен")

    const manifestUrl = window.location.origin + "/tonconnect-manifest.json"
    console.log(`📄 Проверяем manifest: ${manifestUrl}`)

    fetch(manifestUrl)
      .then((response) => {
        console.log(`📄 Manifest статус: ${response.status}`)
        if (response.ok) {
          console.log("✅ Manifest доступен")
          return response.json()
        } else {
          console.log("❌ Manifest недоступен")
          throw new Error("Manifest недоступен")
        }
      })
      .then((manifest) => {
        console.log(`📄 Manifest загружен: ${manifest.name}`)

        try {
          const testUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: manifestUrl,
            buttonRootId: "ton-connect-ui",
          })
          console.log("✅ TON Connect UI инициализирован успешно")
        } catch (error) {
          console.log(`❌ Ошибка инициализации: ${error.message}`)
        }
      })
      .catch((error) => {
        console.log(`❌ Ошибка: ${error.message}`)
      })
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
