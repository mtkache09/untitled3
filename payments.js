// Модуль для работы с платежами
import { CONFIG, STATE } from "./config.js"
import { telegramManager } from "./telegram.js"
import { apiManager } from "./api.js"
import { showNotification, updateFanticsDisplay } from "./ui.js"

export class PaymentManager {
  constructor() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Deposit modal
    document.getElementById("depositBtn")?.addEventListener("click", () => this.openTopupModal())
    document.getElementById("closeDepositModal")?.addEventListener("click", () => this.closeDepositModal())
    document.getElementById("confirmDepositBtn")?.addEventListener("click", () => this.processDeposit())
    document.getElementById("customAmount")?.addEventListener("input", () => this.updateDepositButton())

    // Topup modal
    document.getElementById("closeTopupModal")?.addEventListener("click", () => this.closeTopupModal())
    document.getElementById("createTopupPayload")?.addEventListener("click", () => this.createTopupPayload())
    document.getElementById("sendTonTransaction")?.addEventListener("click", () => this.sendTonTransaction())
    document.getElementById("payWithStars")?.addEventListener("click", () => this.payWithStars())

    // Payment method change
    document.querySelectorAll('input[name="paymentMethod"]')?.forEach((radio) => {
      radio.addEventListener("change", () => this.updatePaymentMethodUI())
    })

    // Modal close on outside click
    document.getElementById("depositModal")?.addEventListener("click", (e) => {
      if (e.target.id === "depositModal") this.closeDepositModal()
    })

    document.getElementById("topupModal")?.addEventListener("click", (e) => {
      if (e.target.id === "topupModal") this.closeTopupModal()
    })
  }

  // Deposit Modal Methods
  openDepositModal() {
    document.getElementById("depositModal")?.classList.remove("hidden")
    document.getElementById("modalUserStars").textContent = STATE.userFantics
    this.renderDepositAmounts()
    this.updateDepositButton()
  }

  closeDepositModal() {
    document.getElementById("depositModal")?.classList.add("hidden")
    STATE.selectedDepositAmount = null
    const customAmount = document.getElementById("customAmount")
    if (customAmount) customAmount.value = ""

    document.querySelectorAll("#depositAmounts > div").forEach((el) => {
      el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
    })
  }

  renderDepositAmounts() {
    const depositAmounts = document.getElementById("depositAmounts")
    if (!depositAmounts) return

    depositAmounts.innerHTML = ""

    CONFIG.DEPOSIT_AMOUNTS.forEach((amount) => {
      const amountElement = document.createElement("div")
      amountElement.className =
        "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-white text-center cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all border border-purple-500/30"

      amountElement.innerHTML = `
        <div class="text-2xl mb-1">💎</div>
        <div class="font-bold text-lg">${amount}</div>
        <div class="text-xs text-purple-300">Фантиков</div>
      `

      amountElement.addEventListener("click", (event) => this.selectDepositAmount(amount, event))
      depositAmounts.appendChild(amountElement)
    })
  }

  selectDepositAmount(amount, event) {
    STATE.selectedDepositAmount = amount

    document.querySelectorAll("#depositAmounts > div").forEach((el) => {
      el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
    })

    if (event.target.closest("div")) {
      event.target.closest("div").classList.add("selected-amount", "ring-2", "ring-purple-400")
    }

    this.updateDepositButton()
  }

  updateDepositButton() {
    const confirmBtn = document.getElementById("confirmDepositBtn")
    const depositBtnText = document.getElementById("depositBtnText")
    const customAmount = document.getElementById("customAmount")

    if (!confirmBtn || !depositBtnText) return

    const amount = STATE.selectedDepositAmount || (customAmount ? parseInt(customAmount.value) || 0 : 0)

    if (amount > 0) {
      confirmBtn.disabled = false
      depositBtnText.textContent = `Пополнить на ${amount} 💎`
    } else {
      confirmBtn.disabled = true
      depositBtnText.textContent = "Выберите сумму"
    }
  }

  async processDeposit() {
    const amount =
      STATE.selectedDepositAmount ||
      (document.getElementById("customAmount")
        ? parseInt(document.getElementById("customAmount").value) || 0
        : 0)

    if (amount <= 0) {
      showNotification("Выберите сумму для пополнения", "warning")
      return
    }

    const success = await apiManager.addFantics(amount)
    if (success) {
      showNotification(`✅ Баланс пополнен на ${amount} фантиков!`, "success")
      updateFanticsDisplay()
      this.closeDepositModal()
    }
  }

  // Topup Modal Methods
  openTopupModal() {
    document.getElementById("topupModal")?.classList.remove("hidden")
    document.getElementById("topupAmount").value = "10"
    this.resetTopupModal()
  }

  closeTopupModal() {
    document.getElementById("topupModal")?.classList.add("hidden")
    STATE.topupPayload = null
    STATE.currentPaymentId = null
  }

  resetTopupModal() {
    document.getElementById("tonPaymentInfo")?.classList.add("hidden")
    document.getElementById("starsPaymentInfo")?.classList.add("hidden")
    document.getElementById("createTopupPayload")?.classList.remove("hidden")
    document.getElementById("sendTonTransaction")?.classList.add("hidden")
    document.getElementById("payWithStars")?.classList.add("hidden")

    this.updatePaymentMethodUI()
    STATE.topupPayload = null
    STATE.currentPaymentId = null
  }

  updatePaymentMethodUI() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value
    const createButton = document.getElementById("createTopupPayload")
    const createButtonText = document.getElementById("createPayloadText")

    if (!createButton || !createButtonText) return

    if (paymentMethod === "telegram_stars") {
      createButtonText.textContent = "⭐ Подготовить оплату звездочками"
      createButton.className = "flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded"
    } else {
      createButtonText.textContent = "Создать TON платеж"
      createButton.className = "flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
    }

    document.getElementById("tonPaymentInfo")?.classList.add("hidden")
    document.getElementById("starsPaymentInfo")?.classList.add("hidden")
    document.getElementById("sendTonTransaction")?.classList.add("hidden")
    document.getElementById("payWithStars")?.classList.add("hidden")
    document.getElementById("createTopupPayload")?.classList.remove("hidden")
  }

  async createTopupPayload() {
    const amount = parseInt(document.getElementById("topupAmount")?.value || "0")
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value

    if (!amount || amount < 1) {
      showNotification("Минимальная сумма пополнения: 1 фантик", "error")
      return
    }

    if (paymentMethod === "telegram_stars") {
      await this.processStarsPayment(amount)
      return
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE}/topup/ton/create_payload`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify({ amount: amount }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      STATE.topupPayload = await response.json()
      STATE.currentPaymentId = STATE.topupPayload.payment_id  // Сохраняем ID платежа

      document.getElementById("tonAmount").textContent = STATE.topupPayload.amount
      document.getElementById("destinationAddress").textContent = STATE.topupPayload.destination
      document.getElementById("paymentComment").textContent = STATE.topupPayload.comment
      document.getElementById("tonPaymentInfo")?.classList.remove("hidden")
      document.getElementById("starsPaymentInfo")?.classList.add("hidden")
      document.getElementById("createTopupPayload")?.classList.add("hidden")
      document.getElementById("sendTonTransaction")?.classList.remove("hidden")
      document.getElementById("payWithStars")?.classList.add("hidden")

      showNotification(`TON платеж создан! ID: ${STATE.currentPaymentId.slice(0, 8)}...`, "success")
    } catch (error) {
      showNotification("Ошибка создания TON платежа: " + error.message, "error")
    }
  }

  async processStarsPayment(amount) {
    try {
      document.getElementById("starsAmount").textContent = amount
      document.getElementById("starsPaymentInfo")?.classList.remove("hidden")
      document.getElementById("tonPaymentInfo")?.classList.add("hidden")
      document.getElementById("createTopupPayload")?.classList.add("hidden")
      document.getElementById("sendTonTransaction")?.classList.add("hidden")
      document.getElementById("payWithStars")?.classList.remove("hidden")

      showNotification("Готов к оплате звездочками! Нажмите кнопку для отправки запроса", "info")
    } catch (error) {
      showNotification("Ошибка подготовки оплаты звездочками: " + error.message, "error")
    }
  }

  async sendTonTransaction() {
    if (!STATE.tonConnectUI || !STATE.topupPayload) {
      showNotification("TON Connect не инициализирован или payload не создан", "error")
      return
    }

    const wallet = STATE.tonConnectUI.wallet
    if (!wallet || !wallet.account) {
      showNotification("Сначала подключите TON кошелек", "error")
      return
    }

    try {
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: STATE.topupPayload.destination,
            amount: (STATE.topupPayload.amount * 1000000000).toString(),
          },
        ],
      }

      showNotification(`💰 Отправка ${STATE.topupPayload.amount} TON`, "info", 2000)

      const result = await STATE.tonConnectUI.sendTransaction(transaction)

      if (result) {
        showNotification("Транзакция отправлена! Проверяем в блокчейне...", "success")
        
        // Получаем хэш транзакции из результата
        const transactionHash = result.boc ? await this.getTransactionHash(result.boc) : null
        
        if (transactionHash) {
          // Подтверждаем пополнение на бэкенде
          await this.confirmTopupWithVerification(transactionHash)
        } else {
          showNotification("Не удалось получить хэш транзакции", "error")
        }
      } else {
        showNotification("Ошибка отправки транзакции", "error")
      }
    } catch (error) {
      if (error.message.includes("User rejected") || error.message.includes("cancelled")) {
        showNotification("❌ Транзакция отменена пользователем", "warning")
      } else {
        showNotification(`❌ Ошибка транзакции: ${error.message}`, "error", 5000)
      }
    }
  }

  async payWithStars() {
    const amount = parseInt(document.getElementById("topupAmount")?.value || "0")

    try {
      const response = await fetch(`${CONFIG.API_BASE}/topup/stars`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify({ amount: amount }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        showNotification(
          "✅ Запрос на оплату звездочками отправлен! Ожидайте сообщение от бота в телеграме",
          "success",
          7000,
        )
        this.closeTopupModal()
      } else {
        showNotification("Ошибка отправки запроса на звездочки", "error")
      }
    } catch (error) {
      showNotification("Ошибка запроса звездочек: " + error.message, "error")
    }
  }

  // Функция для получения хэша транзакции из BOC (упрощенная версия)
  async getTransactionHash(boc) {
    try {
      // В реальности здесь нужна библиотека для работы с TON BOC
      // Пока что используем заглушку - в production нужно использовать ton-core или аналог
      
      // Временное решение: берем первые байты BOC как хэш
      const bocBytes = new Uint8Array(atob(boc).split('').map(c => c.charCodeAt(0)))
      const hashHex = Array.from(bocBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('')
      
      return hashHex
    } catch (error) {
      console.error('Ошибка получения хэша транзакции:', error)
      return null
    }
  }

  async confirmTopupWithVerification(transactionHash) {
    if (!STATE.currentPaymentId) {
      showNotification('Ошибка: ID платежа не найден', 'error')
      return
    }
    
    try {
      showNotification('🔍 Проверяем транзакцию в блокчейне...', 'info')
      
      const response = await fetch(`${CONFIG.API_BASE}/topup/ton/confirm`, {
        method: 'POST',
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify({
          payment_id: STATE.currentPaymentId,
          transaction_hash: transactionHash
        })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        showNotification(`✅ Платеж подтвержден! +${result.added_amount} фантиков`, 'success')
        this.closeTopupModal()
        await apiManager.fetchUserFantics()
        updateFanticsDisplay()
        
        // Очищаем данные текущего платежа
        STATE.currentPaymentId = null
        STATE.topupPayload = null
        
      } else {
        const errorMessage = result.detail || result.message || 'Ошибка подтверждения платежа'
        
        if (errorMessage.includes('не найдена') || errorMessage.includes('не подтверждена')) {
          showNotification(`⏳ ${errorMessage}. Попробуйте через несколько секунд`, 'warning')
          
          // Запускаем периодическую проверку
          setTimeout(() => this.checkPaymentStatus(), 5000)
        } else {
          showNotification(`❌ ${errorMessage}`, 'error')
        }
      }
      
    } catch (error) {
      showNotification('Ошибка подтверждения: ' + error.message, 'error')
      
      // Запускаем периодическую проверку при сетевых ошибках
      setTimeout(() => this.checkPaymentStatus(), 10000)
    }
  }

  // Функция для периодической проверки статуса платежа
  async checkPaymentStatus() {
    if (!STATE.currentPaymentId) return
    
    try {
      const response = await fetch(`${CONFIG.API_BASE}/payment/status/${STATE.currentPaymentId}`, {
        headers: telegramManager.getAuthHeaders()
      })
      
      if (!response.ok) return
      
      const payment = await response.json()
      
      if (payment.status === 'confirmed') {
        showNotification(`✅ Платеж подтвержден! +${payment.amount_fantics} фантиков`, 'success')
        this.closeTopupModal()
        await apiManager.fetchUserFantics()
        updateFanticsDisplay()
        STATE.currentPaymentId = null
        STATE.topupPayload = null
              } else if (payment.status === 'failed') {
          showNotification('❌ Платеж не прошел проверку', 'error')
          STATE.currentPaymentId = null
          STATE.topupPayload = null
        } else if (payment.status === 'expired') {
        showNotification('⏰ Время платежа истекло', 'warning')
        STATE.currentPaymentId = null
        STATE.topupPayload = null
      } else {
        // Статус pending - продолжаем проверять
        setTimeout(() => this.checkPaymentStatus(), 10000)
      }
      
    } catch (error) {
      console.error('Ошибка проверки статуса:', error)
      setTimeout(() => this.checkPaymentStatus(), 15000)
    }
  }


}

export const paymentManager = new PaymentManager()
