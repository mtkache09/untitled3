import { TonConnect } from "@tonconnect/sdk"

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
  // Удал��ем предыдущие уведомления
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
      return userFantics // Возвращаем баланс
    } else {
      const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
      console.error("❌ Ошибка получения баланса:", response.status, errorData)
      handleApiError(response, errorData)
      showConnectionStatus("Ошибка получения баланса", true)
      return null // Возвращаем null в случае ошибки
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
    return null // Возвращаем null в случае ошибки
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
      console.log("DEBUG: Фактический выигрыш от сервера (result.gift):", result.gift) // Добавлено
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

    if (!isAuthAvailable()) {
      throw new Error("Пополнение доступно только в Telegram WebApp")
    }

    showConnectionStatus("Пополнение баланса...")

    const response = await fetch(`${API_BASE}/fantics/add`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amount: amount,
      }),
      mode: "cors",
    })

    console.log("📡 Ответ сервера (пополнение):", response.status)

    if (response.ok) {
      const result = await response.json()
      console.log("✅ Пополнение успешно:", result)
      showConnectionStatus("Баланс пополняется...")

      const delay = API_BASE.includes("localhost") ? 1000 : 3000
      setTimeout(() => {
        fetchUserFantics()
      }, delay)
      return true
    } else {
      // Здесь добавляем подробный вывод ошибки
      const errorData = await response.json().catch(() => ({ detail: "Ошибка пополнения" }))
      console.error("❌ Ошибка пополнения:", response.status, errorData)
      // Добавляем вывод детального содержания ошибки
      console.error("❌ Ошибка пополнения - detail:", JSON.stringify(errorData.detail, null, 2))
      handleApiError(response, errorData)
      return false
    }
  } catch (error) {
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

function renderPrizeScroll(caseData, winningGiftCost) {
  const prizeScroll = document.getElementById("prizeScroll")
  prizeScroll.innerHTML = ""

  const possibleRewards = caseData.presents // Используем caseData.presents напрямую

  const numPrizes = 150 // Генерируем больше призов для длинной прокрутки
  // Целевой индекс, куда будет помещен выигрышный приз.
  // Выбираем его достаточно далеко от начала, чтобы было место для "разгона"
  // и достаточно далеко от конца, чтобы было место для "торможения".
  const targetWinningIndex = 149 // Always target index 149 as requested

  console.log("DEBUG: renderPrizeScroll - Ожидаемый выигрышный приз (winningGiftCost):", winningGiftCost)
  console.log(
    "DEBUG: renderPrizeScroll - Целевой индекс выигрышного приза на ленте (targetWinningIndex):",
    targetWinningIndex,
  )

  const lastTwoRewards = [null, null] // Для отслеживания последних двух призов

  for (let i = 0; i < numPrizes; i++) {
    const prizeElement = document.createElement("div")
    let rewardValue

    if (i === targetWinningIndex) {
      // Вставляем фактический выигрышный приз в целевую позицию
      rewardValue = winningGiftCost
      console.log(`DEBUG: renderPrizeScroll - Приз ${rewardValue} 💎 помещен в индекс ${i} (целевой).`)
    } else {
      let randomReward
      let attempts = 0
      do {
        randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
        rewardValue = randomReward.cost
        attempts++
        // Защита от бесконечного цикла, если нет других призов
        if (attempts > 50 && possibleRewards.length > 1) {
          console.warn("WARNING: Не удалось найти уникальный приз после 50 попыток. Возможно, мало вариантов призов.")
          break
        }
      } while (lastTwoRewards[0] === rewardValue && lastTwoRewards[1] === rewardValue)
    }

    // Обновляем историю последних двух призов
    lastTwoRewards[0] = lastTwoRewards[1]
    lastTwoRewards[1] = rewardValue

    let colorClass = "bg-gradient-to-br from-gray-700 to-gray-900"
    if (rewardValue >= 5000) colorClass = "bg-gradient-to-br from-purple-600 to-purple-800"
    else if (rewardValue >= 2000) colorClass = "bg-gradient-to-br from-purple-700 to-purple-800"
    else if (rewardValue >= 1000) colorClass = "bg-gradient-to-br from-purple-800 to-purple-900"
    else if (rewardValue >= 500) colorClass = "bg-gradient-to-br from-gray-500 to-gray-700"

    // ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ ШИРИНУ И ВЫСОТУ ЧЕРЕЗ STYLE
    prizeElement.className = `flex-shrink-0 w-20 h-20 min-w-[80px] max-w-[80px] ${colorClass} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg border border-white/20`
    prizeElement.style.width = "80px" // Принудительная установка ширины
    prizeElement.style.height = "80px" // Принудительная установка высоты
    prizeElement.textContent = `${rewardValue} 💎`
    prizeScroll.appendChild(prizeElement)
    // Добавляем лог для проверки вычисленной ширины элемента сразу после добавления в DOM
    console.log(
      `DEBUG: Rendered prize element width for ${rewardValue} 💎 (at index ${i}): ${prizeElement.offsetWidth}px (offsetWidth), ${prizeElement.getBoundingClientRect().width}px (getBoundingClientRect().width)`,
    )
  }
  // Добавляем лог для проверки вычисленной ширины элемента
  if (prizeScroll.firstElementChild) {
    const computedStyle = window.getComputedStyle(prizeScroll.firstElementChild)
    console.log("DEBUG: Computed prize element width (from getComputedStyle):", computedStyle.width)
  }
  return targetWinningIndex // Возвращаем индекс, чтобы spinPrizes знал, куда целиться
}

function renderCases() {
  const casesGrid = document.getElementById("casesGrid")
  casesGrid.innerHTML = ""

  if (cases.length === 0) {
    casesGrid.innerHTML = '<div class="col-span-2 text-center text-gray-400 py-8">Нет доступных кейсов</div>'
    console.log("DEBUG: No cases to render, displaying 'Нет доступных кейсов'.")
    return
  }

  console.log(`DEBUG: Attempting to render ${cases.length} cases.`)

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
    console.log(`DEBUG: Appended case: ${caseItem.name}`)
  })
  console.log(`DEBUG: Total children in casesGrid after rendering: ${casesGrid.children.length}`)
}

function renderPossiblePrizes(caseData) {
  const possiblePrizes = document.getElementById("possiblePrizes")
  possiblePrizes.innerHTML = ""

  caseData.presents.forEach((present) => {
    // Используем caseData.presents напрямую
    const prizeElement = document.createElement("div")

    let colorClass = "bg-gradient-to-br from-gray-700 to-gray-900"
    if (present.cost >= 5000) colorClass = "bg-gradient-to-br from-purple-600 to-purple-800"
    else if (present.cost >= 2000) colorClass = "bg-gradient-to-br from-purple-700 to-purple-800"
    else if (present.cost >= 1000) colorClass = "bg-gradient-to-br from-purple-800 to-purple-900"
    else if (present.cost >= 500) colorClass = "bg-gradient-to-br from-gray-500 to-gray-700"

    prizeElement.className = `${colorClass} rounded-lg p-3 text-center text-white font-semibold text-sm shadow-lg border border-white/20`
    prizeElement.innerHTML = `
    <div class="font-bold">${present.cost} 💎</div>
    <div class="text-xs opacity-75">${present.probability}%</div>
`
    possiblePrizes.appendChild(prizeElement)
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
  const customAmountInput = document.getElementById("customAmount")
  const depositSummary = document.getElementById("depositSummary")

  let amountToDisplay = 0
  let bonusToDisplay = 0
  let totalToDisplay = 0

  if (selectedDepositAmount) {
    amountToDisplay = selectedDepositAmount.amount
    bonusToDisplay = selectedDepositAmount.bonus
    totalToDisplay = amountToDisplay + bonusToDisplay
  } else {
    const customAmount = Number.parseInt(customAmountInput.value)
    if (customAmount && customAmount > 0) {
      amountToDisplay = customAmount
      totalToDisplay = customAmount // Для кастомной суммы бонуса нет
    }
  }

  if (totalToDisplay > 0) {
    btnText.textContent = `Пополнить на ${totalToDisplay.toLocaleString()} 💎`
    confirmBtn.disabled = false

    let summaryText = `Вы собираетесь пополнить: ${amountToDisplay.toLocaleString()} 💎`
    if (bonusToDisplay > 0) {
      summaryText += ` (+${bonusToDisplay.toLocaleString()} 💎 бонус)`
    }
    summaryText += `. Итого: ${totalToDisplay.toLocaleString()} 💎`

    depositSummary.textContent = summaryText
    depositSummary.classList.remove("hidden")
  } else {
    btnText.textContent = "Выберите сумму"
    confirmBtn.disabled = true
    depositSummary.classList.add("hidden")
    depositSummary.textContent = ""
  }
}

function openDepositModal() {
  document.getElementById("depositModal").classList.remove("hidden")
  renderDepositAmounts()
  updateFanticsDisplay()
  updateDepositButton() // Обновляем кнопку и сводку при открытии
}

function closeDepositModal() {
  document.getElementById("depositModal").classList.add("hidden")
  selectedDepositAmount = null
  document.getElementById("customAmount").value = ""
  updateDepositButton() // Обновляем кнопку и сводку при закрытии
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

  let winningElement = null // Объявляем здесь, чтобы был доступен в finally
  let animationFrameId // Для отслеживания requestAnimationFrame
  let animation // Объявляем здесь, чтобы был доступен в monitorAnimation

  // --- START: CRITICAL RESET FOR ANIMATION CONSISTENCY (Moved and enhanced) ---
  // Cancel any existing animations on the prizeScroll element
  if (prizeScroll.getAnimations) {
    prizeScroll.getAnimations().forEach((anim) => anim.cancel())
    console.log("DEBUG: Cancelled all previous animations on prizeScroll.")
  }
  // --- END: CRITICAL RESET FOR ANIMATION CONSISTENCY ---

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
      const possibleRewards = currentCase.presents // Используем currentCase.presents
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
      result = { gift: randomReward.cost, profit: randomReward.cost - currentCase.cost }
      // Для демо-режима также симулируем немедленное списание для визуальной консистентности
      userFantics -= currentCase.cost
      updateFanticsDisplay()
      console.log("DEBUG: Баланс после списания стоимости кейса (Демо):", userFantics)
      console.log("DEBUG: Симулированный выигрыш (Демо):", result.gift)
    }

    // Теперь, когда мы знаем выигрышный приз, генерируем ленту
    const targetWinningIndex = renderPrizeScroll(currentCase, result.gift)
    winningElement = prizeScroll.children[targetWinningIndex] // Присваиваем winningElement

    // --- NEW: Explicitly reset transform AFTER rendering new elements ---
    prizeScroll.style.transition = "none" // Remove any transition
    prizeScroll.style.transform = "translateX(0px)" // Reset to initial position
    prizeScroll.offsetHeight // Force reflow to apply style changes immediately
    await new Promise((resolve) => requestAnimationFrame(resolve)) // Wait for next frame
    console.log("DEBUG: prizeScroll reset to translateX(0px) after renderPrizeScroll and before offset calculation.")
    // --- END NEW ---

    if (!winningElement) {
      console.error("ERROR: Winning element not found at target index:", targetWinningIndex)
      throw new Error("Winning element not found.")
    }
    console.log(
      "DEBUG: Winning element identified (before animation):",
      winningElement.textContent,
      "at index",
      targetWinningIndex,
    )

    const viewport = prizeScroll.parentElement
    const viewportWidth = viewport.offsetWidth

    // ИСПРАВЛЕНО: Принудительно устанавливаем itemWidth в 80px
    const itemWidth = 80
    console.log("DEBUG: Hardcoded itemWidth for animation calculations:", itemWidth)

    // ИСПОЛЬЗУЕМ ФИКСИРОВАННОЕ ЗНАЧЕНИЕ GAP, ТАК КАК getComputedStyle МОЖЕТ БЫТЬ НЕНАДЕЖНЫМ
    const gapValue = 16 // Tailwind's gap-4 is 16px
    const effectiveItemWidth = itemWidth + gapValue
    console.log("DEBUG: Effective item width (calculated):", effectiveItemWidth)

    // Calculate the final desired translateX to center the winning element
    // This is the exact translateX value needed for the winning prize to be centered.
    const finalCenteredTranslateX = -(winningElement.offsetLeft + itemWidth / 2 - viewportWidth / 2)
    console.log("DEBUG: finalCenteredTranslateX (desired end position):", finalCenteredTranslateX)

    // Calculate the total distance for "spinning" effect
    // Уменьшаем количество "лишних" прокручиваемых элементов
    const overshootItems = 30 // Прокручиваем на 30 элементов дальше, чем нужно, затем замедляемся
    const spinDistance = overshootItems * effectiveItemWidth
    console.log("DEBUG: spinDistance (extra for animation):", spinDistance)

    // The animation's target translateX will be the finalCenteredTranslateX MINUS the spinDistance.
    // This makes the animation go further left than the final snap point, creating the spin.
    const animationTargetTranslateX = finalCenteredTranslateX - spinDistance
    console.log("DEBUG: animationTargetTranslateX (animation's final point):", animationTargetTranslateX)

    animation = prizeScroll.animate(
      [
        { transform: "translateX(0px)" }, // Start from current position (0)
        { transform: `translateX(${animationTargetTranslateX}px)` }, // Animate to this far left point
      ],
      {
        duration: 10000, // УВЕЛИЧЕНА ДЛИТЕЛЬНОСТЬ ДО 10 СЕКУНД
        easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", // Smooth deceleration
        fill: "forwards",
      },
    )

    // === НАЧАЛО МОНИТОРИНГА АНИМАЦИИ ===
    const logInterval = 100 // Логировать каждые 100 мс
    let lastLogTime = 0

    const monitorAnimation = (currentTime) => {
      if (!isSpinning || animation.playState === "finished") {
        // Остановить мониторинг, если спин завершен или анимация завершена
        cancelAnimationFrame(animationFrameId)
        return
      }

      if (currentTime - lastLogTime > logInterval) {
        lastLogTime = currentTime

        // Получаем текущий прогресс анимации
        const animationProgress = animation.currentTime / animation.effect.getComputedTiming().duration
        // Вычисляем текущий translateX на основе прогресса и animationTargetTranslateX
        const currentTranslateX = animationProgress * animationTargetTranslateX

        const winningElementRect = winningElement.getBoundingClientRect()
        const viewportRect = viewport.getBoundingClientRect()

        // Позиция центра выигрышного элемента относительно левого края viewport
        const currentWinningElementCenterInViewport =
          winningElementRect.left + winningElementRect.width / 2 - viewportRect.left

        const desiredViewportCenter = viewportRect.width / 2
        const distanceToCenter = currentWinningElementCenterInViewport - desiredViewportCenter

        console.log(
          `DEBUG: Анимация - Приз ${winningElement.textContent} | Прогресс: ${(animationProgress * 100).toFixed(2)}% | Расчетный translateX: ${currentTranslateX.toFixed(2)}px | Расстояние до центра: ${distanceToCenter.toFixed(2)}px`,
        )
      }

      animationFrameId = requestAnimationFrame(monitorAnimation)
    }

    animationFrameId = requestAnimationFrame(monitorAnimation)
    // === КОНЕЦ МОНИТОРИНГА АНИМАЦИИ ===

    // Ждем точного завершения анимации
    await animation.finished
    console.log("DEBUG: Основная анимация завершена (WAAPI).")
    console.log("DEBUG: Element at final centered position (after animation):", winningElement.textContent)

    // Подсвечиваем выигрышный элемент
    if (winningElement) {
      winningElement.classList.add("winning-prize")
      console.log("DEBUG: Визуально выделенный приз (из DOM):", winningElement.textContent)
      console.log("DEBUG: Ожидаемый выигрышный приз (из API):", result.gift)
      console.log(
        `DEBUG: Сравнение: Выигрыш от сервера: ${result.gift}, Текст элемента: ${Number.parseInt(winningElement.textContent)}`,
      ) // Добавлено для прямого сравнения
      showNotification(`🎉 Вы выиграли ${result.gift} 💎!`, "success", 3000)
    }

    // === НАЧАЛО ПОСТ-АНИМАЦИОННОЙ ПОДГОНКИ (SNAP CORRECTION) ===
    try {
      const viewport = prizeScroll.parentElement
      const viewportWidth = viewport.offsetWidth

      // desiredTranslateXForCentering уже равен finalCenteredTranslateX
      const desiredTranslateXForCentering = finalCenteredTranslateX

      const currentTransformStyle = window.getComputedStyle(prizeScroll).transform
      let actualCurrentTranslateX = 0

      console.log("DEBUG: Snap Correction - Raw transform style:", currentTransformStyle)
      console.log(
        "DEBUG: Snap Correction - winningElement.getBoundingClientRect().width (at snap):",
        winningElement.getBoundingClientRect().width,
      )
      console.log("DEBUG: Snap Correction - winningElement.offsetWidth (at snap):", winningElement.offsetWidth)
      console.log("DEBUG: Snap Correction - prizeScroll.getBoundingClientRect():", prizeScroll.getBoundingClientRect())

      // ИСПРАВЛЕНО: Corrected regex for matrix parsing
      const matrixRegex = /matrix$$([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)$$/
      const matrixMatch = currentTransformStyle.match(matrixRegex)

      if (matrixMatch && matrixMatch.length >= 7) {
        console.log("DEBUG: Snap Correction - matrixMatch found:", matrixMatch)
        console.log("DEBUG: Snap Correction - matrixMatch[5] (translateX):", matrixMatch[5]) // tx is the 5th capturing group (index 5)
        actualCurrentTranslateX = Number.parseFloat(matrixMatch[5]) // tx value
      } else {
        // ИСПРАВЛЕНО: Corrected regex for translateX parsing
        const translateXMatch = currentTransformStyle.match(/translateX$$(-?\d+\.?\d*)px$$/)
        if (translateXMatch && translateXMatch[1]) {
          actualCurrentTranslateX = Number.parseFloat(translateXMatch[1])
        } else {
          console.warn(
            "WARNING: Snap Correction - Could not parse transform style, unexpected format:",
            currentTransformStyle,
          )
          // In case of parsing failure, use the assumed final position from animation
          actualCurrentTranslateX = animationTargetTranslateX
        }
      }

      // Вычисляем разницу между фактическим текущим положением и желаемым центрированным положением
      const adjustmentNeeded = desiredTranslateXForCentering - actualCurrentTranslateX

      console.log("DEBUG: Snap Correction - winningElement.offsetLeft:", winningElement.offsetLeft)
      console.log("DEBUG: Snap Correction - viewportWidth:", viewportWidth)
      console.log("DEBUG: Snap Correction - desiredTranslateXForCentering:", desiredTranslateXForCentering)
      console.log("DEBUG: Snap Correction - actualCurrentTranslateX (from style):", actualCurrentTranslateX)
      console.log("DEBUG: Snap Correction - adjustmentNeeded:", adjustmentNeeded)

      // Применяем коррекцию, если отклонение значительное (например, более 0.5px)
      if (Math.abs(adjustmentNeeded) > 0.5) {
        prizeScroll.style.transition = "transform 0.3s ease-out" // Плавный переход для подгонки
        prizeScroll.style.transform = `translateX(${desiredTranslateXForCentering}px)`
        console.log(
          "DEBUG: Snap Correction - Applied adjustment to exact desired position:",
          desiredTranslateXForCentering,
        )
        await new Promise((resolve) => setTimeout(resolve, 300)) // Ждем завершения коррекции
      } else {
        console.log("DEBUG: Snap Correction - adjustment not needed, offset is minimal:", adjustmentNeeded)
      }
      console.log("DEBUG: Element at final snapped position (after correction):", winningElement.textContent)
    } catch (snapError) {
      console.error("ERROR: Ошибка в логике подгонки (snap correction):", snapError)
      showNotification("⚠️ Ошибка анимации. Попробуйте еще раз.", "error")
    }
    // === КОНЕЦ ПОСТ-АНИМАЦИОННОЙ ПОДГОНКИ ===

    // 2. Добавляем сумму выигрыша к балансу после анимации (UI)
    if (!demoMode) {
      userFantics += result.gift // Добавляем фактическую сумму выигрыша
      updateFanticsDisplay()
      console.log("DEBUG: Баланс после добавления выигрыша (UI):", userFantics)
    } else {
      userFantics += result.gift // Для демо-режима тоже
      updateFanticsDisplay()
      console.log("DEBUG: Баланс после добавления выигрыша (Демо):", userFantics)
    }

    // === НАЧАЛО ИЗМЕНЕНИЙ ДЛЯ ПОЛЛИНГА ===
    const expectedBalance = initialBalanceBeforeSpin - currentCase.cost + result.gift
    const maxRetries = 10
    const retryInterval = 1000

    console.log(`DEBUG: Ожидаемый баланс после транзакции: ${expectedBalance}`)
    showConnectionStatus("Синхронизация баланса...")

    let currentRetries = 0
    let balanceSynced = false

    try {
      while (!balanceSynced && currentRetries < maxRetries) {
        console.log(`DEBUG: Попытка синхронизации баланса #${currentRetries + 1}`)
        const fetchedBalance = await fetchUserFantics()
        if (fetchedBalance !== null && fetchedBalance === expectedBalance) {
          balanceSynced = true
          console.log("✅ Баланс успешно синхронизирован с сервером.")
          showConnectionStatus("Баланс синхронизирован!")
        } else {
          console.log(
            `DEBUG: Баланс не совпадает. Ожидаем: ${expectedBalance}, Получено: ${fetchedBalance}. Повторная попытка через ${retryInterval}ms.`,
          )
          await new Promise((resolve) => setTimeout(resolve, retryInterval))
          currentRetries++
        }
      }

      if (!balanceSynced) {
        showNotification(
          "⚠️ Не удалось синхронизировать баланс с сервером. Попробуйте обновить приложение.",
          "error",
          8000,
        )
        console.error("❌ Не удалось синхронизировать баланс после нескольких попыток.")
        showConnectionStatus("Ошибка синхронизации баланса", true)
      }
    } catch (pollingError) {
      console.error("ERROR: Ошибка в цикле поллинга баланса:", pollingError)
      showNotification("⚠️ Ошибка синхронизации баланса. Попробуйте обновить приложение.", "error", 8000)
      showConnectionStatus("Ошибка синхронизации баланса", true)
    }
    // === КОНЕЦ ИЗМЕНЕНИЙ ДЛЯ ПОЛЛИНГА ===

    // Ждем завершения свечения приза
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log("DEBUG: Свечение приза завершено.")
  } catch (error) {
    showNotification(`❌ Ошибка: ${error.message}`, "error")
    // В случае ошибки, если было оптимистичное списание, возвращаем баланс
    if (!demoMode && initialBalanceBeforeSpin !== userFantics) {
      userFantics = initialBalanceBeforeSpin // Возвращаем к начальному состоянию
      updateFanticsDisplay()
      console.log("DEBUG: Баланс восстановлен после ошибки:", userFantics)
    }
    // Всегда пытаемся получить актуальный баланс с сервера в случае ошибки
    await fetchUserFantics()
    console.error("DEBUG: Общая ошибка в spinPrizes:", error)
  } finally {
    // Этот блок всегда выполняется, независимо от ошибок, для сброса UI
    if (winningElement) {
      winningElement.classList.remove("winning-prize")
    }
    // Отменяем мониторинг анимации
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    // Перегенерируем для следующего спина, чтобы лента была "свежей"
    // Это также сбросит transform, так как innerHTML будет заменен
    renderPrizeScroll(currentCase, 0)

    openBtn.disabled = false
    openBtn.classList.remove("animate-pulse")
    updateOpenButton()
    isSpinning = false
    console.log("DEBUG: UI сброшен, кнопка активна.")
  }
}

// --- NEW: TON Connect Integration — c TON PROOF ---
const connector = new TonConnect({
  manifestUrl: "https://mtkache09.github.io/telegram-stars-case/manifest.json",
  // storage опционально
});

async function connectTonWallet() {
  if (isSpinning) {
    showNotification("Подождите, пока завершится текущая операция.", "info");
    return;
  }

  const connectBtn = document.getElementById("connectTonWalletBtn");
  connectBtn.disabled = true;
  const originalBtnText = connectBtn.innerHTML;
  connectBtn.innerHTML = '<span class="animate-pulse">Подключение...</span>';

  try {
    // === 1. Генерируем payload для TON Proof (лучше получить с backend, можно Date.now или crypto.randomUUID)
    const tonProofPayload = Date.now().toString();

    // === 2. Вызов TON Connect с TON Proof
    const { universalLink, tonProof } = await connector.connect({
      tonProof: tonProofPayload
    });

    // 3. Для пользователя: открываем ссылку с universal link
    window.open(universalLink, "_blank");

    // 4. Подписываемся на результат коннекта
    const unsubscribe = connector.onStatusChange(async (wallet) => {
      connectBtn.innerHTML = originalBtnText;
      connectBtn.disabled = false;

      if (wallet) {
        unsubscribe();
        const walletAddress = wallet.account.address;
        const userId = getUserId();

        // Получаем proof-данные (если есть)
        const proofObj = tonProof && tonProof.proof ? tonProof.proof : null;
        const publicKey = proofObj && proofObj.pubkey ? proofObj.pubkey : null;

        // Формируем JSON для backend
        const body = {
          user_id: userId,
          wallet_address: walletAddress,
          proof: proofObj || undefined,
          public_key: publicKey || undefined
        };

        // Отправляем на сервер
        try {
          const response = await fetch(`${API_BASE}/ton/connect`, {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("DEBUG: Backend response for TON connect:", data);
            showNotification("✅ Адрес TON кошелька сохранен на сервере!", "success", 3000);
          } else {
            const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
            console.error("❌ Ошибка сохранения TON кошелька на сервере:", response.status, errorData)
            showNotification(
              `❌ Ошибка сохранения TON кошелька: ${errorData.detail || "Неизвестная ошибка"}`,
              "error",
              5000,
            )
          }
        } catch (backendError) {
          console.error("❌ Ошибка при отправке TON кошелька на сервер:", backendError);
          showNotification("❌ Ошибка сети при сохранении TON кошелька.", "error", 5000);
        }
      } else {
        console.log("DEBUG: TON Wallet disconnected or connection failed.");
        showNotification("⚠️ Подключение TON кошелька отменено или не удалось.", "info", 3000);
      }
    });
  } catch (error) {
    console.error("❌ Ошибка при инициализации TON Connect:", error)
    showNotification(`❌ Ошибка TON Connect: ${error.message}`, "error", 5000)
    connectBtn.innerHTML = originalBtnText
    connectBtn.disabled = false
  }
}// --- END: NEW TON Connect Integration ---

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

// NEW: Event listener for TON Wallet Connect button
document.getElementById("connectTonWalletBtn").addEventListener("click", connectTonWallet)

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
