// Модуль игровой логики
import { CONFIG, STATE } from "./config.js"
import { apiManager } from "./api.js"
import { showNotification, updateFanticsDisplay, renderPossiblePrizes } from "./ui.js"

export class GameManager {
  constructor() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    document.getElementById("backBtn")?.addEventListener("click", () => this.goBack())
    document.getElementById("openCaseBtn")?.addEventListener("click", () => this.spinPrizes())
    document.getElementById("demoMode")?.addEventListener("change", () => this.updateOpenButton())
  }

  renderPrizeScroll(caseData, winningGiftCost) {
    const prizeScroll = document.getElementById("prizeScroll")
    if (!prizeScroll || !caseData) return

    prizeScroll.innerHTML = ""

    const prizes = []

    if (caseData.possible_prizes) {
      caseData.possible_prizes.forEach((prize) => {
        for (let i = 0; i < prize.chance; i++) {
          prizes.push(prize)
        }
      })
    }

    // Перемешиваем призы
    for (let i = prizes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[prizes[i], prizes[j]] = [prizes[j], prizes[i]]
    }

    prizes.forEach((prize) => {
      const prizeElement = document.createElement("div")
      prizeElement.className =
        "flex-shrink-0 w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex flex-col items-center justify-center text-white shadow-lg border border-purple-500/30"

      const iconElement = document.createElement("div")
      iconElement.className = "text-3xl mb-2"
      iconElement.textContent = prize.icon || "🎁"

      const nameElement = document.createElement("div")
      nameElement.className = "text-sm font-semibold text-center"
      nameElement.textContent = prize.name

      const costElement = document.createElement("div")
      costElement.className = "text-xs text-purple-300"
      costElement.textContent = `${prize.cost} 💎`

      prizeElement.appendChild(iconElement)
      prizeElement.appendChild(nameElement)
      prizeElement.appendChild(costElement)

      prizeScroll.appendChild(prizeElement)
    })
  }

  updateOpenButton() {
    const openBtn = document.getElementById("openCaseBtn")
    const demoMode = document.getElementById("demoMode")
    const openBtnText = document.getElementById("openBtnText")

    if (!openBtn || !demoMode || !openBtnText) return

    if (demoMode.checked) {
      openBtn.disabled = false
      openBtnText.textContent = "Открыть кейс (Демо)"
    } else {
      if (STATE.userFantics >= (STATE.currentCase?.cost || 0)) {
        openBtn.disabled = false
        openBtnText.textContent = `Открыть кейс (${STATE.currentCase?.cost || 0} 💎)`
      } else {
        openBtn.disabled = true
        openBtnText.textContent = "Недостаточно фантиков"
      }
    }
  }

  openCasePage(caseData) {
    STATE.currentCase = caseData
    document.getElementById("mainPage")?.classList.add("hidden")
    document.getElementById("casePage")?.classList.remove("hidden")

    document.getElementById("caseTitle").textContent = caseData.name
    document.getElementById("userStarsCase").textContent = STATE.userFantics

    this.renderPrizeScroll(caseData, 0)
    renderPossiblePrizes(caseData)
    this.updateOpenButton()
  }

  async spinPrizes() {
    if (STATE.isSpinning) return

    const openBtn = document.getElementById("openCaseBtn")
    const demoMode = document.getElementById("demoMode")

    if (!openBtn || !demoMode) return

    if (!demoMode.checked && STATE.userFantics < (STATE.currentCase?.cost || 0)) {
      showNotification("Недостаточно фантиков для открытия кейса", "warning")
      return
    }

    STATE.isSpinning = true
    openBtn.disabled = true
    openBtn.classList.add("animate-pulse")

    try {
      const result = await apiManager.openCaseAPI(STATE.currentCase.id)

      if (!result) {
        throw new Error("Не удалось открыть кейс")
      }

      STATE.userFantics = result.new_balance || STATE.userFantics
      updateFanticsDisplay()

      // Анимация вращения
      await this.animatePrizeScroll(result)
    } catch (error) {
      console.error("❌ Ошибка при открытии кейса:", error)
      showNotification("❌ Ошибка при открытии кейса", "error")
    } finally {
      openBtn.disabled = false
      openBtn.classList.remove("animate-pulse")
      this.updateOpenButton()
      STATE.isSpinning = false
    }
  }

  async animatePrizeScroll(result) {
    const prizeScroll = document.getElementById("prizeScroll")
    if (!prizeScroll) return

    const scrollWidth = prizeScroll.scrollWidth
    const containerWidth = prizeScroll.parentElement.offsetWidth
    const centerPosition = scrollWidth / 2 - containerWidth / 2

    const winningPrize = result.prize
    let targetPosition = centerPosition

    if (winningPrize) {
      const prizeElements = prizeScroll.children
      for (let i = 0; i < prizeElements.length; i++) {
        const prizeElement = prizeElements[i]
        const prizeName = prizeElement.querySelector("div:nth-child(2)")?.textContent
        if (prizeName === winningPrize.name) {
          targetPosition = centerPosition + i * CONFIG.ANIMATION.PRIZE_WIDTH
          break
        }
      }
    }

    return new Promise((resolve) => {
      const startTime = performance.now()
      const duration = CONFIG.ANIMATION.SPIN_DURATION
      const startPosition = prizeScroll.scrollLeft

      const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        const easeOut = 1 - Math.pow(1 - progress, 3)
        prizeScroll.scrollLeft = startPosition + (targetPosition - startPosition) * easeOut

        if (progress < 1) {
          requestAnimationFrame(animateScroll)
        } else {
          setTimeout(() => {
            showNotification(`🎉 Поздравляем! Вы выиграли ${winningPrize?.name || "приз"}!`, "success", 5000)
            resolve()
          }, 500)
        }
      }

      requestAnimationFrame(animateScroll)
    })
  }

  goBack() {
    document.getElementById("casePage")?.classList.add("hidden")
    document.getElementById("mainPage")?.classList.remove("hidden")
    STATE.currentCase = null
  }
}

export const gameManager = new GameManager()
