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
  } else if (window.location.search.includes("initData=")) {
    // Для тестирования можно передать initData через URL
    const urlParams = new URLSearchParams(window.location.search)
    initData = urlParams.get("initData")
    console.log("✅ Используем initData из URL параметров")
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
      showNotification("❌ Доступ запрещен. Вы можете управлять только своим аккаунтом", "error", 5000)
      console.error("403 Forbidden:", error)
      break
    case 404:
      showNotification("❌ Ресурс не найден", "error")
      console.error("404 Not Found:", error)
      break
    case 400:
      // Обрабатываем специфичные ошибки бизнес-логики
      const message = error?.detail || "Неверный запрос"
      showNotification(`❌ ${message}`, "error", 5000)
      console.error("400 Bad Request:", error)
      break
    case 500:
      showNotification("❌ Ошибка сервера. Попробуйте позже", "error")
      console.error("500 Server Error:", error)
      break
    default:
      showNotification(`❌ Ошибка: ${error?.detail || error?.message || "Неизвестная ошибка"}`, "error")
      console.error("API Error:", error)
  }
}

let userFantics = 0
let cases = []
let currentCase = null
let isSpinning = false
let selectedDepositAmount = null

const depositAmounts = [
  { amount: 1000, bonus: 0, popular: false },
  { amount: 2500, bonus: 250, popular: false },
  { amount: 5000, bonus: 750, popular: true },
  { amount: 10000, bonus: 2000, popular: false },
  { amount: 25000, bonus: 5000, popular: false },
  { amount: 50000, bonus: 15000, popular: false },
]

// Функция для показа красивых уведомлений вместо alert
function showNotification(message, type = "info", duration = 3000) {
  // Удаляем предыдущие уведомления
  const existingNotifications = document.querySelectorAll(".notification")
  existingNotifications.forEach((notification) => {
    notification.remove()
  })

  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message

  document.body.appendChild(notification)

  // Автоматически скрываем уведомление
  setTimeout(() => {
    notification.classList.add("hide")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 300)
  }, duration)
}

function showConnectionStatus(message, isError = false) {
  const statusDiv = document.getElementById("connectionStatus")
  const statusText = document.getElementById("statusText")

  if (!statusDiv || !statusText) {
    console.error("DEBUG: Элементы статуса подключения не найдены!")
    return
  }

  statusText.textContent = message
  statusDiv.className = `mb-4 p-3 rounded-lg text-center text-sm font-medium ${
    isError
      ? "bg-red-900/50 text-red-300 border border-red-700/50"
      : "bg-blue-900/50 text-blue-300 border border-blue-700/50"
  }`
  statusDiv.classList.remove("hidden")

  if (!isError) {
    setTimeout(() => {
      statusDiv.classList.add("hidden")
    }, 3000)
  }
}

async function fetchUserFantics() {
  console.log("DEBUG: Начало fetchUserFantics")
  try {
    const userId = getUserId()
    const url = `${API_BASE}/fantics/${userId}`

    console.log("📡 Запрос баланса:")
    console.log("   URL:", url)
    console.log("   User ID:", userId)
    console.log("   API Base:", API_BASE)
    console.log("   Авторизация доступна:", isAuthAvailable())

    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
      mode: "cors",
    })

    console.log("📡 Ответ сервера:", response.status, response.statusText)

    if (response.ok) {
      const data = await response.json()
      console.log("📡 Данные получены:", data)
      userFantics = data.fantics
      updateFanticsDisplay()
      console.log("✅ Баланс получен:", userFantics)
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка получения баланса:", response.status, errorData)
      handleApiError(response, errorData)
      showConnectionStatus("Ошибка получения баланса", true)
    }
  } catch (error) {
    console.error("❌ Ошибка API:", error)
    console.error("   Тип ошибки:", error.name)
    console.error("   Сообщение:", error.message)

    if (!isAuthAvailable()) {
      showConnectionStatus("Требуется авторизация Telegram", true)
      showNotification("⚠️ Приложение работает только в Telegram", "error", 8000)
    } else {
      showConnectionStatus("Сервер недоступен", true)
    }

    // В случае ошибки показываем нулевой баланс
    userFantics = 0
    updateFanticsDisplay()
  }
  console.log("DEBUG: Конец fetchUserFantics")
}

async function fetchCases() {
  console.log("DEBUG: Начало fetchCases")
  try {
    const url = `${API_BASE}/cases`
    console.log("📡 Запрос кейсов:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
      mode: "cors",
    })

    console.log("📡 Ответ сервера (кейсы):", response.status)

    if (response.ok) {
      const rawCases = await response.json()
      console.log("📡 Сырые данные кейсов:", rawCases)

      // Преобразуем новый формат в старый для совместимости
      cases = rawCases.map((caseData) => ({
        ...caseData,
        possible_rewards: caseData.presents.map((present) => ({
          cost: present.cost,
          probability: present.probability,
        })),
      }))

      console.log("📡 Преобразованные кейсы:", cases)
      renderCases()
      console.log("✅ Кейсы загружены:", cases.length)
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Ошибка загрузки кейсов" }))
      console.error("❌ Ошибка получения кейсов:", response.status, errorData)
      handleApiError(response, errorData)
      showConnectionStatus("Ошибка загрузки кейсов", true)
      // Показываем пустой список кейсов
      cases = []
      renderCases()
    }
  } catch (error) {
    console.error("❌ Ошибка получения кейсов:", error)
    showConnectionStatus("Сервер недоступен", true)
    // Показываем пустой список кейсов
    cases = []
    renderCases()
  }
  console.log("DEBUG: Конец fetchCases")
}

// Функция для тестирования соединения и авторизации
async function testConnection() {
  console.log("=== ТЕСТ СОЕДИНЕНИЯ И АВТОРИЗАЦИИ ===")
  console.log("API Base:", API_BASE)
  console.log("User ID:", getUserId())
  console.log("Авторизация доступна:", isAuthAvailable())
  console.log("Init Data:", window.Telegram?.WebApp?.initData ? "Есть" : "Нет")

  // Показываем заголовки для отладки
  const headers = getAuthHeaders()
  console.log("Заголовки запроса:", headers)

  try {
    // Тест 1: Проверка основного API (не требует авторизации)
    console.log("📡 Тест 1: Проверка /")
    const response1 = await fetch(`${API_BASE}/`)
    const data1 = await response1.json()
    console.log("✅ Основной API:", data1)

    // Тест 2: Проверка fantics (требует авторизации)
    console.log("📡 Тест 2: Проверка /fantics/")
    const userId = getUserId()
    const response2 = await fetch(`${API_BASE}/fantics/${userId}`, {
      headers: getAuthHeaders(),
    })

    if (response2.ok) {
      const data2 = await response2.json()
      console.log("✅ Fantics endpoint:", data2)
    } else {
      const error2 = await response2.json()
      console.log("❌ Fantics endpoint error:", response2.status, error2)
    }

    // Тест 3: Проверка кейсов (может не требовать авторизации)
    console.log("📡 Тест 3: Проверка /cases")
    const response3 = await fetch(`${API_BASE}/cases`, {
      headers: getAuthHeaders(),
    })

    if (response3.ok) {
      const data3 = await response3.json()
      console.log("✅ Cases endpoint:", data3.length, "кейсов")
    } else {
      const error3 = await response3.json()
      console.log("❌ Cases endpoint error:", response3.status, error3)
    }
  } catch (error) {
    console.error("❌ Ошибка тестирования:", error)
  }
}

async function openCaseAPI(caseId) {
  try {
    const userId = getUserId()
    const url = `${API_BASE}/open_case/${caseId}`

    console.log("📡 Открытие кейса:", url)
    console.log("   User ID:", userId)
    console.log("   Case ID:", caseId)
    showConnectionStatus("Открытие кейса...")

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
      // Убираем body - user_id должен браться из авторизации
      mode: "cors",
    })

    console.log("📡 Ответ сервера:", response.status, response.statusText)

    if (response.ok) {
      const result = await response.json()
      console.log("✅ Кейс открыт:", result)
      showConnectionStatus("Кейс открыт!")
      return result
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка открытия кейса:", response.status, errorData)
      handleApiError(response, errorData)
      throw new Error(errorData.detail || "Ошибка открытия кейса")
    }
  } catch (error) {
    console.error("❌ Ошибка открытия кейса:", error)
    showConnectionStatus(`Ошибка: ${error.message}`, true)
    throw error
  }
}

async function addFantics(amount) {
  try {
    const userId = getUserId()
    console.log("📡 Пополнение баланса:", amount, "для пользователя:", userId)

    // Проверяем доступность авторизации для операций с деньгами
    if (!isAuthAvailable()) {
      throw new Error("Пополнение доступно только в Telegram WebApp")
    }

    showConnectionStatus("Пополнение баланса...")

    const response = await fetch(`${API_BASE}/fantics/add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amount: amount,
        // Убираем user_id - он должен браться из авторизации
      }),
      mode: "cors",
    })

    console.log("📡 Ответ сервера (пополнение):", response.status)

    if (response.ok) {
      const result = await response.json()
      console.log("✅ Пополнение успешно:", result)
      showConnectionStatus("Баланс пополняется...")

      // Определяем задержку в зависимости от режима (RabbitMQ или прямые транзакции)
      const delay = API_BASE.includes("localhost") ? 1000 : 3000
      setTimeout(() => {
        fetchUserFantics()
      }, delay)
      return true
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Ошибка пополнения" }))
      console.error("❌ Ошибка пополнения:", response.status, errorData)
      handleApiError(response, errorData)
      return false
    }
  } catch (error) {
    console.error("❌ Ошибка пополнения:", error)
    showConnectionStatus("Ошибка пополнения", true)
    showNotification(`❌ ${error.message}`, "error")
    return false
  }
}

function updateFanticsDisplay() {
  document.getElementById("userStars").textContent = userFantics.toLocaleString()
  document.getElementById("userStarsCase").textContent = userFantics.toLocaleString()
  document.getElementById("modalUserStars").textContent = userFantics.toLocaleString()
}

function updateOpenButton() {
  const demoMode = document.getElementById("demoMode").checked
  const openBtnText = document.getElementById("openBtnText")

  if (demoMode) {
    openBtnText.textContent = "Открыть бесплатно"
    document.getElementById("openCaseBtn").className =
      "w-full h-14 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-bold text-lg shadow-lg rounded-lg transition-all mb-8"
  } else {
    openBtnText.textContent = `Открыть за ${currentCase.cost} 💎`
    document.getElementById("openCaseBtn").className =
      "w-full h-14 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold text-lg shadow-lg rounded-lg transition-all mb-8"
  }
}

function renderCases() {
  const casesGrid = document.getElementById("casesGrid")
  casesGrid.innerHTML = ""

  if (cases.length === 0) {
    casesGrid.innerHTML = '<div class="col-span-2 text-center text-gray-400 py-8">Нет доступных кейсов</div>'
    return
  }

  cases.forEach((caseItem) => {
    const canAfford = userFantics >= caseItem.cost

    const caseElement = document.createElement("div")
    caseElement.className = `cursor-pointer transition-all duration-300 hover-scale bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 text-center ${
      canAfford
        ? "hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/50"
        : "opacity-50 cursor-not-allowed"
    }`

    const icons = {
      1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 7h-9a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z"></path></svg>`,
      2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path></svg>`,
      3: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3h12l4 6-10 13L2 9z"></path></svg>`,
    }

    const colors = {
      1: "bg-gradient-to-br from-gray-600 to-gray-800",
      2: "bg-gradient-to-br from-purple-400 to-purple-600",
      3: "bg-gradient-to-br from-purple-600 to-purple-800",
    }

    caseElement.innerHTML = `
      <div class="w-16 h-16 rounded-xl ${colors[caseItem.id] || colors[1]} flex items-center justify-center mb-3 mx-auto shadow-lg border border-white/10">
          <div class="w-8 h-8 text-white">${icons[caseItem.id] || icons[1]}</div>
      </div>
      <h3 class="font-semibold text-white text-sm mb-2 leading-tight">${caseItem.name}</h3>
      <div class="flex items-center justify-center gap-1">
          <span class="text-purple-400">💎</span>
          <span class="font-bold text-sm ${canAfford ? "text-gray-200" : "text-gray-500"}">${caseItem.cost.toLocaleString()}</span>
      </div>
      ${!canAfford ? '<div class="mt-2"><span class="text-xs text-red-400 font-medium">Недостаточно фантиков</span></div>' : ""}
  `

    if (canAfford) {
      caseElement.addEventListener("click", () => openCasePage(caseItem))
    }

    casesGrid.appendChild(caseElement)
  })
}

function renderDepositAmounts() {
  const depositAmountsContainer = document.getElementById("depositAmounts")
  depositAmountsContainer.innerHTML = ""

  depositAmounts.forEach((item) => {
    const amountElement = document.createElement("div")
    amountElement.className = `cursor-pointer transition-all duration-300 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 text-center hover:border-purple-500/50 hover:bg-gray-700/50 ${
      item.popular ? "ring-2 ring-purple-500 bg-purple-900/20" : ""
    }`

    const totalAmount = item.amount + item.bonus

    amountElement.innerHTML = `
      ${item.popular ? '<div class="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full mb-2 inline-block">ПОПУЛЯРНО</div>' : ""}
      <div class="text-white font-bold text-lg">${item.amount} 💎</div>
      ${item.bonus > 0 ? `<div class="text-purple-400 text-sm">+${item.bonus} бонус</div>` : ""}
      ${item.bonus > 0 ? `<div class="text-gray-400 text-xs">Итого: ${totalAmount} 💎</div>` : ""}
  `

    amountElement.addEventListener("click", (e) => selectDepositAmount(item, e))
    depositAmountsContainer.appendChild(amountElement)
  })
}

function selectDepositAmount(item, event) {
  selectedDepositAmount = item
  updateDepositButton()

  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })

  if (event && event.target) {
    event.target.closest("div").classList.add("selected-amount", "ring-2", "ring-purple-400")
  }

  document.getElementById("customAmount").value = ""
}

function updateDepositButton() {
  const confirmBtn = document.getElementById("confirmDepositBtn")
  const btnText = document.getElementById("depositBtnText")
  const customAmount = document.getElementById("customAmount").value

  if (selectedDepositAmount) {
    const totalAmount = selectedDepositAmount.amount + selectedDepositAmount.bonus
    btnText.textContent = `Пополнить на ${totalAmount} 💎`
    confirmBtn.disabled = false
  } else if (customAmount && customAmount > 0) {
    btnText.textContent = `Пополнить на ${customAmount} 💎`
    confirmBtn.disabled = false
  } else {
    btnText.textContent = "Выберите сумму"
    confirmBtn.disabled = true
  }
}

function openDepositModal() {
  document.getElementById("depositModal").classList.remove("hidden")
  renderDepositAmounts()
  updateFanticsDisplay()
}

function closeDepositModal() {
  document.getElementById("depositModal").classList.add("hidden")
  selectedDepositAmount = null
  document.getElementById("customAmount").value = ""
  updateDepositButton()
}

async function processDeposit() {
  let amountToDeposit = 0

  if (selectedDepositAmount) {
    amountToDeposit = selectedDepositAmount.amount + selectedDepositAmount.bonus
  } else {
    const customAmount = Number.parseInt(document.getElementById("customAmount").value)
    if (customAmount && customAmount > 0) {
      amountToDeposit = customAmount
    }
  }

  if (amountToDeposit <= 0) {
    showNotification("Выберите сумму для пополнения", "error")
    return
  }

  const confirmBtn = document.getElementById("confirmDepositBtn")
  const originalText = confirmBtn.innerHTML
  confirmBtn.innerHTML = '<span class="animate-pulse">Пополняем...</span>'
  confirmBtn.disabled = true

  try {
    const success = await addFantics(amountToDeposit)

    if (success) {
      showNotification(`✅ Запрос на пополнение отправлен! Баланс обновится через несколько секунд.`, "success", 4000)
      closeDepositModal()
      renderCases()
    } else {
      showNotification("❌ Ошибка при пополнении баланса", "error")
    }
  } catch (error) {
    showNotification("❌ Ошибка при пополнении баланса", "error")
  } finally {
    confirmBtn.innerHTML = originalText
    confirmBtn.disabled = false
  }
}

function openCasePage(caseData) {
  currentCase = caseData
  document.getElementById("mainPage").classList.add("hidden")
  document.getElementById("casePage").classList.remove("hidden")

  document.getElementById("caseTitle").textContent = caseData.name
  updateOpenButton()

  renderPossiblePrizes(caseData)
}

// renderPrizeScroll теперь принимает выигрышный приз для корректного размещения
// и возвращает индекс, куда был помещен выигрышный приз
function renderPrizeScroll(caseData, winningGiftCost) {
  const prizeScroll = document.getElementById("prizeScroll")
  prizeScroll.innerHTML = ""

  const possibleRewards = caseData.possible_rewards

  const numPrizes = 150 // Генерируем больше призов для длинной прокрутки
  // Целевой индекс, куда будет помещен выигрышный приз.
  // Выбираем его достаточно далеко от начала, чтобы было место для "разгона"
  // и достаточно далеко от конца, чтобы было место для "торможения".
  const targetWinningIndex = 75 + Math.floor(Math.random() * 10) // Например, между 75 и 84

  console.log("DEBUG: renderPrizeScroll - Ожидаемый выигрышный приз (winningGiftCost):", winningGiftCost)
  console.log(
    "DEBUG: renderPrizeScroll - Целевой индекс выигрышного приза на ленте (targetWinningIndex):",
    targetWinningIndex,
  )

  for (let i = 0; i < numPrizes; i++) {
    const prizeElement = document.createElement("div")
    let rewardValue

    if (i === targetWinningIndex) {
      // Вставляем фактический выигрышный приз в целевую позицию
      rewardValue = winningGiftCost
    } else {
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
      rewardValue = randomReward.cost
    }

    let colorClass = "bg-gradient-to-br from-gray-700 to-gray-900"
    if (rewardValue >= 5000) colorClass = "bg-gradient-to-br from-purple-600 to-purple-800"
    else if (rewardValue >= 2000) colorClass = "bg-gradient-to-br from-purple-700 to-purple-800"
    else if (rewardValue >= 1000) colorClass = "bg-gradient-to-br from-purple-800 to-purple-900"
    else if (rewardValue >= 500) colorClass = "bg-gradient-to-br from-gray-500 to-gray-700"

    prizeElement.className = `flex-shrink-0 w-20 h-20 ${colorClass} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg border border-white/20`
    prizeElement.textContent = `${rewardValue} 💎`
    prizeScroll.appendChild(prizeElement)
  }
  return targetWinningIndex // Возвращаем индекс, чтобы spinPrizes знал, куда целиться
}

function renderPossiblePrizes(caseData) {
  const possiblePrizes = document.getElementById("possiblePrizes")
  possiblePrizes.innerHTML = ""

  caseData.possible_rewards.forEach((reward) => {
    const prizeElement = document.createElement("div")

    let colorClass = "bg-gradient-to-br from-gray-700 to-gray-900"
    if (reward.cost >= 5000) colorClass = "bg-gradient-to-br from-purple-600 to-purple-800"
    else if (reward.cost >= 2000) colorClass = "bg-gradient-to-br from-purple-700 to-purple-800"
    else if (reward.cost >= 1000) colorClass = "bg-gradient-to-br from-purple-800 to-purple-900"
    else if (reward.cost >= 500) colorClass = "bg-gradient-to-br from-gray-500 to-gray-700"

    prizeElement.className = `${colorClass} rounded-lg p-3 text-center text-white font-semibold text-sm shadow-lg border border-white/20`
    prizeElement.innerHTML = `
      <div class="font-bold">${reward.cost} 💎</div>
      <div class="text-xs opacity-75">${reward.probability}%</div>
  `
    possiblePrizes.appendChild(prizeElement)
  })
}

async function spinPrizes() {
  if (isSpinning) return

  const demoMode = document.getElementById("demoMode").checked
  const prizeScroll = document.getElementById("prizeScroll")
  const openBtn = document.getElementById("openCaseBtn")
  const openBtnText = document.getElementById("openBtnText")

  if (!demoMode && userFantics < currentCase.cost) {
    showNotification("Недостаточно фантиков!", "error")
    return
  }

  isSpinning = true
  openBtn.disabled = true
  openBtnText.textContent = "Открываем..."
  openBtn.classList.add("animate-pulse")

  const initialBalanceBeforeSpin = userFantics // Сохраняем баланс до начала операции

  try {
    let result = null
    if (!demoMode) {
      // 1. Списываем стоимость кейса с UI сразу
      userFantics -= currentCase.cost
      updateFanticsDisplay()
      console.log("DEBUG: Баланс после списания стоимости кейса (UI):", userFantics)

      // Вызываем API для открытия кейса (сервер сам обработает списание и добавление)
      result = await openCaseAPI(currentCase.id)
      console.log("DEBUG: Результат от openCaseAPI:", result)
      console.log("DEBUG: Фактический выигрыш от сервера (result.gift):", result.gift)
    } else {
      const possibleRewards = currentCase.possible_rewards
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
      result = { gift: randomReward.cost, profit: randomReward.cost - currentCase.cost }
      // Для демо-режима также симулируем немедленное списание для визуальной консистентности
      userFantics -= currentCase.cost
      updateFanticsDisplay()
      console.log("DEBUG: Баланс после списания стоимости кейса (Демо):", userFantics)
      console.log("DEBUG: Симулированный выигрыш (Демо):", result.gift)
    }

    // Теперь, когда мы знаем выигрышный приз, генерируем ленту
    // Важно: передаем result.gift, чтобы он был вставлен в целевую позицию
    const targetWinningIndex = renderPrizeScroll(currentCase, result.gift) // Получаем индекс, куда был помещен выигрыш

    // Получаем ссылку на выигрышный элемент после его рендеринга
    const winningElement = prizeScroll.children[targetWinningIndex]
    if (!winningElement) {
      console.error("ERROR: Winning element not found at target index:", targetWinningIndex)
      throw new Error("Winning element not found.")
    }

    // Получаем ширину видимого контейнера (родителя с overflow-hidden)
    const viewport = prizeScroll.parentElement
    const viewportWidth = viewport.offsetWidth

    // Рассчитываем точную позицию центра выигрышного элемента относительно начала prizeScroll
    const winningElementCenterPosition = winningElement.offsetLeft + winningElement.offsetWidth / 2

    // Рассчитываем желаемую позицию прокрутки: центр выигрышного элемента должен совпасть с центром viewport
    const desiredScrollPosition = winningElementCenterPosition - viewportWidth / 2

    // Добавляем дополнительные полные "обороты" для визуального эффекта
    // Это гарантирует, что барабан прокрутится достаточно много раз
    const extraFullSpins = 5 // Прокрутить 5 полных "экранов"
    const totalScrollDistance = desiredScrollPosition + extraFullSpins * viewportWidth

    console.log("DEBUG: winningElement.offsetLeft:", winningElement.offsetLeft)
    console.log("DEBUG: winningElement.offsetWidth:", winningElement.offsetWidth)
    console.log("DEBUG: winningElementCenterPosition:", winningElementCenterPosition)
    console.log("DEBUG: viewportWidth:", viewportWidth)
    console.log("DEBUG: desiredScrollPosition:", desiredScrollPosition)
    console.log("DEBUG: extraFullSpins * viewportWidth:", extraFullSpins * viewportWidth)
    console.log("DEBUG: totalScrollDistance (calculated):", totalScrollDistance)

    prizeScroll.style.transition = "none"
    prizeScroll.style.transform = "translateX(0px)"
    prizeScroll.offsetHeight // Принудительная перерисовка

    prizeScroll.style.transition = "transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)"
    prizeScroll.style.transform = `translateX(-${totalScrollDistance}px)`

    setTimeout(() => {
      // Этот setTimeout для завершения анимации (5 секунд)
      // Находим элемент, который должен быть выигрышным, по его индексу
      // (winningElement уже определен выше)
      if (winningElement) {
        winningElement.classList.add("winning-prize")
        console.log("DEBUG: Визуально выделенный приз (из DOM):", winningElement.textContent)
        console.log("DEBUG: Ожидаемый выигрышный приз (из API):", result.gift)
      }

      // 2. Добавляем сумму выигрыша к балансу после анимации
      if (!demoMode) {
        userFantics += result.gift // Добавляем фактическую сумму выигрыша
        updateFanticsDisplay()
        console.log("DEBUG: Баланс после добавления выигрыша (UI):", userFantics)
      } else {
        userFantics += result.gift // Для демо-режима тоже
        updateFanticsDisplay()
        console.log("DEBUG: Баланс после добавления выигрыша (Демо):", userFantics)
      }

      // Запрашиваем актуальный баланс с сервера после небольшой задержки
      // Это обеспечит конечную согласованность, особенно при использовании RabbitMQ
      const delay = API_BASE.includes("localhost") ? 1000 : 8000 // Увеличена задержка для продакшна до 8 секунд
      console.log(`DEBUG: Задержка перед fetchUserFantics: ${delay}ms`)
      setTimeout(() => {
        fetchUserFantics() // Это обновит баланс с сервера
      }, delay)

      setTimeout(() => {
        // Этот setTimeout для завершения свечения (1 секунда после анимации)
        if (winningElement) {
          winningElement.classList.remove("winning-prize")
        }
        prizeScroll.style.transition = "none"
        prizeScroll.style.transform = "translateX(0px)"
        // Перегенерируем для следующего спина, чтобы лента была "свежей"
        // и не было проблем с повторным использованием элементов
        // Здесь не нужно передавать result.gift, так как это просто подготовка к следующему спину
        renderPrizeScroll(currentCase, 0) // Передаем 0 или любое другое значение, так как это не выигрышный спин

        openBtn.disabled = false
        openBtn.classList.remove("animate-pulse")
        updateOpenButton()
        isSpinning = false
      }, 1000)
    }, 5000)
  } catch (error) {
    showNotification(`❌ Ошибка: ${error.message}`, "error")
    // В случае ошибки, если было оптимистичное списание, возвращаем баланс
    if (!demoMode && initialBalanceBeforeSpin !== userFantics) {
      userFantics = initialBalanceBeforeSpin // Возвращаем к начальному состоянию
      updateFanticsDisplay()
      console.log("DEBUG: Баланс восстановлен после ошибки:", userFantics)
    }
    fetchUserFantics() // Получаем актуальный баланс с сервера
    openBtn.disabled = false
    openBtn.classList.remove("animate-pulse")
    updateOpenButton()
    isSpinning = false
  }
}

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

  await fetchUserFantics()
  await fetchCases()

  console.log("✅ Приложение готово!")
  console.log("DEBUG: Конец initApp")
}

initApp()
