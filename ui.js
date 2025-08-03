// Модуль для управления интерфейсом
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

  switch (type) {
    case "success":
      notification.className += " bg-green-500 text-white"
      break
    case "error":
      notification.className += " bg-red-500 text-white"
      break
    case "warning":
      notification.className += " bg-yellow-500 text-white"
      break
    default:
      notification.className += " bg-blue-500 text-white"
  }

  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.classList.remove("translate-x-full")
  }, 100)

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

    if (isError) {
      statusDiv.className = statusDiv.className.replace("bg-green-500", "bg-red-500")
      statusDiv.className = statusDiv.className.replace("bg-blue-500", "bg-red-500")
      if (!statusDiv.className.includes("bg-red-500")) {
        statusDiv.className += " bg-red-500"
      }
    } else {
      statusDiv.className = statusDiv.className.replace("bg-red-500", "bg-green-500")
      statusDiv.className = statusDiv.className.replace("bg-blue-500", "bg-green-500")
      if (!statusDiv.className.includes("bg-green-500")) {
        statusDiv.className += " bg-green-500"
      }
    }
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
      "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-white shadow-lg border border-purple-500/30 cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all"

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
  if (!possiblePrizes || !caseData?.possible_prizes) return

  possiblePrizes.innerHTML = ""

  caseData.possible_prizes.forEach((prize, index) => {
    const prizeElement = document.createElement("div")
    
    // Определяем цвет в зависимости от стоимости приза
    let bgGradient = ""
    
    if (prize.cost >= 2000) {
      bgGradient = "from-yellow-600 to-yellow-800" // Золотой для очень дорогих
    } else if (prize.cost >= 1000) {
      bgGradient = "from-purple-600 to-purple-800" // Фиолетовый для дорогих
    } else if (prize.cost >= 200) {
      bgGradient = "from-blue-600 to-blue-800" // Синий для средних
    } else {
      bgGradient = "from-green-600 to-green-800" // Зеленый для дешевых
    }

    prizeElement.className = `bg-gradient-to-br ${bgGradient} rounded-lg p-3 text-white text-center shadow-lg border border-purple-500/30 hover:scale-105 transition-all duration-300`

    prizeElement.innerHTML = `
      <div class="text-2xl mb-1">${prize.icon || "💎"}</div>
      <div class="text-xs font-semibold">${prize.name}</div>
      <div class="text-xs text-gray-300 mt-1">${prize.chance ? `${prize.chance}%` : "Редкий"}</div>
    `

    // Добавляем задержку анимации для каждого приза
    prizeElement.style.animationDelay = `${index * 0.1}s`

    possiblePrizes.appendChild(prizeElement)
  })

}
