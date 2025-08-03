// Модуль для работы с TON Connect
import { STATE, CONFIG } from "./config.js"
import { telegramManager } from "./telegram.js"
import { showNotification, debugLog } from "./ui.js"

export class TonConnectManager {
  constructor() {
    this.manifestUrls = [
      window.location.origin + "/tonconnect-manifest.json",
      "https://vladimiropaits.github.io/Casino/tonconnect-manifest.json",
      "https://vladimiropaits.github.io/Casino/untitled3/tonconnect-manifest.json",
    ]
  }

  async init() {
    try {
      debugLog("🔄 Инициализация TON Connect UI...")

      if (typeof TON_CONNECT_UI === "undefined") {
        throw new Error("TON_CONNECT_UI не загружен. Проверьте подключение библиотеки.")
      }

      const manifestUrl = await this.findWorkingManifest()
      debugLog(`📄 Используем manifest: ${manifestUrl}`)

      STATE.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: manifestUrl,
        buttonRootId: "ton-connect-ui",
      })

      STATE.tonConnectUI.onStatusChange((wallet) => {
        if (wallet && wallet.account) {
          showNotification("✅ TON кошелек подключен", "success", 3000)
          this.processWalletConnection(wallet)
        } else {
          STATE.walletData = null
          this.updateConnectButton(false)
          showNotification("⚠️ TON кошелек отключен", "info", 3000)
        }
      })

      const wallet = STATE.tonConnectUI.wallet
      if (wallet && wallet.account) {
        await this.checkExistingWallet(wallet.account.address)
      }
    } catch (error) {
      console.error("❌ Ошибка инициализации TON Connect:", error)
      showNotification(`❌ Ошибка TON Connect: ${error.message}`, "error", 5000)
    }
  }

  async findWorkingManifest() {
    for (const url of this.manifestUrls) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          debugLog(`📄 Manifest найден: ${url}`)
          return url
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }

    // Fallback
    return this.manifestUrls[0]
  }

  async processWalletConnection(wallet) {
    try {
      if (!wallet.account) {
        throw new Error("Аккаунт кошелька недоступен")
      }

      STATE.walletData = {
        wallet_address: wallet.account.address,
        user_id: telegramManager.getUserId(),
        network: wallet.account.chain.toString(),
        public_key: wallet.account.publicKey,
      }

      if (wallet.proof) {
        STATE.walletData.proof = {
          timestamp: wallet.proof.timestamp,
          domain: {
            lengthBytes: wallet.proof.domain.lengthBytes,
            value: wallet.proof.domain.value,
          },
          signature: wallet.proof.signature,
          payload: wallet.proof.payload,
          pubkey: wallet.proof.pubkey || wallet.account.publicKey,
        }
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
      const response = await fetch(`${CONFIG.API_BASE}/ton/connect`, {
        method: "POST",
        headers: telegramManager.getAuthHeaders(),
        body: JSON.stringify(STATE.walletData),
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
        headers: telegramManager.getAuthHeaders(),
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
            public_key: null,
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
