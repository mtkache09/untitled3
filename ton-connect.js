// Модуль для работы с TON Connect
import { STATE, CONFIG } from "./config.js"
import { telegramManager } from "./telegram.js"
import { showNotification, debugLog } from "./ui.js"

export class TonConnectManager {
  constructor() {
    this.manifestFallbacks = [
      "https://vladimiropaits.github.io/Casino/tonconnect-manifest.json",
      "https://vladimiropaits.github.io/Casino/untitled3/tonconnect-manifest.json"
    ]
  }

  async init() {
    try {
      debugLog("🔄 Инициализация TON Connect UI...")
      debugLog(`🔍 TON_CONNECT_UI: ${typeof TON_CONNECT_UI !== 'undefined' ? 'доступен' : 'недоступен'}`)

      if (typeof TON_CONNECT_UI === "undefined") {
        throw new Error("TON_CONNECT_UI не загружен. Проверьте подключение библиотеки.")
      }

      // Строим локальный путь
      const currentPath = window.location.pathname.endsWith("/") 
        ? window.location.pathname 
        : window.location.pathname + "/"

      const localManifestUrl = window.location.origin + currentPath + "tonconnect-manifest.json"
      debugLog(`📄 Предполагаемый Manifest URL: ${localManifestUrl}`)
      debugLog(`🌐 Текущий адрес: ${window.location.href}`)

      // Ищем рабочий manifest
      const manifestUrl = await this.findWorkingManifest(localManifestUrl)
      debugLog(`✅ Используем Manifest: ${manifestUrl}`)

      // Инициализируем TON Connect UI
      STATE.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: manifestUrl,
        buttonRootId: "ton-connect-ui"
      })

      // Подписываемся на изменения статуса кошелька
      STATE.tonConnectUI.onStatusChange((wallet) => {
        if (wallet && wallet.account) {
          debugLog(`✅ Кошелек подключен: ${wallet.account.address}`)
          showNotification("✅ TON кошелек подключен", "success", 3000)
          this.processWalletConnection(wallet)
        } else {
          STATE.walletData = null
          this.updateConnectButton(false)
          showNotification("⚠️ TON кошелек отключен", "info", 3000)
        }
      })

      // Проверяем, подключен ли кошелек при инициализации
      const wallet = STATE.tonConnectUI.wallet
      if (wallet && wallet.account) {
        debugLog("🔄 Кошелек уже подключен при загрузке страницы")
        await this.checkExistingWallet(wallet.account.address)
      }

      debugLog("✅ TON Connect UI инициализирован")
    } catch (error) {
      console.error("❌ Ошибка инициализации TON Connect:", error)
      showNotification(`❌ Ошибка TON Connect: ${error.message}`, "error", 5000)
    }
  }

  async findWorkingManifest(localManifestUrl) {
    try {
      debugLog(`🔍 Проверяем локальный Manifest: ${localManifestUrl}`)
      const response = await fetch(localManifestUrl)
      if (response.ok) {
        debugLog(`✅ Найден локальный Manifest: ${localManifestUrl}`)
        return localManifestUrl
      }
      throw new Error(`Локальный Manifest недоступен: ${response.status}`)
    } catch (e) {
      debugLog(`⚠️ Локальный Manifest недоступен: ${e.message}`)
    }

    for (const fallback of this.manifestFallbacks) {
      try {
        const response = await fetch(fallback)
        if (response.ok) {
          debugLog(`✅ Найден fallback Manifest: ${fallback}`)
          return fallback
        }
      } catch (e) {
        debugLog(`⚠️ Fallback не доступен: ${fallback}`)
      }
    }

    // Если ничего не нашли — кидаем ошибку
    throw new Error("Manifest не найден ни по одному пути")
  }

  async processWalletConnection(wallet) {
    try {
      if (!wallet.account) throw new Error("Аккаунт кошелька недоступен")

      STATE.walletData = {
        wallet_address: wallet.account.address,
        user_id: telegramManager.getUserId(),
        network: wallet.account.chain.toString(),
        public_key: wallet.account.publicKey
      }

      if (wallet.proof) {
        debugLog("🔐 TON Proof получен")
        STATE.walletData.proof = {
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
        debugLog("⚠️ TON Proof не получен")
      }

      this.updateConnectButton(true, wallet.account.address)
      await this.sendWalletToBackend()
    } catch (error) {
      console.error("❌ Ошибка обработки подключения кошелька:", error)
      showNotification(`❌ Ошибка подключения кошелька: ${error.message}`, "error", 5000)
    }
  }

  updateConnectButton(connected, address = null) {
    const connectBtn = document.getElementById("connectTonWalletBtn")
    if (!connectBtn) return

    if (connected && address) {
      connectBtn.disabled = true
      connectBtn.innerHTML = `
        <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
        ✅ ${address.substring(0, 6)}...${address.substring(address.length - 4)}
      `
    } else {
      connectBtn.disabled = false
      connectBtn.innerHTML = `
        <svg class="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
          <path d="M12 6v6l4 2"></path>
        </svg>
        Подключить TON Кошелек
      `
    }
  }

  async sendWalletToBackend() {
    if (!STATE.walletData) {
      showNotification("Нет данных кошелька для отправки", "warning")
      return
    }

    try {
      debugLog("📤 Отправка данных кошелька на сервер...")
      const response = await fetch(`${CONFIG.API_BASE}/ton/connect`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify(STATE.walletData)
      })

      if (response.ok) {
        showNotification("✅ TON кошелек подключен и сохранен!", "success", 3000)
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }))
        if (errorData.detail && (errorData.detail.includes("уже") || errorData.detail.includes("already"))) {
          showNotification("✅ TON кошелек уже подключен", "success", 3000)
        } else {
          showNotification(`❌ Ошибка сохранения кошелька: ${errorData.detail}`, "error", 5000)
        }
      }
    } catch (error) {
      showNotification("❌ Ошибка сети при сохранении кошелька", "error", 5000)
    }
  }

  async checkExistingWallet(walletAddress) {
    try {
      const response = await fetch(`${CONFIG.API_BASE}/ton/wallets`, {
        method: "GET",
        headers: telegramManager.getAuthHeaders()
      })

      if (response.ok) {
        const wallets = await response.json()
        const existingWallet = wallets.find((w) => w.wallet_address === walletAddress)

        if (existingWallet) {
          this.updateConnectButton(true, walletAddress)
          STATE.walletData = {
            wallet_address: walletAddress,
            user_id: telegramManager.getUserId(),
            network: "-239",
            public_key: null
          }
          showNotification("✅ TON кошелек уже подключен", "success", 3000)
          return true
        }
      }
      return false
    } catch (error) {
      return false
    }
  }
}

export const tonConnectManager = new TonConnectManager()
