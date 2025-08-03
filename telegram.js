export class TelegramManager {
  constructor() {
    this.tg = window.Telegram?.WebApp
    this.init()
  }

  init() {
    console.log("=== TELEGRAM WEB APP DEBUG ===")
    console.log("Telegram WebApp доступен:", !!this.tg)

    if (this.tg) {
      console.log("Init Data:", this.tg.initData)
      console.log("Init Data Unsafe:", this.tg.initDataUnsafe)
      console.log("User:", this.tg.initDataUnsafe?.user)
      console.log("Platform:", this.tg.platform)
      console.log("Version:", this.tg.version)

      this.tg.ready()
      this.tg.expand()
      this.tg.MainButton.hide()
      this.tg.setHeaderColor("#1a1a2e")
      this.tg.setBackgroundColor("#16213e")
    }
  }

  getUserId() {
    if (this.tg?.initDataUnsafe?.user?.id) {
      const userId = this.tg.initDataUnsafe.user.id
      console.log("✅ Telegram User ID:", userId)
      return userId
    }

    // Попробуем получить из URL параметров для тестирования
    if (window.location.search.includes("user_id=")) {
      const urlParams = new URLSearchParams(window.location.search)
      const userId = parseInt(urlParams.get("user_id"))
      if (userId) {
        console.log("✅ User ID из URL:", userId)
        return userId
      }
    }

    console.warn("⚠️ Telegram User ID не найден, используем тестовый: 123456")
    return 123456
  }

  getAuthHeaders() {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    let initData = null

    if (this.tg?.initData) {
      initData = this.tg.initData
      console.log("✅ Используем Telegram WebApp initData")
      console.log("📱 Init Data длина:", initData.length)
      console.log("📱 Init Data preview:", initData.substring(0, 100) + "...")
    } else if (window.location.search.includes("initData=")) {
      const urlParams = new URLSearchParams(window.location.search)
      initData = urlParams.get("initData")
      console.log("✅ Используем initData из URL параметров")
      console.log("📱 Init Data preview:", initData.substring(0, 100) + "...")
    }

    if (initData) {
      headers["Authorization"] = `Bearer ${initData}`
      console.log("🔐 Заголовок авторизации установлен")
    } else {
      console.warn("⚠️ Telegram WebApp initData недоступен")
    }

    return headers
  }

  isAuthAvailable() {
    return !!this.tg?.initData || window.location.search.includes("initData=")
  }
}

export const telegramManager = new TelegramManager()
