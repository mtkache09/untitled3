const cases = [
  {
    id: 1,
    name: "Базовый кейс",
    price: 50,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 7h-9a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z"></path><path d="M9 22V12a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9z"></path></svg>`,
    color: "bg-gradient-to-br from-gray-600 to-gray-800",
  },
  {
    id: 2,
    name: "Серебряный кейс",
    price: 100,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20,6 9,17 4,12"></polyline></svg>`,
    color: "bg-gradient-to-br from-gray-400 to-gray-600",
  },
  {
    id: 3,
    name: "Золотой кейс",
    price: 250,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16l-1-7H5z"></path><path d="M8 9h8"></path></svg>`,
    color: "bg-gradient-to-br from-purple-400 to-purple-600",
  },
  {
    id: 4,
    name: "Платиновый кейс",
    price: 500,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 3h6l4 6 4-6h6l-8 12v6H10v-6z"></path></svg>`,
    color: "bg-gradient-to-br from-purple-500 to-purple-700",
  },
  {
    id: 5,
    name: "Алмазный кейс",
    price: 1000,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 3h12l4 6-10 13L2 9z"></path><path d="M11 3L8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path></svg>`,
    color: "bg-gradient-to-br from-purple-600 to-purple-800",
  },
  {
    id: 6,
    name: "Мистический кейс",
    price: 2000,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon></svg>`,
    color: "bg-gradient-to-br from-purple-700 to-black",
  },
]

// Призы в черно-белых фиолетовых тонах
const prizes = [
  { name: "10 ⭐", color: "bg-gradient-to-br from-gray-700 to-gray-900", rarity: "common" },
  { name: "25 ⭐", color: "bg-gradient-to-br from-gray-600 to-gray-800", rarity: "common" },
  { name: "50 ⭐", color: "bg-gradient-to-br from-gray-500 to-gray-700", rarity: "uncommon" },
  { name: "100 ⭐", color: "bg-gradient-to-br from-purple-900 to-black", rarity: "rare" },
  { name: "250 ⭐", color: "bg-gradient-to-br from-purple-800 to-purple-900", rarity: "epic" },
  { name: "500 ⭐", color: "bg-gradient-to-br from-purple-700 to-purple-800", rarity: "legendary" },
  { name: "1000 ⭐", color: "bg-gradient-to-br from-purple-600 to-purple-700", rarity: "legendary" },
  { name: "Джекпот!", color: "bg-gradient-to-br from-purple-500 to-purple-700", rarity: "mythic" },
]

// Варианты пополнения
const depositAmounts = [
  { amount: 100, bonus: 0, popular: false },
  { amount: 250, bonus: 25, popular: false },
  { amount: 500, bonus: 75, popular: true },
  { amount: 1000, bonus: 200, popular: false },
  { amount: 2500, bonus: 500, popular: false },
  { amount: 5000, bonus: 1500, popular: false },
]

let userStars = 1250
let currentCase = null
let isSpinning = false
let selectedDepositAmount = null
const tg = window.Telegram?.WebApp

// Инициализация Telegram WebApp
if (tg) {
  tg.ready()
  tg.expand()
  tg.MainButton.hide()
}

function updateStarsDisplay() {
  document.getElementById("userStars").textContent = userStars.toLocaleString()
  document.getElementById("userStarsCase").textContent = userStars.toLocaleString()
  document.getElementById("modalUserStars").textContent = userStars.toLocaleString()
}

function updateOpenButton() {
  const demoMode = document.getElementById("demoMode").checked
  const openBtnText = document.getElementById("openBtnText")

  if (demoMode) {
    openBtnText.textContent = "Открыть бесплатно"
    document.getElementById("openCaseBtn").className =
      "w-full h-14 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-bold text-lg shadow-lg rounded-lg transition-all mb-8"
  } else {
    openBtnText.textContent = `Открыть за ${currentCase.price} ⭐`
    document.getElementById("openCaseBtn").className =
      "w-full h-14 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold text-lg shadow-lg rounded-lg transition-all mb-8"
  }
}

function renderCases() {
  const casesGrid = document.getElementById("casesGrid")
  casesGrid.innerHTML = ""

  cases.forEach((caseItem) => {
    const canAfford = userStars >= caseItem.price

    const caseElement = document.createElement("div")
    caseElement.className = `cursor-pointer transition-all duration-300 hover-scale bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 text-center ${
      canAfford
        ? "hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/50"
        : "opacity-50 cursor-not-allowed"
    }`

    caseElement.innerHTML = `
            <div class="w-16 h-16 rounded-xl ${caseItem.color} flex items-center justify-center mb-3 mx-auto shadow-lg border border-white/10">
                <div class="w-8 h-8 text-white">${caseItem.icon}</div>
            </div>
            <h3 class="font-semibold text-white text-sm mb-2 leading-tight">${caseItem.name}</h3>
            <div class="flex items-center justify-center gap-1">
                <svg class="w-4 h-4 text-purple-400 fill-purple-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span class="font-bold text-sm ${canAfford ? "text-gray-200" : "text-gray-500"}">${caseItem.price.toLocaleString()}</span>
            </div>
            ${!canAfford ? '<div class="mt-2"><span class="text-xs text-red-400 font-medium">Недостаточно звёзд</span></div>' : ""}
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
            <div class="text-white font-bold text-lg">${item.amount} ⭐</div>
            ${item.bonus > 0 ? `<div class="text-purple-400 text-sm">+${item.bonus} бонус</div>` : ""}
            ${item.bonus > 0 ? `<div class="text-gray-400 text-xs">Итого: ${totalAmount} ⭐</div>` : ""}
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
    btnText.textContent = `Пополнить на ${totalAmount} ⭐`
    confirmBtn.disabled = false
  } else if (customAmount && customAmount > 0) {
    btnText.textContent = `Пополнить на ${customAmount} ⭐`
    confirmBtn.disabled = false
  } else {
    btnText.textContent = "Выберите сумму"
    confirmBtn.disabled = true
  }
}

function openDepositModal() {
  document.getElementById("depositModal").classList.remove("hidden")
  renderDepositAmounts()
  updateStarsDisplay()
}

function closeDepositModal() {
  document.getElementById("depositModal").classList.add("hidden")
  selectedDepositAmount = null
  document.getElementById("customAmount").value = ""
  updateDepositButton()
}

function processDeposit() {
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

  // Инициируем платёж через Telegram Stars
  if (tg) {
    // Создаем invoice для Telegram Stars
    const invoice = {
      title: "Пополнение Stars",
      description: `Пополнение баланса на ${amountToDeposit} звёзд`,
      payload: JSON.stringify({
        type: "deposit",
        amount: amountToDeposit,
        user_id: tg.initDataUnsafe?.user?.id,
      }),
      provider_token: "", // Для Telegram Stars не нужен
      currency: "XTR", // Telegram Stars currency
      prices: [{ label: `${amountToDeposit} Stars`, amount: amountToDeposit }],
    }

    // Отправляем данные боту для создания инвойса
    tg.sendData(
      JSON.stringify({
        action: "create_invoice",
        amount: amountToDeposit,
        selectedPackage: selectedDepositAmount,
      }),
    )

    closeDepositModal()
  } else {
    // Для тестирования без Telegram
    alert(`Пополнение на ${amountToDeposit} ⭐ (тестовый режим)`)
    userStars += amountToDeposit
    updateStarsDisplay()
    renderCases()
    closeDepositModal()
  }
}

function openCasePage(caseData) {
  currentCase = caseData
  document.getElementById("mainPage").classList.add("hidden")
  document.getElementById("casePage").classList.remove("hidden")

  document.getElementById("caseTitle").textContent = caseData.name
  updateOpenButton()

  renderPrizeScroll()
  renderPossiblePrizes()
}

function renderPrizeScroll() {
  const prizeScroll = document.getElementById("prizeScroll")
  prizeScroll.innerHTML = ""

  // Создаем много призов для эффекта прокрутки (30 призов)
  for (let i = 0; i < 30; i++) {
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)]
    const prizeElement = document.createElement("div")
    prizeElement.className = `flex-shrink-0 w-20 h-20 ${randomPrize.color} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg border border-white/20 transition-all duration-300`
    prizeElement.textContent = randomPrize.name
    prizeScroll.appendChild(prizeElement)
  }
}

function renderPossiblePrizes() {
  const possiblePrizes = document.getElementById("possiblePrizes")
  possiblePrizes.innerHTML = ""

  prizes.forEach((prize) => {
    const prizeElement = document.createElement("div")
    prizeElement.className = `${prize.color} rounded-lg p-3 text-center text-white font-semibold text-sm shadow-lg border border-white/20`
    prizeElement.textContent = prize.name
    possiblePrizes.appendChild(prizeElement)
  })
}

function spinPrizes() {
  if (isSpinning) return

  const demoMode = document.getElementById("demoMode").checked

  if (!demoMode && userStars < currentCase.price) {
    alert("Недостаточно звёзд!")
    return
  }

  isSpinning = true
  const prizeScroll = document.getElementById("prizeScroll")
  const openBtn = document.getElementById("openCaseBtn")

  openBtn.disabled = true
  openBtn.innerHTML = '<span class="animate-pulse">Открываем...</span>'

  // Перегенерируем призы для случайности
  renderPrizeScroll()

  // Добавляем анимацию прокрутки
  prizeScroll.classList.add("prize-scroll")

  setTimeout(() => {
    // Определяем выигрышный приз
    const winningPrize = prizes[Math.floor(Math.random() * prizes.length)]

    // Убираем анимацию
    prizeScroll.classList.remove("prize-scroll")

    // Находим приз в центре и подсвечиваем его
    const centerPrize = prizeScroll.children[Math.floor(prizeScroll.children.length / 2)]
    if (centerPrize) {
      centerPrize.textContent = winningPrize.name
      centerPrize.className = centerPrize.className.replace(
        centerPrize.className.split(" ").find((c) => c.includes("bg-")),
        winningPrize.color,
      )
      centerPrize.classList.add("winning-prize")
    }

    if (!demoMode) {
      userStars -= currentCase.price
      updateStarsDisplay()
      renderCases()
    }

    // Показываем результат через небольшую задержку
    setTimeout(() => {
      alert(`🎉 Поздравляем! Вы выиграли: ${winningPrize.name}`)

      // Убираем подсветку
      if (centerPrize) {
        centerPrize.classList.remove("winning-prize")
      }

      openBtn.disabled = false
      updateOpenButton()
      isSpinning = false
    }, 1000)
  }, 4000) // 4 секунды анимации
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
  // Убираем выделение с предустановленных сумм
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

// Initialize
updateStarsDisplay()
renderCases()
