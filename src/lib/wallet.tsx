"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { BrowserProvider, JsonRpcSigner } from "ethers"
import { 
  authenticateWithWallet, 
  getStoredToken, 
  removeStoredToken,
  getCurrentUser,
} from "@/lib/auth"

export interface WalletState {
  address: string | null
  chainId: number | null
  balance: string | null
  isConnected: boolean
  isConnecting: boolean
  isAuthenticated: boolean
  isAuthenticating: boolean
  error: string | null
  token: string | null
}

export interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
  signer: JsonRpcSigner | null
  provider: BrowserProvider | null
}

const WalletContext = createContext<WalletContextType | null>(null)

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const getBalance = useCallback(async (address: string, provider: BrowserProvider) => {
    try {
      const balance = await provider.getBalance(address)
      setBalance((balance / BigInt(1e18)).toString())
    } catch {
      setBalance(null)
    }
  }, [])

  const authenticate = useCallback(async (address: string) => {
    setIsAuthenticating(true)
    try {
      const jwtToken = await authenticateWithWallet(address)
      setToken(jwtToken)
      
      try {
        await getCurrentUser(jwtToken)
      } catch {
        // Token might be valid even if user lookup fails
      }
    } catch (err) {
      console.error("Authentication failed:", err)
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const handleAccountsChanged = useCallback(async (accounts: unknown) => {
    const accountsArray = accounts as string[]
    if (accountsArray.length === 0) {
      setAddress(null)
      setBalance(null)
      setSigner(null)
      setToken(null)
      removeStoredToken()
    } else {
      const newAddress = accountsArray[0].toLowerCase()
      setAddress(newAddress)
      if (provider) {
        await getBalance(newAddress, provider)
        await authenticate(newAddress)
      }
    }
  }, [provider, getBalance, authenticate])

  const handleChainChanged = useCallback((chainIdHex: unknown) => {
    const chainId = parseInt(chainIdHex as string, 16)
    setChainId(chainId)
    window.location.reload()
  }, [])

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not installed. Please install MetaMask to continue.")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const browserProvider = new BrowserProvider(window.ethereum)
      setProvider(browserProvider)

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[]

      if (accounts.length > 0) {
        const userAddress = accounts[0].toLowerCase()
        setAddress(userAddress)

        const userSigner = await browserProvider.getSigner()
        setSigner(userSigner)

        const network = await browserProvider.getNetwork()
        setChainId(Number(network.chainId))

        await getBalance(userAddress, browserProvider)
        
        await authenticate(userAddress)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(message)
    } finally {
      setIsConnecting(false)
    }
  }, [getBalance, authenticate])

  const disconnect = useCallback(() => {
    setAddress(null)
    setChainId(null)
    setBalance(null)
    setSigner(null)
    setProvider(null)
    setToken(null)
    setError(null)
    removeStoredToken()
  }, [])

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) return

    const chainIdHex = `0x${targetChainId.toString(16)}`

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch chain"
      setError(message)
      throw err
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return

    const handleAccountsChangedWrapper = (accounts: unknown) => handleAccountsChanged(accounts)
    const handleChainChangedWrapper = (chainId: unknown) => handleChainChanged(chainId)

    window.ethereum.on("accountsChanged", handleAccountsChangedWrapper)
    window.ethereum.on("chainChanged", handleChainChangedWrapper)

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChangedWrapper)
      window.ethereum?.removeListener("chainChanged", handleChainChangedWrapper)
    }
  }, [handleAccountsChanged, handleChainChanged])

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === "undefined" || !window.ethereum) return

      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        }) as string[]

        if (accounts.length > 0) {
          await connect()
        } else {
          const storedToken = getStoredToken()
          if (storedToken) {
            try {
              const user = await getCurrentUser(storedToken)
              setToken(storedToken)
              setAddress(user.address)
            } catch {
              removeStoredToken()
            }
          }
        }
      } catch {
        // Silent fail for auto-connect
      }
    }

    checkConnection()
  }, [connect])

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        balance,
        isConnected: !!address,
        isConnecting,
        isAuthenticated: !!token,
        isAuthenticating,
        error,
        connect,
        disconnect,
        switchChain,
        signer,
        provider,
        token,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

export function useAuth() {
  const { isConnected, isAuthenticated, token, address } = useWallet()
  
  const authHeaders = useCallback(() => {
    if (!token) return {}
    return {
      "Authorization": `Bearer ${token}`,
    }
  }, [token])

  return {
    isConnected,
    isAuthenticated,
    token,
    address,
    authHeaders,
  }
}

export function formatAddress(addr: string | null): string {
  if (!addr) return ""
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatBalance(balance: string | null): string {
  if (!balance) return "0"
  const num = parseFloat(balance)
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
  if (num >= 1) return num.toFixed(4)
  return num.toFixed(6)
}
