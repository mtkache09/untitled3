// Модуль для работы с API
import { CONFIG, STATE } from "./config.js"
import { telegramManager } from "./telegram.js"
import { showNotification } from "./ui.js"

export class ApiManager {
  constructor() {
    this.baseUrl = CONFIG.API_BASE
  }

  handleApiError(response, error) {
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
      default:
        showNotification(`❌ Ошибка: ${error?.detail || "Неизвестная ошибка"}`, "error", 5000)
        console.error("API Error:", response?.status, error)
    }
  }

  async fetchUserFantics() {
    try {
      console.log("🔄 Запрос баланса пользователя...")

      const userId = telegramManager.getUserId()
      const response = await fetch(`${this.baseUrl}/fantics/${userId}`, {
        headers: telegramManager.getAuthHeaders(),
      })

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

      const response = await fetch(`${this.baseUrl}/`, {
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Соединение с сервером установлено:", data)
        return true
      } else {
        console.error("❌ Ошибка соединения с сервером:", response.status)
        return false
      }
    } catch (error) {
      console.error("❌ Ошибка сети при тестировании соединения:", error)
      return false
    }
  }
}

export const apiManager = new ApiManager()
