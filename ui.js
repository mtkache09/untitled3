// Исправленный модуль для управления интерфейсом (адаптированный под серверный API)
import { CONFIG, STATE } from "./config.js"

export function debugLog(message) {
  console.log(message)
  const debugLog = document.getElementById("debugLog")
  if (debugLog) {
    const timestamp = new Date().toLocaleTimeString()
    debugLog.innerHTML += `<div>[${timestamp}] ${message}</div>`
    debugLog.scrollTop = debugLog.scrollHeight
  }
}

export function showNotification(message, type = "info", duration = CONFIG.ANIMATION.NOTIFICATION_DURATION) {
  const notification = document.createElement("div")
  notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`

  const typeClasses = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-500 text-white",
  }

  notification.className += ` ${typeClasses[type] || typeClasses.info}`
  notification.textContent = message
  document.body.appendChild(notification)

  // Анимация появления
  setTimeout(() => {
    notification.classList.remove("translate-x-full")
  }, 100)

  // Анимация исчезновения
  setTimeout(() => {
    notification.classList.add("translate-x-full")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }, duration)
}

export function showConnectionStatus(message, isError = false) {
  const statusDiv = document.getElementById("connectionStatus")
  const statusText = document.getElementById("statusText")

  if (statusDiv && statusText) {
    statusDiv.classList.remove("hidden")
    statusText.textContent = message

    // Обновляем классы статуса
    statusDiv.className = statusDiv.className.replace(/bg-(red|green|blue)-500/g, "")

    const statusClass = isError ? "bg-red-500" : "bg-green-500"
    statusDiv.className += ` ${statusClass}`
  }
}

export function updateFanticsDisplay() {
  const userStarsElements = document.querySelectorAll("#userStars, #userStarsCase, #modalUserStars")
  userStarsElements.forEach((element) => {
    if (element) {
      element.textContent = STATE.userFantics
    }
  })
}

export function renderCases(cases, onCaseSelect) {
  const casesGrid = document.getElementById("casesGrid")
  if (!casesGrid) return

  casesGrid.innerHTML = ""

  cases.forEach((caseData) => {
    const caseElement = document.createElement("div")
    caseElement.className =
      "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-white shadow-lg border border-purple-500/30 cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all transform hover:scale-105"

    caseElement.innerHTML = `
      <div class="text-center">
        <div class="text-4xl mb-2">${caseData.icon || "📦"}</div>
        <h3 class="font-bold text-lg mb-2">${caseData.name}</h3>
        <div class="flex items-center justify-center gap-2">
          <span class="text-purple-300">${caseData.cost}</span>
          <span class="text-xl">💎</span>
        </div>
      </div>
    `

    caseElement.addEventListener("click", () => onCaseSelect(caseData))
    casesGrid.appendChild(caseElement)
  })
}

export function renderPossiblePrizes(caseData) {
  const possiblePrizes = document.getElementById("possiblePrizes")
  if (!possiblePrizes) return

  // Адаптируемся под серверный формат данных
  let prizes = []

  // Сначала пробуем possible_prizes (если есть)
  if (caseData.possible_prizes && caseData.possible_prizes.length) {
    prizes = caseData.possible_prizes
  }
  // Затем пробуем presents (серверный формат)
  else if (caseData.presents && caseData.presents.length) {
    prizes = caseData.presents.map((present) => ({
      name: `${present.cost} фантиков`,
      cost: present.cost,
      icon: "💎",
      probability: present.probability || 10,
      chance: present.probability || 10,
    }))
  }
  // Если ничего нет, генерируем базовые призы
  else {
    prizes = generateDefaultPrizesForDisplay(caseData.cost)
  }

  if (!prizes.length) return

  possiblePrizes.innerHTML = ""

  prizes.forEach((prize, index) => {
    const prizeElement = document.createElement("div")

    // Определяем цвет в зависимости от стоимости приза
    let bgGradient = "from-green-600 to-green-800" // По умолчанию зеленый

    if (prize.cost >= 2000) {
      bgGradient = "from-yellow-600 to-yellow-800" // Золотой для очень дорогих
    } else if (prize.cost >= 1000) {
      bgGradient = "from-purple-600 to-purple-800" // Фиолетовый для дорогих
    } else if (prize.cost >= 200) {
      bgGradient = "from-blue-600 to-blue-800" // Синий для средних
    }

    prizeElement.className = `bg-gradient-to-br ${bgGradient} rounded-lg p-3 text-white text-center shadow-lg border border-purple-500/30 hover:scale-105 transition-all duration-300`

    // Нормализуем отображение шанса
    const chance = prize.chance || prize.probability || 0
    const chanceText = chance > 0 ? `${chance}%` : "Редкий"

    prizeElement.innerHTML = `
      <div class="text-2xl mb-1">${prize.icon || "💎"}</div>
      <div class="text-xs font-semibold">${prize.name || `${prize.cost} фантиков`}</div>
      <div class="text-xs text-gray-300 mt-1">${chanceText}</div>
    `

    // Добавляем задержку анимации для каждого приза
    prizeElement.style.animationDelay = `${index * 0.1}s`

    possiblePrizes.appendChild(prizeElement)
  })
}

// Вспомогательная функция для генерации призов по умолчанию
function generateDefaultPrizesForDisplay(caseCost) {
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
