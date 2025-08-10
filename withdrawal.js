// Модуль для работы с выводом средств
import { CONFIG, STATE } from "./config.js"
import { telegramManager } from "./telegram.js"
import { showNotification } from "./ui.js"

export class WithdrawalManager {
  constructor() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Withdrawal modal
    document.getElementById("withdrawalBtn")?.addEventListener("click", () => this.openWithdrawalModal())
    document.getElementById("closeWithdrawalModal")?.addEventListener("click", () => this.closeWithdrawalModal())
    document.getElementById("confirmWithdrawalBtn")?.addEventListener("click", () => this.processWithdrawal())
    document.getElementById("customWithdrawalAmount")?.addEventListener("input", () => this.updateWithdrawalButton())

    // Withdrawal type change
    document.querySelectorAll('input[name="withdrawalType"]')?.forEach((radio) => {
      radio.addEventListener("change", () => this.updateWithdrawalTypeUI())
    })

    // Modal close on outside click
    document.getElementById("withdrawalModal")?.addEventListener("click", (e) => {
      if (e.target.id === "withdrawalModal") this.closeWithdrawalModal()
    })
  }

  openWithdrawalModal() {
    document.getElementById("withdrawalModal")?.classList.remove("hidden")
    document.getElementById("modalUserFantics").textContent = STATE.userFantics
    this.renderWithdrawalAmounts()
    this.updateWithdrawalButton()
    this.loadWithdrawalInfo()
    this.updateWithdrawalTypeUI() // Инициализируем UI типа вывода
  }

  closeWithdrawalModal() {
    document.getElementById("withdrawalModal")?.classList.add("hidden")
    STATE.selectedWithdrawalAmount = null
    const customAmount = document.getElementById("customWithdrawalAmount")
    if (customAmount) customAmount.value = ""

    document.querySelectorAll("#withdrawalAmounts > div").forEach((el) => {
      el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
    })
  }

  renderWithdrawalAmounts() {
    const withdrawalAmounts = document.getElementById("withdrawalAmounts")
    if (!withdrawalAmounts) return

    withdrawalAmounts.innerHTML = ""

    // Показываем доступные суммы для вывода (не больше баланса)
    CONFIG.DEPOSIT_AMOUNTS.filter(amount => amount <= STATE.userFantics).forEach((amount) => {
      const amountElement = document.createElement("div")
      amountElement.className =
        "bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-4 text-white text-center cursor-pointer hover:from-green-700 hover:to-green-900 transition-all border border-green-500/30"

      amountElement.innerHTML = `
        <div class="text-2xl mb-1">💰</div>
        <div class="font-bold text-lg">${amount}</div>
        <div class="text-xs text-green-300">Фантиков</div>
      `

      amountElement.addEventListener("click", (event) => this.selectWithdrawalAmount(amount, event))
      withdrawalAmounts.appendChild(amountElement)
    })
  }

  selectWithdrawalAmount(amount, event) {
    STATE.selectedWithdrawalAmount = amount

    document.querySelectorAll("#withdrawalAmounts > div").forEach((el) => {
      el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
    })

    if (event.target.closest("div")) {
      event.target.closest("div").classList.add("selected-amount", "ring-2", "ring-purple-400")
    }

    this.updateWithdrawalButton()
  }

  updateWithdrawalButton() {
    const confirmBtn = document.getElementById("confirmWithdrawalBtn")
    const withdrawalBtnText = document.getElementById("withdrawalBtnText")
    const customAmount = document.getElementById("customWithdrawalAmount")

    if (!confirmBtn || !withdrawalBtnText) return

    const amount = STATE.selectedWithdrawalAmount || parseInt(customAmount?.value || "0")
    const isValid = amount > 0 && amount <= STATE.userFantics

    confirmBtn.disabled = !isValid
    confirmBtn.className = isValid 
      ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
      : "bg-gray-400 text-gray-200 px-6 py-2 rounded-lg font-semibold cursor-not-allowed"

    if (amount > 0) {
      withdrawalBtnText.textContent = `Вывести ${amount} фантиков`
    } else {
      withdrawalBtnText.textContent = "Выберите сумму"
    }
  }

  updateWithdrawalTypeUI() {
    const withdrawalType = document.querySelector('input[name="withdrawalType"]:checked')?.value
    const walletAddressField = document.getElementById("withdrawalWalletAddress")?.parentElement

    if (withdrawalType === "ton") {
      walletAddressField?.classList.remove("hidden")
    } else {
      walletAddressField?.classList.add("hidden")
    }
  }

  async loadWithdrawalInfo() {
    try {
      const response = await fetch(`${CONFIG.API_BASE}/withdrawal/info`, {
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const info = await response.json()
        this.displayWithdrawalInfo(info)
      }
    } catch (error) {
      console.error("Ошибка загрузки информации о выводе:", error)
    }
  }

  displayWithdrawalInfo(info) {
    const minAmount = document.getElementById("minWithdrawalAmount")
    const maxAmount = document.getElementById("maxWithdrawalAmount")
    const fee = document.getElementById("withdrawalFee")
    const processingTime = document.getElementById("processingTime")

    if (minAmount) minAmount.textContent = info.min_amount || 10
    if (maxAmount) maxAmount.textContent = info.max_amount || STATE.userFantics
    if (fee) fee.textContent = info.fee_percent || 0
    if (processingTime) processingTime.textContent = info.processing_time || "24 часа"
  }

  async processWithdrawal() {
    const amount = STATE.selectedWithdrawalAmount || parseInt(document.getElementById("customWithdrawalAmount")?.value || "0")
    const withdrawalType = document.querySelector('input[name="withdrawalType"]:checked')?.value
    const walletAddress = document.getElementById("withdrawalWalletAddress")?.value?.trim()
    
    if (!amount || amount < 1) {
      showNotification("Минимальная сумма вывода: 1 фантик", "error")
      return
    }

    if (amount > STATE.userFantics) {
      showNotification("Недостаточно фантиков для вывода", "error")
      return
    }

    if (withdrawalType === "ton" && !walletAddress) {
      showNotification("Введите адрес TON кошелька", "error")
      return
    }

    if (withdrawalType === "ton" && !/^EQ[a-zA-Z0-9_-]{47}$/.test(walletAddress)) {
      showNotification("Неверный формат TON адреса", "error")
      return
    }

    try {
      showNotification("🔄 Создание заявки на вывод...", "info")

      const response = await fetch(`${CONFIG.API_BASE}/withdrawal/request`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify({
          amount: amount,
          withdrawal_type: withdrawalType,
          wallet_address: withdrawalType === "ton" ? walletAddress : null
        }),
      })

      if (response.ok) {
        const result = await response.json()
        showNotification(`✅ Заявка на вывод создана! ID: ${result.request_id}`, "success")
        this.closeWithdrawalModal()
        
        // Обновляем баланс
        STATE.userFantics -= amount
        document.getElementById("userFantics")?.textContent = STATE.userFantics
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        showNotification(`❌ Ошибка создания заявки: ${errorData.detail}`, "error")
      }
    } catch (error) {
      showNotification("Ошибка сети при создании заявки: " + error.message, "error")
    }
  }

  async getWithdrawalHistory() {
    try {
      const response = await fetch(`${CONFIG.API_BASE}/withdrawal/history`, {
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const history = await response.json()
        return history
      }
    } catch (error) {
      console.error("Ошибка получения истории выводов:", error)
    }
    return []
  }

  async getWithdrawalStatistics() {
    try {
      const response = await fetch(`${CONFIG.API_BASE}/withdrawal/statistics`, {
        headers: telegramManager.getAuthHeaders(),
      })

      if (response.ok) {
        const stats = await response.json()
        return stats
      }
    } catch (error) {
      console.error("Ошибка получения статистики выводов:", error)
    }
    return null
  }
}

export const withdrawalManager = new WithdrawalManager() 