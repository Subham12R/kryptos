"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Bell, Wallet, ChevronDown, X, Loader2, LogOut, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHAINS, MAINNET_CHAINS, TESTNET_CHAINS, type ChainInfo } from "@/lib/constants"
import { useWallet, formatAddress, formatBalance } from "@/lib/wallet"

interface HeaderProps {
  selectedNetwork: string
  onNetworkChange: (network: string) => void
}

export default function Header({ selectedNetwork, onNetworkChange }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copied, setCopied] = useState(false)
  
  const { 
    address, 
    balance, 
    chainId, 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect,
    error,
    switchChain,
  } = useWallet()

  const handleConnect = async () => {
    try {
      await connect()
    } catch {
      // Error handled in context
    }
  }

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setWalletMenuOpen(false)
  }

  const getChainName = (id: number | null): string => {
    if (!id) return "Unknown"
    const chain = CHAINS.find(c => c.id === id)
    return chain?.name || `Chain ${id}`
  }

  const getChainColor = (id: number | null): string => {
    if (!id) return "#666666"
    const chain = CHAINS.find(c => c.id === id)
    return chain?.color || "#666666"
  }

  const selectedChain = CHAINS.find(c => c.short === selectedNetwork) || CHAINS[0]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-[#1A1A1A] bg-[#000000]/95 px-6 backdrop-blur-sm"
      style={{ left: "16rem" }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-2 text-sm text-[#888888] hover:border-[#00FF94] hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span>Search wallet address...</span>
            <kbd className="ml-4 rounded bg-[#1A1A1A] px-1.5 py-0.5 text-xs">⌘K</kbd>
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setNetworkOpen(!networkOpen)}
            className="flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-3 py-2 text-sm font-medium text-white hover:border-[#00FF94]"
          >
            <span 
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: selectedChain.color }}
            />
            {selectedChain.short}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              networkOpen && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {networkOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full z-50 mt-2 w-64 max-h-96 overflow-y-auto rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-1 shadow-xl"
              >
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Mainnet</div>
                {MAINNET_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      onNetworkChange(chain.short)
                      setNetworkOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#1A1A1A]",
                      selectedNetwork === chain.short ? "text-[#00FF94]" : "text-white"
                    )}
                  >
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="flex-1 text-left">{chain.name}</span>
                    <span className="text-xs text-gray-500">{chain.short}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-[#1A1A1A]" />
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Testnet</div>
                {TESTNET_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      onNetworkChange(chain.short)
                      setNetworkOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[#1A1A1A]",
                      selectedNetwork === chain.short ? "text-[#00FF94]" : "text-white"
                    )}
                  >
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="flex-1 text-left">{chain.name}</span>
                    <span className="text-xs text-gray-500">{chain.short}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-[#888888] hover:bg-[#1A1A1A] hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF3B3B]" />
        </button>

        {isConnected ? (
          <div className="relative">
            <button
              onClick={() => setWalletMenuOpen(!walletMenuOpen)}
              className="flex items-center gap-2 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/30 px-4 py-2 text-sm font-medium text-[#00FF94] hover:bg-[#00FF94]/20"
            >
              <span className="h-2 w-2 rounded-full bg-[#00FF94] animate-pulse" />
              <span>{formatAddress(address)}</span>
              <span className="text-gray-400">|</span>
              <span>{formatBalance(balance)} ETH</span>
              <ChevronDown className={cn("h-4 w-4", walletMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {walletMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-2 shadow-xl"
                >
                  <div className="border-b border-[#1A1A1A] px-4 pb-3">
                    <p className="text-xs text-gray-500">Connected Wallet</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-sm text-white">{formatAddress(address)}</p>
                      <button onClick={handleCopyAddress} className="text-gray-400 hover:text-white">
                        {copied ? <span className="text-[#00FF94]">Copied!</span> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 border-b border-[#1A1A1A]">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Balance</span>
                      <span className="text-white">{formatBalance(balance)} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Chain</span>
                      <span className="text-white">{getChainName(chainId)}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleDisconnect}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#FF3B3B] hover:bg-[#1A1A1A]"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                    <a
                      href={`https://etherscan.io/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Explorer
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setWalletMenuOpen(!walletMenuOpen)}
              className="flex items-center gap-3 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] px-4 py-2 text-sm hover:border-[#00FF94]"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#00FF94] to-[#00CC77] flex items-center justify-center">
                <span className="text-sm font-semibold text-black">JD</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-medium">John Doe</span>
                <span className="text-xs text-gray-500">Pro Member</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-gray-400", walletMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {walletMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-2 shadow-xl"
                >
                  <div className="border-b border-[#1A1A1A] px-4 pb-3">
                    <p className="text-xs text-gray-500">Profile</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-white">John Doe</p>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 border-b border-[#1A1A1A]">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Plan</span>
                      <span className="text-[#00FF94]">Pro</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">API Calls</span>
                      <span className="text-white">2,450 / 5,000</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/portfolio"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
                    >
                      Portfolio
                    </Link>
                    <Link
                      href="/risk-reports"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
                    >
                      Risk Reports
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
                    >
                      Settings
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#FF3B3B] hover:bg-[#1A1A1A]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-24 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[#1A1A1A] pb-4">
                <Search className="h-5 w-5 text-[#888888]" />
                <input
                  type="text"
                  placeholder="Search wallet address, ENS name, or transaction hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-[#555555] focus:outline-none"
                  autoFocus
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X className="h-5 w-5 text-[#888888]" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#555555]">Recent searches</p>
                <div className="mt-2 space-y-2">
                  {["0x742d35Cc6634C0532925a3b844Bc9e7595f2a3b1", "vitalik.eth"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setSearchQuery(item)
                        setSearchOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#888888] hover:bg-[#1A1A1A] hover:text-white"
                    >
                      <Search className="h-4 w-4" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}
    </motion.header>
  )
}
