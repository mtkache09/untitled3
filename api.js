// Модуль для работы с API
import { CONFIG, STATE } from "./config.js"
import { telegramManager } from "./telegram.js"
import { showNotification } from "./ui.js"

export class ApiManager {
  constructor() {
    this.baseUrl = CONFIG.API_BASE
    console.log("🔧 ApiManager инициализирован с URL:", this.baseUrl);
  }

  handleApiError(response, error) {
    console.error("🚨 API Error:", {
      status: response?.status,
      statusText: response?.statusText,
      url: response?.url,
      error: error
    });

    switch (response?.status) {
      case 401:
        showNotification("❌ Ошибка авторизации. Перезапустите приложение в Telegram", "error", 8000)
        console.error("401 Unauthorized:", error)
        if (error?.detail) {
          console.error("Детали ошибки авторизации:", error.detail)
        }
        break
      case 403:
        showNotification("❌ Доступ запрещен", "error", 5000)
        console.error("403 Forbidden:", error)
        break
      case 404:
        showNotification("❌ Ресурс не найден", "error", 5000)
        console.error("404 Not Found:", error)
        break
      case 500:
        showNotification("❌ Ошибка сервера", "error", 5000)
        console.error("500 Internal Server Error:", error)
        break
      case 0:
        showNotification("❌ Нет соединения с сервером. Проверьте интернет", "error", 8000)
        console.error("Network Error: No connection to server")
        break
      default:
        showNotification(`❌ Ошибка: ${error?.detail || "Неизвестная ошибка"}`, "error", 5000)
        console.error("API Error:", response?.status, error)
    }
  }

  async fetchUserFantics() {
    try {
      console.log("🔄 Запрос баланса пользователя...")
      console.log("📍 URL:", `${this.baseUrl}/fantics/${telegramManager.getUserId()}`)

      const userId = telegramManager.getUserId()
      const response = await fetch(`${this.baseUrl}/fantics/${userId}`, {
        headers: telegramManager.getAuthHeaders(),
      })

      console.log("📡 Ответ получен:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json()
        STATE.userFantics = data.fantics || 0
        console.log("✅ Баланс получен:", STATE.userFantics)
        return STATE.userFantics
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        console.error("❌ Ошибка получения баланса:", response.status, errorData)
        this.handleApiError(response, errorData)
        return null
      }
    } catch (error) {
      console.error("❌ Ошибка сети при получении баланса:", error)
      console.error("🔍 Детали ошибки:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      showNotification("❌ Ошибка сети при получении баланса", "error", 5000)
      return null
    }
  }

  async fetchCases() {
    try {
      console.log("🔄 Запрос списка кейсов...")

      const response = await fetch(`${this.baseUrl}/cases`, {
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Кейсы получены:", data)
        return data
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        console.error("❌ Ошибка получения кейсов:", response.status, errorData)
        this.handleApiError(response, errorData)
        return null
      }
    } catch (error) {
      console.error("❌ Ошибка сети при получении кейсов:", error)
      showNotification("❌ Ошибка сети при получении кейсов", "error", 5000)
      return null
    }
  }

  async openCaseAPI(caseId) {
    try {
      console.log("🔄 Открытие кейса:", caseId)

      const response = await fetch(`${this.baseUrl}/open_case/${caseId}`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Кейс открыт:", data)

        // Обновляем баланс пользователя
        STATE.userFantics = (STATE.userFantics || 0) - data.spent + data.gift
        return data
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        console.error("❌ Ошибка открытия кейса:", response.status, errorData)
        this.handleApiError(response, errorData)
        return null
      }
    } catch (error) {
      console.error("❌ Ошибка сети при открытии кейса:", error)
      showNotification("❌ Ошибка сети при открытии кейса", "error", 5000)
      return null
    }
  }

  async addFantics(amount) {
    try {
      console.log("🔄 Добавление фантиков:", amount)

      const userId = telegramManager.getUserId()
      const response = await fetch(`${this.baseUrl}/fantics/add`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, amount }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.fantics !== undefined) {
          STATE.userFantics = data.fantics
        } else {
          STATE.userFantics = (STATE.userFantics || 0) + amount
        }
        console.log("✅ Фантики добавлены:", STATE.userFantics)
        return true
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        console.error("❌ Ошибка добавления фантиков:", response.status, errorData)
        this.handleApiError(response, errorData)
        return false
      }
    } catch (error) {
      console.error("❌ Ошибка сети при добавлении фантиков:", error)
      showNotification("❌ Ошибка сети при добавлении фантиков", "error", 5000)
      return false
    }
  }

  async testConnection() {
    try {
      console.log("🔄 Тестирование соединения с сервером...")
      console.log("📍 URL:", `${this.baseUrl}/cases`)

      // Тестируем через /cases вместо / для проверки соединения
      const response = await fetch(`${this.baseUrl}/cases`, {
        headers: telegramManager.getAuthHeaders(),
      })

      console.log("📡 Ответ тестирования:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url
      });

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Соединение с сервером установлено, получено кейсов:", data.length)
        showNotification("✅ Соединение с сервером установлено", "success", 3000)
        return true
      } else {
        console.error("❌ Ошибка соединения с сервером:", response.status)
        showNotification(`❌ Ошибка соединения: ${response.status}`, "error", 5000)
        return false
      }
    } catch (error) {
      console.error("❌ Ошибка сети при тестировании соединения:", error)
      console.error("🔍 Детали ошибки:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = "Ошибка сети";
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "Нет соединения с сервером";
      } else if (error.name === "AbortError") {
        errorMessage = "Запрос отменен";
      }
      
      showNotification(`❌ ${errorMessage}`, "error", 5000)
      return false
    }
  }

  // Автоматическое тестирование соединения при инициализации
  async autoTestConnection() {
    console.log("🚀 Автоматическое тестирование соединения...");
    setTimeout(async () => {
      await this.testConnection();
    }, 1000);
  }
}

export const apiManager = new ApiManager()

// Автоматически тестируем соединение при загрузке модуля
apiManager.autoTestConnection();
