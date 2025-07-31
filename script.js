const API_BASE = (() => {
  if (window.location.hostname === "mtkache09.github.io") {
    return "https://telegramcases-production.up.railway.app"
  }
  return "http://localhost:8000"
})()

const tg = window.Telegram?.WebApp

console.log("=== TELEGRAM WEB APP DEBUG ===")
console.log("Telegram WebApp доступен:", !!tg)
if (tg) {
  console.log("Init Data:", tg.initData)
  console.log("Init Data Unsafe:", tg.initDataUnsafe)
  console.log("User:", tg.initDataUnsafe?.user)
  console.log("Platform:", tg.platform)
  console.log("Version:", tg.version)
}

if (tg) {
  tg.ready()
  tg.expand()
  tg.MainButton.hide()
  tg.setHeaderColor("#1a1a2e")
  tg.setBackgroundColor("#16213e")
}

// Глобальные переменные
let tonConnectUI = null
let walletData = null
let currentCase = null
let isSpinning = false
let userFantics = 0
let selectedDepositAmount = null

// Функция для получения авторизационных заголовков
function getAuthHeaders() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  // Получаем initData из Telegram WebApp
  let initData = null

  if (window.Telegram?.WebApp?.initData) {
    initData = window.Telegram.WebApp.initData
    console.log("✅ Используем Telegram WebApp initData")
    console.log("📱 Init Data длина:", initData.length)
    console.log("📱 Init Data preview:", initData.substring(0, 100) + "...")
  } else if (window.location.search.includes("initData=")) {
    // Для тестирования можно передать initData через URL
    const urlParams = new URLSearchParams(window.location.search)
    initData = urlParams.get("initData")
    console.log("✅ Используем initData из URL параметров")
    console.log("📱 Init Data preview:", initData.substring(0, 100) + "...")
  }

  if (initData) {
    // Используем правильный формат: Authorization: Bearer <initData>
    headers["Authorization"] = `Bearer ${initData}`
    console.log("🔐 Заголовок авторизации установлен")
  } else {
    console.warn("⚠️ Telegram WebApp initData недоступен")
  }

  return headers
}

// Функция для проверки доступности авторизации
function isAuthAvailable() {
  return !!window.Telegram?.WebApp?.initData || window.location.search.includes("initData=")
}

// Улучшенная функция получения User ID
const getUserId = () => {
  if (tg?.initDataUnsafe?.user?.id) {
    const userId = tg.initDataUnsafe.user.id
    console.log("✅ Telegram User ID:", userId)
    return userId
  }

  // Попробуем получить из URL параметров для тестирования
  if (window.location.search.includes("user_id=")) {
    const urlParams = new URLSearchParams(window.location.search)
    const userId = Number.parseInt(urlParams.get("user_id"))
    if (userId) {
      console.log("✅ User ID из URL:", userId)
      return userId
    }
  }

  console.warn("⚠️ Telegram User ID не найден, используем тестовый: 123456")
  return 123456
}

// Функция для обработки ошибок API
function handleApiError(response, error) {
  switch (response?.status) {
    case 401:
      showNotification("❌ Ошибка авторизации. Перезапустите приложение в Telegram", "error", 8000)
      console.error("401 Unauthorized:", error)
      // Показываем детали ошибки для отладки
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

// Функция для показа уведомлений
function showNotification(message, type = "info", duration = 3000) {
  // Создаем элемент уведомления
  const notification = document.createElement("div")
  notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`
  
  // Настраиваем стили в зависимости от типа
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
  
  // Анимация появления
  setTimeout(() => {
    notification.classList.remove("translate-x-full")
  }, 100)
  
  // Автоматическое удаление
  setTimeout(() => {
    notification.classList.add("translate-x-full")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }, duration)
}

// Функция для показа статуса соединения
function showConnectionStatus(message, isError = false) {
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

// Функция для получения баланса пользователя
async function fetchUserFantics() {
  try {
    console.log("🔄 Запрос баланса пользователя...")
    
    const userId = getUserId()
    const response = await fetch(`${API_BASE}/fantics/${userId}`, {
      headers: getAuthHeaders(),
    })
    
    if (response.ok) {
      const data = await response.json()
      userFantics = data.fantics || 0
      console.log("✅ Баланс получен:", userFantics)
      updateFanticsDisplay()
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка получения баланса:", response.status, errorData)
      handleApiError(response, errorData)
    }
  } catch (error) {
    console.error("❌ Ошибка сети при получении баланса:", error)
    showNotification("❌ Ошибка сети при получении баланса", "error", 5000)
  }
}

// Функция для получения списка кейсов
async function fetchCases() {
  try {
    console.log("🔄 Запрос списка кейсов...")
    
    const response = await fetch(`${API_BASE}/cases`, {
      headers: getAuthHeaders(),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Кейсы получены:", data)
      renderCases(data)
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка получения кейсов:", response.status, errorData)
      handleApiError(response, errorData)
    }
  } catch (error) {
    console.error("❌ Ошибка сети при получении кейсов:", error)
    showNotification("❌ Ошибка сети при получении кейсов", "error", 5000)
  }
}

// Функция для тестирования соединения
async function testConnection() {
  try {
    console.log("🔄 Тестирование соединения с сервером...")
    
    const response = await fetch(`${API_BASE}/`, {
      headers: getAuthHeaders(),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Соединение с сервером установлено:", data)
      showConnectionStatus("✅ Соединение с сервером установлено", false)
    } else {
      console.error("❌ Ошибка соединения с сервером:", response.status)
      showConnectionStatus("❌ Ошибка соединения с сервером", true)
    }
  } catch (error) {
    console.error("❌ Ошибка сети при тестировании соединения:", error)
    showConnectionStatus("❌ Ошибка сети при тестировании соединения", true)
  }
}

// Функция для открытия кейса через API
async function openCaseAPI(caseId) {
  try {
    console.log("🔄 Открытие кейса:", caseId)
    
    const response = await fetch(`${API_BASE}/open_case/${caseId}`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Кейс открыт:", data)
      
      // Обновляем баланс пользователя
      userFantics = (userFantics || 0) - data.spent + data.gift
      updateFanticsDisplay()
      
      return data
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка открытия кейса:", response.status, errorData)
      handleApiError(response, errorData)
      return null
    }
  } catch (error) {
    console.error("❌ Ошибка сети при открытии кейса:", error)
    showNotification("❌ Ошибка сети при открытии кейса", "error", 5000)
    return null
  }
}

// Функция для добавления фантиков
async function addFantics(amount) {
  try {
    console.log("🔄 Добавление фантиков:", amount)
    
    const userId = getUserId()
    const response = await fetch(`${API_BASE}/fantics/add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, amount }),
    })
    
    if (response.ok) {
      const data = await response.json()
      // Обновляем баланс на основе ответа сервера
      if (data.fantics !== undefined) {
        userFantics = data.fantics
      } else {
        // Если сервер не возвращает новый баланс, добавляем к текущему
        userFantics = (userFantics || 0) + amount
      }
      console.log("✅ Фантики добавлены:", userFantics)
      updateFanticsDisplay()
      return true
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка добавления фантиков:", response.status, errorData)
      handleApiError(response, errorData)
      return false
    }
  } catch (error) {
    console.error("❌ Ошибка сети при добавлении фантиков:", error)
    showNotification("❌ Ошибка сети при добавлении фантиков", "error", 5000)
    return false
  }
}

// Функция для обновления отображения фантиков
function updateFanticsDisplay() {
  const userStarsElements = document.querySelectorAll("#userStars, #userStarsCase, #modalUserStars")
  userStarsElements.forEach((element) => {
    if (element) {
      element.textContent = userFantics
    }
  })
}

// Функция для обновления кнопки открытия
function updateOpenButton() {
  const openBtn = document.getElementById("openCaseBtn")
  const demoMode = document.getElementById("demoMode")
  const openBtnText = document.getElementById("openBtnText")
  
  if (!openBtn || !demoMode || !openBtnText) return
  
  if (demoMode.checked) {
    openBtn.disabled = false
    openBtnText.textContent = "Открыть кейс (Демо)"
  } else {
    if (userFantics >= (currentCase?.cost || 0)) {
      openBtn.disabled = false
      openBtnText.textContent = `Открыть кейс (${currentCase?.cost || 0} 💎)`
    } else {
      openBtn.disabled = true
      openBtnText.textContent = "Недостаточно фантиков"
    }
  }
}

// Функция для рендеринга призов в скролле
function renderPrizeScroll(caseData, winningGiftCost) {
  const prizeScroll = document.getElementById("prizeScroll")
  if (!prizeScroll || !caseData) return
  
  prizeScroll.innerHTML = ""
  
  // Создаем массив призов для отображения
  const prizes = []
  
  // Добавляем призы из возможных призов
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
  
  // Создаем элементы призов
  prizes.forEach((prize) => {
    const prizeElement = document.createElement("div")
    prizeElement.className = "flex-shrink-0 w-32 h-32 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex flex-col items-center justify-center text-white shadow-lg border border-purple-500/30"
    
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

// Функция для рендеринга кейсов
function renderCases(cases) {
  const casesGrid = document.getElementById("casesGrid")
  if (!casesGrid) return
  
  casesGrid.innerHTML = ""
  
  cases.forEach((caseData) => {
    const caseElement = document.createElement("div")
    caseElement.className = "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-white shadow-lg border border-purple-500/30 cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all"
    
    caseElement.innerHTML = `
      <div class="text-center">
        <div class="text-3xl mb-2">${caseData.icon || "📦"}</div>
        <h3 class="font-bold text-lg mb-2">${caseData.name}</h3>
        <p class="text-sm text-purple-200 mb-3">${caseData.description}</p>
        <div class="flex items-center justify-center gap-2">
          <span class="text-purple-300">${caseData.cost}</span>
          <span class="text-xl">💎</span>
        </div>
      </div>
    `
    
    caseElement.addEventListener("click", () => openCasePage(caseData))
    casesGrid.appendChild(caseElement)
  })
}

// Функция для рендеринга возможных призов
function renderPossiblePrizes(caseData) {
  const possiblePrizes = document.getElementById("possiblePrizes")
  if (!possiblePrizes || !caseData?.possible_prizes) return
  
  possiblePrizes.innerHTML = ""
  
  caseData.possible_prizes.forEach((prize) => {
    const prizeElement = document.createElement("div")
    prizeElement.className = "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-3 text-white text-center shadow-lg border border-purple-500/30"
    
    prizeElement.innerHTML = `
      <div class="text-2xl mb-1">${prize.icon || "🎁"}</div>
      <div class="text-xs font-semibold">${prize.name}</div>
      <div class="text-xs text-purple-300">${prize.cost} 💎</div>
    `
    
    possiblePrizes.appendChild(prizeElement)
  })
}

// Функция для рендеринга вариантов пополнения
function renderDepositAmounts() {
  const depositAmounts = document.getElementById("depositAmounts")
  if (!depositAmounts) return
  
  const amounts = [100, 500, 1000, 2000, 5000, 10000]
  
  depositAmounts.innerHTML = ""
  
  amounts.forEach((amount) => {
    const amountElement = document.createElement("div")
    amountElement.className = "bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-white text-center cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all border border-purple-500/30"
    
    amountElement.innerHTML = `
      <div class="text-2xl mb-1">💎</div>
      <div class="font-bold text-lg">${amount}</div>
      <div class="text-xs text-purple-300">Фантиков</div>
    `
    
    amountElement.addEventListener("click", (event) => selectDepositAmount(amount, event))
    depositAmounts.appendChild(amountElement)
  })
}

// Функция для выбора суммы пополнения
function selectDepositAmount(amount, event) {
  selectedDepositAmount = amount
  
  // Убираем выделение со всех элементов
  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })
  
  // Добавляем выделение к выбранному элементу
  if (event.target.closest("div")) {
    event.target.closest("div").classList.add("selected-amount", "ring-2", "ring-purple-400")
  }
  
  updateDepositButton()
}

// Функция для обновления кнопки пополнения
function updateDepositButton() {
  const confirmBtn = document.getElementById("confirmDepositBtn")
  const depositBtnText = document.getElementById("depositBtnText")
  const customAmount = document.getElementById("customAmount")
  
  if (!confirmBtn || !depositBtnText) return
  
  const amount = selectedDepositAmount || (customAmount ? parseInt(customAmount.value) || 0 : 0)
  
  if (amount > 0) {
    confirmBtn.disabled = false
    depositBtnText.textContent = `Пополнить на ${amount} 💎`
  } else {
    confirmBtn.disabled = true
    depositBtnText.textContent = "Выберите сумму"
  }
}

// Функция для открытия модального окна пополнения
function openDepositModal() {
  document.getElementById("depositModal").classList.remove("hidden")
  document.getElementById("modalUserStars").textContent = userFantics
  renderDepositAmounts()
  updateDepositButton()
}

// Функция для закрытия модального окна пополнения
function closeDepositModal() {
  document.getElementById("depositModal").classList.add("hidden")
  selectedDepositAmount = null
  const customAmount = document.getElementById("customAmount")
  if (customAmount) {
    customAmount.value = ""
  }
  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })
}

// Функция для обработки пополнения
async function processDeposit() {
  const amount = selectedDepositAmount || (document.getElementById("customAmount") ? parseInt(document.getElementById("customAmount").value) || 0 : 0)
  
  if (amount <= 0) {
    showNotification("Выберите сумму для пополнения", "warning")
    return
  }
  
  const success = await addFantics(amount)
  if (success) {
    showNotification(`✅ Баланс пополнен на ${amount} фантиков!`, "success")
    closeDepositModal()
  }
}

// Функция для открытия страницы кейса
function openCasePage(caseData) {
  currentCase = caseData
  document.getElementById("mainPage").classList.add("hidden")
  document.getElementById("casePage").classList.remove("hidden")
  
  document.getElementById("caseTitle").textContent = caseData.name
  document.getElementById("userStarsCase").textContent = userFantics
  
  renderPrizeScroll(caseData, 0)
  renderPossiblePrizes(caseData)
  updateOpenButton()
}

// Функция для анимации вращения призов
async function spinPrizes() {
  if (isSpinning) return
  
  const openBtn = document.getElementById("openCaseBtn")
  const demoMode = document.getElementById("demoMode")
  
  if (!openBtn || !demoMode) return
  
  // Проверяем, достаточно ли фантиков (если не демо режим)
  if (!demoMode.checked && userFantics < (currentCase?.cost || 0)) {
    showNotification("Недостаточно фантиков для открытия кейса", "warning")
    return
  }
  
  isSpinning = true
  openBtn.disabled = true
  openBtn.classList.add("animate-pulse")
  
  try {
    // Открываем кейс через API
    const result = await openCaseAPI(currentCase.id)
    
    if (!result) {
      throw new Error("Не удалось открыть кейс")
    }
    
    // Обновляем баланс
    userFantics = result.new_balance || userFantics
    updateFanticsDisplay()
    
    // Анимация вращения
    const prizeScroll = document.getElementById("prizeScroll")
    if (prizeScroll) {
      const scrollWidth = prizeScroll.scrollWidth
      const containerWidth = prizeScroll.parentElement.offsetWidth
      const centerPosition = scrollWidth / 2 - containerWidth / 2
      
      // Находим выигрышный приз
      const winningPrize = result.prize
      let targetPosition = centerPosition
      
      if (winningPrize) {
        // Ищем элемент с выигрышным призом
        const prizeElements = prizeScroll.children
        for (let i = 0; i < prizeElements.length; i++) {
          const prizeElement = prizeElements[i]
          const prizeName = prizeElement.querySelector("div:nth-child(2)")?.textContent
          if (prizeName === winningPrize.name) {
            targetPosition = centerPosition + (i * 128) // 128px - ширина элемента приза
            break
          }
        }
      }
      
      // Анимация прокрутки
      const startTime = performance.now()
      const duration = 3000
      const startPosition = prizeScroll.scrollLeft
      
      const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Функция плавности (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        prizeScroll.scrollLeft = startPosition + (targetPosition - startPosition) * easeOut
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll)
        } else {
          // Показываем результат
          setTimeout(() => {
            showNotification(
              `🎉 Поздравляем! Вы выиграли ${winningPrize?.name || "приз"}!`,
              "success",
              5000
            )
            
            // Сбрасываем состояние
            openBtn.disabled = false
            openBtn.classList.remove("animate-pulse")
            updateOpenButton()
            isSpinning = false
          }, 500)
        }
      }
      
      requestAnimationFrame(animateScroll)
    }
  } catch (error) {
    console.error("❌ Ошибка при открытии кейса:", error)
    showNotification("❌ Ошибка при открытии кейса", "error")
    
    // Сбрасываем состояние
    openBtn.disabled = false
    openBtn.classList.remove("animate-pulse")
    updateOpenButton()
    isSpinning = false
  }
}

// Инициализация TON Connect UI
async function initTonConnect() {
  try {
    console.log("🔄 Инициализация TON Connect UI...")
    
    // Создаем локальный URL для manifest
    const manifestBlob = new Blob([JSON.stringify({
      "url": window.location.origin,
      "name": "Fantics Casino - Telegram Mini App",
      "iconUrl": "https://ton.org/download/ton_symbol.png",
      "termsOfUseUrl": window.location.origin,
      "privacyPolicyUrl": window.location.origin,
      "features": ["ton_addr", "ton_proof"],
      "items": [
        {
          "name": "ton_addr",
          "description": "Request wallet address"
        },
        {
          "name": "ton_proof",
          "description": "Request TON proof for authentication"
        }
      ]
    })], { type: 'application/json' });
    
    const manifestUrl = URL.createObjectURL(manifestBlob);
    console.log("Создан локальный manifest URL:", manifestUrl)
    
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: manifestUrl,
      buttonRootId: "ton-connect-ui"
    })
    
    // Слушаем изменения статуса кошелька
    tonConnectUI.onStatusChange(wallet => {
          console.log("Статус кошелька изменился:", wallet)
    if (wallet && wallet.account) {
      console.log("✅ Кошелек подключен:", {
        address: wallet.account.address,
        chain: wallet.account.chain,
        publicKey: wallet.account.publicKey,
        hasProof: !!wallet.proof
      })
      processWalletConnection(wallet)
    } else {
        // Кошелек отключен
        walletData = null
        const connectBtn = document.getElementById("connectTonWalletBtn")
        if (connectBtn) {
          connectBtn.disabled = false
          connectBtn.innerHTML = `
            <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
              <path d="M12 6v6l4 2"></path>
            </svg>
            Подключить TON Кошелек
          `
        }
        showNotification("⚠️ TON кошелек отключен", "info", 3000)
      }
    })
    
    // Проверяем, подключен ли кошелек
    const wallet = tonConnectUI.wallet
    if (wallet && wallet.account) {
      console.log("🔄 Кошелек уже подключен при инициализации")
      processWalletConnection(wallet)
    }
    
    console.log("✅ TON Connect UI инициализирован")
    
    // Сохраняем URL для очистки
    window.manifestUrl = manifestUrl
    
  } catch (error) {
    console.error("❌ Ошибка инициализации TON Connect:", error)
    showNotification(`❌ Ошибка TON Connect: ${error.message}`, "error", 5000)
  }
}

// Обработка подключения кошелька
async function processWalletConnection(wallet) {
  try {
    if (!wallet.account) {
      throw new Error("Аккаунт кошелька недоступен")
    }
    
    // Формируем данные в формате, который ожидает бэкенд
    walletData = {
      wallet_address: wallet.account.address,
      user_id: getUserId(),
      network: wallet.account.chain.toString(), // Преобразуем в строку
      public_key: wallet.account.publicKey
    }
    
    // Добавляем proof данные, если доступны
    if (wallet.proof) {
      console.log("🔐 TON Proof получен:", wallet.proof)
      walletData.proof = {
        timestamp: wallet.proof.timestamp,
        domain: {
          lengthBytes: wallet.proof.domain.lengthBytes,
          value: wallet.proof.domain.value
        },
        signature: wallet.proof.signature,
        payload: wallet.proof.payload,
        pubkey: wallet.proof.pubkey || wallet.account.publicKey
      }
    } else {
      console.log("⚠️ TON Proof не получен")
    }
    
    // Обновляем кнопку
    const connectBtn = document.getElementById("connectTonWalletBtn")
    if (connectBtn) {
      connectBtn.disabled = true
      connectBtn.innerHTML = `
        <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
        ✅ Подключен
      `
    }
    
    // Отправляем данные на сервер
    await sendWalletToBackend()
    
  } catch (error) {
    console.error("❌ Ошибка обработки подключения кошелька:", error)
    showNotification(`❌ Ошибка подключения кошелька: ${error.message}`, "error", 5000)
  }
}

// Отправка данных кошелька на сервер
async function sendWalletToBackend() {
  if (!walletData) {
    showNotification("Нет данных кошелька для отправки", "warning")
    return
  }
  
  try {
    console.log("🔄 Отправка данных кошелька на сервер...")
    console.log("📤 Данные для отправки:", JSON.stringify(walletData, null, 2))
    
    const headers = {
      ...getAuthHeaders(),
      "Content-Type": "application/json"
    }
    console.log("📤 Заголовки запроса:", headers)
    
    const response = await fetch(`${API_BASE}/ton/connect`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(walletData)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ Данные кошелька отправлены успешно:", data)
      showNotification("✅ TON кошелек подключен и сохранен!", "success", 3000)
      
      // Обновляем кнопку с информацией о подключенном кошельке
      const connectBtn = document.getElementById("connectTonWalletBtn")
      if (connectBtn) {
        connectBtn.innerHTML = `
          <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
            <path d="M12 6v6l4 2"></path>
          </svg>
          ✅ ${walletData.wallet_address.substring(0, 6)}...${walletData.wallet_address.substring(walletData.wallet_address.length - 4)}
        `
      }
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка отправки данных кошелька:", response.status, errorData)
      showNotification(
        `❌ Ошибка сохранения кошелька: ${errorData.detail || "Неизвестная ошибка"}`,
        "error",
        5000
      )
      
      // Если ошибка связана с TON Proof, предлагаем попробовать без него
      if (errorData.detail && errorData.detail.includes("TON Proof")) {
        console.log("⚠️ TON Proof не прошел проверку, попробуем подключить без него")
        // Можно добавить логику для повторной попытки без proof
      }
    }
  } catch (error) {
    console.error("❌ Ошибка сети при отправке данных кошелька:", error)
    showNotification("❌ Ошибка сети при сохранении кошелька", "error", 5000)
  }
}

// Функция для возврата назад
function goBack() {
  document.getElementById("casePage").classList.add("hidden")
  document.getElementById("mainPage").classList.remove("hidden")
  currentCase = null
}

// Event listeners
document.getElementById("backBtn").addEventListener("click", goBack)
document.getElementById("openCaseBtn").addEventListener("click", spinPrizes)
document.getElementById("demoMode").addEventListener("change", updateOpenButton)

// Deposit modal event listeners
document.getElementById("depositBtn").addEventListener("click", openDepositModal)
document.getElementById("closeDepositModal").addEventListener("click", closeDepositModal)
document.getElementById("confirmDepositBtn").addEventListener("click", processDeposit)

document.getElementById("customAmount").addEventListener("input", () => {
  selectedDepositAmount = null
  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })
  updateDepositButton()
})

document.getElementById("depositModal").addEventListener("click", (e) => {
  if (e.target.id === "depositModal") {
    closeDepositModal()
  }
})

// Функция для очистки ресурсов
function cleanup() {
  if (window.manifestUrl) {
    URL.revokeObjectURL(window.manifestUrl)
    console.log("🧹 Manifest URL очищен")
  }
}

// Инициализация приложения
async function initApp() {
  console.log("DEBUG: Начало initApp")
  console.log("🚀 Инициализация приложения...")
  console.log("API URL:", API_BASE)
  console.log("Авторизация доступна:", isAuthAvailable() ? "✅ Да" : "❌ Нет")
  
  if (window.Telegram?.WebApp?.initData) {
    console.log("📱 Init Data длина:", window.Telegram.WebApp.initData.length)
    // Показываем первые и последние символы для отладки
    const initData = window.Telegram.WebApp.initData
    console.log("📱 Init Data preview:", initData.substring(0, 50) + "..." + initData.substring(initData.length - 50))
  }
  
  // Показываем предупреждение если нет авторизации
  if (!isAuthAvailable()) {
    showNotification("⚠️ Для полной функциональности откройте в Telegram", "info", 8000)
  }
  
  // Запускаем тест соединения для отладки
  if (window.location.search.includes("debug=true")) {
    await testConnection()
  }
  
  // Инициализируем TON Connect
  await initTonConnect()
  
  await fetchUserFantics()
  await fetchCases()
  
  console.log("✅ Приложение готово!")
  console.log("DEBUG: Конец initApp")
}

initApp()

// Очистка при закрытии страницы
window.addEventListener('beforeunload', cleanup)
