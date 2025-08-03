// game.js

// Function to render prize scroll\
renderPrizeScroll(caseData, winningGiftCost)
{
  const prizeScroll = document.getElementById("prizeScroll")
  if (!prizeScroll || !caseData) return

  prizeScroll.innerHTML = ""

  const prizes = []

  if (caseData.possible_prizes) {
    caseData.possible_prizes.forEach((prize) => {
      // Adding prizes based on their chance
      const count = Math.max(1, Math.floor(prize.chance || 10))
      for (let i = 0; i < count; i++) {
        prizes.push(prize)
      }
    })
  }

  // Shuffling prizes
  for (let i = prizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[prizes[i], prizes[j]] = [prizes[j], prizes[i]]
  }

  prizes.forEach((prize) => {
    const prizeElement = document.createElement("div")

    // Defining color based on cost
    let bgGradient = "from-purple-600 to-purple-800"
    if (prize.cost >= 1000) {
      bgGradient = "from-yellow-600 to-yellow-800"
    } else if (prize.cost >= 500) {
      bgGradient = "from-purple-600 to-purple-800"
    } else if (prize.cost >= 200) {
      bgGradient = "from-blue-600 to-blue-800"
    } else {
      bgGradient = "from-green-600 to-green-800"
    }

    prizeElement.className = `flex-shrink-0 w-32 h-32 bg-gradient-to-br ${bgGradient} rounded-lg flex flex-col items-center justify-center text-white shadow-lg border border-purple-500/30`

    const iconElement = document.createElement("div")
    iconElement.className = "text-3xl mb-2"
    iconElement.textContent = "💎"

    const nameElement = document.createElement("div")
    nameElement.className = "text-sm font-semibold text-center"
    nameElement.textContent = `${prize.cost} фантиков`

    const costElement = document.createElement("div")
    costElement.className = "text-xs text-purple-300"
    costElement.textContent = prize.chance ? `${prize.chance}%` : "Редкий"

    prizeElement.appendChild(iconElement)
    prizeElement.appendChild(nameElement)
    prizeElement.appendChild(costElement)

    prizeScroll.appendChild(prizeElement)
  })
}

// Other game functions and code can be added here
