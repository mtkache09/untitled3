// Модуль игровой логики
import { STATE } from "./config.js"
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

    // Создаем массив призов для прокрутки (больше элементов для плавности)
    const prizes = []
    const baseRepeats = 50 // Увеличиваем количество повторений

    if (caseData.possible_prizes) {
      // Создаем базовый набор призов
      const basePrizes = []
      caseData.possible_prizes.forEach((prize) => {
        const repeats = Math.max(1, Math.floor(prize.chance / 2)) // Меньше повторений для разнообразия
        for (let i = 0; i < repeats; i++) {
          basePrizes.push(prize)
        }
      })

      // Перемешиваем базовый набор
      for (let i = basePrizes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[basePrizes[i], basePrizes[j]] = [basePrizes[j], basePrizes[i]]
      }

      // Создаем длинную последовательность
      for (let i = 0; i < baseRepeats; i++) {
        basePrizes.forEach((prize) => prizes.push({ ...prize }))
      }
    }

    // Рендерим призы
    prizes.forEach((prize, index) => {
      const prizeElement = document.createElement("div")

      // Определяем цвет в зависимости от стоимости
      let bgGradient = "from-purple-600 to-purple-800"
      if (prize.cost >= 2000) {
        bgGradient = "from-yellow-600 to-yellow-800"
      } else if (prize.cost >= 1000) {
        bgGradient = "from-purple-600 to-purple-800"
      } else if (prize.cost >= 200) {
        bgGradient = "from-blue-600 to-blue-800"
      } else {
        bgGradient = "from-green-600 to-green-800"
      }

      prizeElement.className = `flex-shrink-0 w-32 h-32 bg-gradient-to-br ${bgGradient} rounded-lg flex flex-col items-center justify-center text-white shadow-lg border border-purple-500/30`
      prizeElement.dataset.prizeIndex = index
      prizeElement.dataset.prizeCost = prize.cost

      const iconElement = document.createElement("div")
      iconElement.className = "text-3xl mb-2"
      iconElement.textContent = prize.icon || "💎"

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

    // Сбрасываем позицию прокрутки
    prizeScroll.scrollLeft = 0
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
      let result

      if (demoMode.checked) {
        // Демо режим - симулируем результат
        const prizes = STATE.currentCase.possible_prizes || []
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)]
        result = {
          gift: randomPrize.cost,
          prize: randomPrize,
          new_balance: STATE.userFantics,
          message: "Демо режим",
        }
      } else {
        // Реальное открытие кейса
        result = await apiManager.openCaseAPI(STATE.currentCase.id)
        if (!result) {
          throw new Error("Не удалось открыть кейс")
        }
        STATE.userFantics = result.new_balance || STATE.userFantics
        updateFanticsDisplay()
      }

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

    const prizeElements = Array.from(prizeScroll.children)
    const prizeWidth = 128 + 16 // 128px ширина + 16px gap
    const containerWidth = prizeScroll.parentElement.offsetWidth
    const centerOffset = containerWidth / 2 - 64 // Центрируем относительно середины приза

    // Находим подходящий приз для остановки
    let targetPrizeIndex = -1
    const winningCost = result.gift || result.prize?.cost

    if (winningCost) {
      // Ищем призы с подходящей стоимостью в последней трети списка
      const startSearchFrom = Math.floor(prizeElements.length * 0.7)

      for (let i = startSearchFrom; i < prizeElements.length; i++) {
        const prizeCost = Number.parseInt(prizeElements[i].dataset.prizeCost)
        if (prizeCost === winningCost) {
          targetPrizeIndex = i
          break
        }
      }
    }

    // Если не нашли подходящий приз, выбираем случайный в конце
    if (targetPrizeIndex === -1) {
      targetPrizeIndex =
        Math.floor(prizeElements.length * 0.75) + Math.floor(Math.random() * Math.floor(prizeElements.length * 0.2))
    }

    // Вычисляем целевую позицию
    const targetPosition = targetPrizeIndex * prizeWidth - centerOffset

    // Добавляем дополнительные обороты для эффектности
    const extraSpins = 3
    const finalTargetPosition = targetPosition + extraSpins * prizeElements.length * prizeWidth

    return new Promise((resolve) => {
      const startTime = performance.now()
      const duration = 6000 // Увеличиваем длительность до 6 секунд
      const startPosition = prizeScroll.scrollLeft

      // Улучшенная функция замедления (более плавная)
      const easeOutQuart = (t) => {
        return 1 - Math.pow(1 - t, 4)
      }

      // Дополнительная функция для очень плавного замедления в конце
      const smoothEnd = (t) => {
        if (t < 0.8) {
          return easeOutQuart(t / 0.8) * 0.95
        } else {
          // Очень медленное замедление в последние 20%
          const endProgress = (t - 0.8) / 0.2
          return 0.95 + 0.05 * (1 - Math.pow(1 - endProgress, 6))
        }
      }

      const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Применяем улучшенную функцию замедления
        const easedProgress = smoothEnd(progress)

        const currentPosition = startPosition + (finalTargetPosition - startPosition) * easedProgress
        prizeScroll.scrollLeft = currentPosition

        // Добавляем эффект подсветки приближающегося к центру приза
        const currentCenterPosition = currentPosition + centerOffset
        const currentPrizeIndex = Math.round(currentCenterPosition / prizeWidth)

        // Убираем предыдущую подсветку
        prizeElements.forEach((el) => el.classList.remove("prize-highlight"))

        // Подсвечиваем текущий приз в центре
        if (prizeElements[currentPrizeIndex]) {
          prizeElements[currentPrizeIndex].classList.add("prize-highlight")
        }

        if (progress < 1) {
          requestAnimationFrame(animateScroll)
        } else {
          // Финальная подсветка выигрышного приза
          prizeElements.forEach((el) => el.classList.remove("prize-highlight"))
          if (prizeElements[targetPrizeIndex]) {
            prizeElements[targetPrizeIndex].classList.add("prize-winner")
          }

          setTimeout(() => {
            const prizeName = result.prize?.name || `${winningCost} фантиков`
            resolve()
          }, 800)
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
