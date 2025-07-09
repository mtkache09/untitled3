// 🌐 ОБНОВЛЕННАЯ версия для GitHub Pages
// Замените API_BASE на URL вашего деплоя FastAPI

// Вариант 1: Если задеплоите на Railway
//onst API_BASE_RAILWAY = "https://your-app-name.railway.app"

// Вариант 2: Если задеплоите на Render
// const API_BASE_RENDER = "https://your-app-name.onrender.com"

// Вариант 3: Если задеплоите на Fly.io
// const API_BASE_FLY = "https://your-app-name.fly.dev"

// Вариант 4: Умный выбор (рекомендуется)
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : "http://your-server-ip-or-domain:8000"// 🔄 Замените на реальный URL

const tg = window.Telegram?.WebApp

if (tg) {
  tg.ready()
  tg.expand()
  tg.MainButton.hide()
}

const getUserId = () => {
  return tg?.initDataUnsafe?.user?.id || 12345
}

// Состояние приложения
let userFantics = 0
let cases = []
let currentCase = null
let isSpinning = false
let selectedDepositAmount = null

// Варианты пополнения
const depositAmounts = [
  { amount: 1000, bonus: 0, popular: false },
  { amount: 2500, bonus: 250, popular: false },
  { amount: 5000, bonus: 750, popular: true },
  { amount: 10000, bonus: 2000, popular: false },
  { amount: 25000, bonus: 5000, popular: false },
  { amount: 50000, bonus: 15000, popular: false },
]

// API функции
async function fetchUserFantics() {
  try {
    console.log("Запрос баланса:", `${API_BASE}/fantics/${getUserId()}`)
    const response = await fetch(`${API_BASE}/fantics/${getUserId()}`)
    if (response.ok) {
      const data = await response.json()
      userFantics = data.fantics
      updateFanticsDisplay()
      console.log("✅ Баланс получен:", userFantics)
    } else {
      console.error("❌ Ошибка получения баланса:", response.status)
      alert("⚠️ Не удается подключиться к серверу")
    }
  } catch (error) {
    console.error("❌ Ошибка API:", error)
    alert("⚠️ Сервер временно недоступен")
  }
}

async function fetchCases() {
  try {
    console.log("Запрос кейсов:", `${API_BASE}/cases`)
    const response = await fetch(`${API_BASE}/cases`)
    if (response.ok) {
      cases = await response.json()
      renderCases()
      console.log("✅ Кейсы загружены:", cases.length)
    } else {
      console.error("❌ Ошибка получения кейсов:", response.status)
    }
  } catch (error) {
    console.error("❌ Ошибка получения кейсов:", error)
    // Показываем заглушку если API недоступен
    cases = [
      {
        id: 1,
        name: "Демо кейс",
        cost: 1000,
        possible_rewards: [
          { cost: 500, probability: 50 },
          { cost: 2000, probability: 50 },
        ],
      },
    ]
    renderCases()
    console.log("⚠️ Используются демо-данные")
  }
}

async function openCaseAPI(caseId) {
  try {
    const response = await fetch(`${API_BASE}/open_case/${caseId}?user_id=${getUserId()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const result = await response.json()
      return result
    } else {
      const error = await response.json()
      throw new Error(error.detail || "Ошибка открытия кейса")
    }
  } catch (error) {
    console.error("Ошибка открытия кейса:", error)
    throw error
  }
}

async function addFantics(amount) {
  try {
    const response = await fetch(`${API_BASE}/fantics/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: getUserId(),
        amount: amount,
      }),
    })

    if (response.ok) {
      setTimeout(() => {
        fetchUserFantics()
      }, 1000) // Уменьшаем задержку без RabbitMQ
      return true
    }
    return false
  } catch (error) {
    console.error("Ошибка пополнения:", error)
    return false
  }
}

// Остальные функции UI остаются без изменений...
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

  cases.forEach((caseItem) => {
    const canAfford = userFantics >= caseItem.cost

    const caseElement = document.createElement("div")
    caseElement.className = `cursor-pointer transition-all duration-300 hover-scale bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 text-center ${
      canAfford
        ? "hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/50"
        : "opacity-50 cursor-not-allowed"
    }`

    // Иконки для разных кейсов
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

    amountElement.addEventListener("click", () => selectDepositAmount(item))
    depositAmountsContainer.appendChild(amountElement)
  })
}

function selectDepositAmount(item) {
  selectedDepositAmount = item
  updateDepositButton()

  // Убираем выделение с других элементов
  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })

  // Выделяем выбранный элемент
  event.target.closest("div").classList.add("selected-amount", "ring-2", "ring-purple-400")

  // Очищаем кастомное поле
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
    alert("Выберите сумму для пополнения")
    return
  }

  // Показываем индикатор загрузки
  const confirmBtn = document.getElementById("confirmDepositBtn")
  const originalText = confirmBtn.innerHTML
  confirmBtn.innerHTML = '<span class="animate-pulse">Пополняем...</span>'
  confirmBtn.disabled = true

  try {
    const success = await addFantics(amountToDeposit)

    if (success) {
      alert(`✅ Запрос на пополнение отправлен! Баланс обновится через несколько секунд.`)
      closeDepositModal()
      renderCases() // Обновляем отображение кейсов
    } else {
      alert("❌ Ошибка при пополнении баланса")
    }
  } catch (error) {
    alert("❌ Ошибка при пополнении баланса")
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

  renderPrizeScroll(caseData)
  renderPossiblePrizes(caseData)
}

function renderPrizeScroll(caseData) {
  const prizeScroll = document.getElementById("prizeScroll")
  prizeScroll.innerHTML = ""

  // Создаем призы на основе данных кейса
  const possibleRewards = caseData.possible_rewards

  // Создаем много призов для эффекта прокрутки (30 призов)
  for (let i = 0; i < 30; i++) {
    const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
    const prizeElement = document.createElement("div")

    // Цвет в зависимости от стоимости приза
    let colorClass = "bg-gradient-to-br from-gray-700 to-gray-900"
    if (randomReward.cost >= 5000) colorClass = "bg-gradient-to-br from-purple-600 to-purple-800"
    else if (randomReward.cost >= 2000) colorClass = "bg-gradient-to-br from-purple-700 to-purple-800"
    else if (randomReward.cost >= 1000) colorClass = "bg-gradient-to-br from-purple-800 to-purple-900"
    else if (randomReward.cost >= 500) colorClass = "bg-gradient-to-br from-gray-500 to-gray-700"

    prizeElement.className = `flex-shrink-0 w-20 h-20 ${colorClass} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg border border-white/20 transition-all duration-300`
    prizeElement.textContent = `${randomReward.cost} 💎`
    prizeScroll.appendChild(prizeElement)
  }
}

function renderPossiblePrizes(caseData) {
  const possiblePrizes = document.getElementById("possiblePrizes")
  possiblePrizes.innerHTML = ""

  caseData.possible_rewards.forEach((reward) => {
    const prizeElement = document.createElement("div")

    // Цвет в зависимости от стоимости и вероятности
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

  if (!demoMode && userFantics < currentCase.cost) {
    alert("Недостаточно фантиков!")
    return
  }

  isSpinning = true
  const prizeScroll = document.getElementById("prizeScroll")
  const openBtn = document.getElementById("openCaseBtn")

  openBtn.disabled = true
  openBtn.innerHTML = '<span class="animate-pulse">Открываем...</span>'

  try {
    let result = null

    if (!demoMode) {
      // Реальное открытие кейса через API
      result = await openCaseAPI(currentCase.id)
    } else {
      // Демо режим - случайный приз
      const possibleRewards = currentCase.possible_rewards
      const randomReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)]
      result = { gift: randomReward.cost }
    }

    // Перегенерируем призы для случайности
    renderPrizeScroll(currentCase)

    // Добавляем анимацию прокрутки
    prizeScroll.classList.add("prize-scroll")

    setTimeout(() => {
      // Убираем анимацию
      prizeScroll.classList.remove("prize-scroll")

      // Находим приз в центре и показываем выигрыш
      const centerPrize = prizeScroll.children[Math.floor(prizeScroll.children.length / 2)]
      if (centerPrize) {
        centerPrize.textContent = `${result.gift} 💎`
        centerPrize.classList.add("winning-prize")
      }

      if (!demoMode) {
        // Обновляем баланс через 3 секунды (время обработки RabbitMQ)
        setTimeout(() => {
          fetchUserFantics()
          renderCases()
        }, 3000)
      }

      // Показываем результат через небольшую задержку
      setTimeout(() => {
        const profit = result.profit || 0
        const profitText = profit > 0 ? `(+${profit} 💎)` : profit < 0 ? `(${profit} 💎)` : ""

        alert(`🎉 Поздравляем! Вы выиграли: ${result.gift} 💎 ${profitText}`)

        // Убираем подсветку
        if (centerPrize) {
          centerPrize.classList.remove("winning-prize")
        }

        openBtn.disabled = false
        updateOpenButton()
        isSpinning = false
      }, 1000)
    }, 4000) // 4 секунды анимации
  } catch (error) {
    alert(`❌ Ошибка: ${error.message}`)
    openBtn.disabled = false
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

// Custom amount input listener
document.getElementById("customAmount").addEventListener("input", () => {
  selectedDepositAmount = null
  document.querySelectorAll("#depositAmounts > div").forEach((el) => {
    el.classList.remove("selected-amount", "ring-2", "ring-purple-400")
  })
  updateDepositButton()
})

// Закрытие модального окна по клику на фон
document.getElementById("depositModal").addEventListener("click", (e) => {
  if (e.target.id === "depositModal") {
    closeDepositModal()
  }
})

// Инициализация приложения
async function initApp() {
  console.log("🚀 Инициализация приложения...")
  console.log("API URL:", API_BASE)

  await fetchUserFantics()
  await fetchCases()

  console.log("✅ Приложение готово!")
}

// Запуск приложения
initApp()
