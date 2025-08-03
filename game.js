// Исправленный модуль игровой логики (адаптированный под существующий API)
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

  renderPrizeScroll(caseData, winningGiftCost = 0) {
    const prizeScroll = document.getElementById("prizeScroll")
    if (!prizeScroll || !caseData) return

    prizeScroll.innerHTML = ""

    // Адаптируемся под серверный формат - используем presents если нет possible_prizes
    let possiblePrizes = caseData.possible_prizes || []

    // Если нет possible_prizes, создаем их из presents (серверный формат)
    if (!possiblePrizes.length && caseData.presents) {
      possiblePrizes = caseData.presents.map((present) => ({
        name: `${present.cost} фантиков`,
        cost: present.cost,
        icon: "💎",
        probability: present.probability || 10,
        chance: present.probability || 10,
      }))
    }

    // Если все еще нет данных, генерируем базовые призы
    if (!possiblePrizes.length) {
      possiblePrizes = this.generateDefaultPrizes(caseData.cost)
    }

    const prizes = []

    // Создаем массив призов с учетом их вероятности
    possiblePrizes.forEach((prize) => {
      const probability = prize.chance || prize.probability || 10
      const weight = Math.max(1, Math.floor(probability))

      for (let i = 0; i < weight; i++) {
        prizes.push({
          name: prize.name || `${prize.cost} фантиков`,
          cost: prize.cost || 0,
          icon: prize.icon || "💎",
        })
      }
    })

    // Перемешиваем призы
    for (let i = prizes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[prizes[i], prizes[j]] = [prizes[j], prizes[i]]
    }

    // Добавляем дополнительные призы для создания эффекта бесконечности
    const extendedPrizes = [...prizes, ...prizes, ...prizes]

    extendedPrizes.forEach((prize, index) => {
      const prizeElement = document.createElement("div")
      prizeElement.className =
        "flex-shrink-0 w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex flex-col items-center justify-center text-white shadow-lg border border-purple-500/30 transition-all duration-300"

      // Добавляем data-атрибуты для идентификации
      prizeElement.dataset.prizeName = prize.name
      prizeElement.dataset.prizeCost = prize.cost
      prizeElement.dataset.index = index

      const iconElement = document.createElement("div")
      iconElement.className = "text-3xl mb-2"
      iconElement.textContent = prize.icon

      const nameElement = document.createElement("div")
      nameElement.className = "text-sm font-semibold text-center px-1"
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

  generateDefaultPrizes(caseCost) {
    if (caseCost <= 100) {
      return [
        { name: "50 фантиков", cost: 50, icon: "💎", chance: 40 },
        { name: "100 фантиков", cost: 100, icon: "💎", chance: 35 },
        { name: "200 фантиков", cost: 200, icon: "💎", chance: 20 },
        { name: "500 фантиков", cost: 500, icon: "💎", chance: 5 },
      ]
    } else if (caseCost <= 500) {
      return [
        { name: "200 фантиков", cost: 200, icon: "💎", chance: 30 },
        { name: "500 фантиков", cost: 500, icon: "💎", chance: 35 },
        { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
        { name: "2500 фантиков", cost: 2500, icon: "💎", chance: 10 },
      ]
    } else {
      return [
        { name: "1000 фантиков", cost: 1000, icon: "💎", chance: 25 },
        { name: "2000 фантиков", cost: 2000, icon: "💎", chance: 35 },
        { name: "5000 фантиков", cost: 5000, icon: "💎", chance: 30 },
        { name: "10000 фантиков", cost: 10000, icon: "💎", chance: 10 },
      ]
    }
  }

  updateOpenButton() {
    const openBtn = document.getElementById("openCaseBtn")
    const demoMode = document.getElementById("demoMode")
    const openBtnText = document.getElementById("openBtnText")

    if (!openBtn || !demoMode || !openBtnText) return

    if (demoMode.checked) {
      openBtn.disabled = false
      openBtnText.textContent = "Открыть кейс (Демо)"
      openBtn.className = openBtn.className.replace("bg-gray-500", "bg-purple-600")
    } else {
      const caseCost = STATE.currentCase?.cost || 0
      if (STATE.userFantics >= caseCost) {
        openBtn.disabled = false
        openBtnText.textContent = `Открыть кейс (${caseCost} 💎)`
        openBtn.className = openBtn.className.replace("bg-gray-500", "bg-purple-600")
      } else {
        openBtn.disabled = true
        openBtnText.textContent = "Недостаточно фантиков"
        openBtn.className = openBtn.className.replace("bg-purple-600", "bg-gray-500")
      }
    }
  }

  openCasePage(caseData) {
    STATE.currentCase = caseData
    document.getElementById("mainPage")?.classList.add("hidden")
    document.getElementById("casePage")?.classList.remove("hidden")

    // Обновляем заголовок и баланс
    const caseTitle = document.getElementById("caseTitle")
    const userStarsCase = document.getElementById("userStarsCase")

    if (caseTitle) caseTitle.textContent = caseData.name
    if (userStarsCase) userStarsCase.textContent = STATE.userFantics

    this.renderPrizeScroll(caseData)
    renderPossiblePrizes(caseData)
    this.updateOpenButton()
  }

  async spinPrizes() {
    if (STATE.isSpinning) return

    const openBtn = document.getElementById("openCaseBtn")
    const demoMode = document.getElementById("demoMode")

    if (!openBtn || !demoMode) return

    const caseCost = STATE.currentCase?.cost || 0

    if (!demoMode.checked && STATE.userFantics < caseCost) {
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
        result = this.simulateDemoResult()
        showNotification("🎮 Демо режим - баланс не изменился", "info", 2000)
      } else {
        // Реальное открытие кейса - используем существующий API
        const serverResult = await apiManager.openCaseAPI(STATE.currentCase.id)
        if (!serverResult) {
          throw new Error("Не удалось открыть ��ейс")
        }

        // Обновляем баланс
        STATE.userFantics = serverResult.new_balance || STATE.userFantics
        updateFanticsDisplay()

        // Адаптируем серверный ответ под клиентский формат
        result = this.adaptServerResponse(serverResult)
      }

      // Анимация вращения
      await this.animatePrizeScroll(result)

      // Сохраняем последний результат
      STATE.lastOpenedCase = result
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

  simulateDemoResult() {
    // Получаем призы из текущего кейса
    let possiblePrizes = STATE.currentCase.possible_prizes || []

    if (!possiblePrizes.length && STATE.currentCase.presents) {
      possiblePrizes = STATE.currentCase.presents.map((present) => ({
        name: `${present.cost} фантиков`,
        cost: present.cost,
        icon: "💎",
      }))
    }

    if (!possiblePrizes.length) {
      possiblePrizes = this.generateDefaultPrizes(STATE.currentCase.cost)
    }

    const randomPrize = possiblePrizes[Math.floor(Math.random() * possiblePrizes.length)]

    return {
      prize: randomPrize,
      new_balance: STATE.userFantics,
      spent: 0,
      profit: randomPrize?.cost || 0,
    }
  }

  adaptServerResponse(serverResult) {
    // Адаптируем ответ сервера под клиентский формат
    // Сервер возвращает: { gift, case_id, spent, profit, new_balance, message }
    return {
      prize: {
        name: `${serverResult.gift} фантиков`,
        cost: serverResult.gift || 0,
        icon: "💎",
      },
      new_balance: serverResult.new_balance,
      spent: serverResult.spent || 0,
      profit: serverResult.profit || 0,
      message: serverResult.message,
    }
  }

  async animatePrizeScroll(result) {
    const prizeScroll = document.getElementById("prizeScroll")
    if (!prizeScroll || !result?.prize) return

    const containerWidth = prizeScroll.parentElement.offsetWidth
    const prizeWidth = CONFIG.ANIMATION.PRIZE_WIDTH
    const centerOffset = containerWidth / 2 - prizeWidth / 2

    // Находим подходящий приз в скролле
    const prizeElements = Array.from(prizeScroll.children)
    let targetIndex = Math.floor(prizeElements.length / 2) // По умолчанию центр

    // Ищем приз с таким же названием или стоимостью
    const foundIndex = prizeElements.findIndex((element) => {
      const elementName = element.dataset.prizeName
      const elementCost = Number.parseInt(element.dataset.prizeCost)
      return elementName === result.prize.name || elementCost === result.prize.cost
    })

    if (foundIndex !== -1) {
      targetIndex = foundIndex
    }

    // Рассчитываем финальную позицию
    const targetPosition = targetIndex * prizeWidth - centerOffset

    return new Promise((resolve) => {
      const startTime = performance.now()
      const duration = CONFIG.ANIMATION.SPIN_DURATION
      const startPosition = prizeScroll.scrollLeft

      // Добавляем дополнительные обороты для эффектности
      const extraSpins =
        Math.random() * (CONFIG.GAME.MAX_SPIN_ROUNDS - CONFIG.GAME.MIN_SPIN_ROUNDS) + CONFIG.GAME.MIN_SPIN_ROUNDS
      const scrollWidth = prizeScroll.scrollWidth / 3 // Делим на 3, так как у нас 3 копии призов
      const totalDistance = targetPosition - startPosition + extraSpins * scrollWidth

      const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Используем easing функцию для плавности
        const easeOut = CONFIG.ANIMATION.EASING.EASE_IN_OUT_QUART(progress)
        const currentPosition = startPosition + totalDistance * easeOut

        prizeScroll.scrollLeft = currentPosition

        if (progress < 1) {
          requestAnimationFrame(animateScroll)
        } else {
          // Подсвечиваем выигрышный приз
          this.highlightWinningPrize(targetIndex)

          setTimeout(() => {
            const prizeName = result.prize?.name || "приз"
            const prizeValue = result.prize?.cost || 0
            const profit = result.profit || 0

            let message = `🎉 Поздравляем! Вы выиграли ${prizeName}!`
            if (profit > 0) {
              message += ` Прибыль: +${profit} 💎`
            } else if (profit < 0) {
              message += ` Убыток: ${profit} 💎`
            }

            showNotification(message, "success", 5000)
            resolve()
          }, 500)
        }
      }

      requestAnimationFrame(animateScroll)
    })
  }

  highlightWinningPrize(index) {
    const prizeScroll = document.getElementById("prizeScroll")
    if (!prizeScroll) return

    const prizeElement = prizeScroll.children[index]
    if (prizeElement) {
      // Убираем предыдущие подсветки
      Array.from(prizeScroll.children).forEach((el) => {
        el.classList.remove("prize-winner", "prize-highlight")
      })

      // Добавляем анимацию победы
      prizeElement.classList.add("prize-winner")

      // Убираем анимацию через 3 секунды
      setTimeout(() => {
        prizeElement.classList.remove("prize-winner")
      }, 3000)
    }
  }

  goBack() {
    document.getElementById("casePage")?.classList.add("hidden")
    document.getElementById("mainPage")?.classList.remove("hidden")
    STATE.currentCase = null
  }
}

export const gameManager = new GameManager()
