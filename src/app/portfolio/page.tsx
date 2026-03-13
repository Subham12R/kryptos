"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Search, Plus, X, Loader2 } from "lucide-react"
import Sidebar from "@/components/dashboard/sidebar"
import Header from "@/components/dashboard/header"
import AccountsTable from "@/components/dashboard/accounts-table"
import TransactionsTable from "@/components/dashboard/transactions-table"
import { api } from "@/lib/api"
import { CHAINS } from "@/lib/constants"

const GlobeVisualization = dynamic(
  () => import("@/components/dashboard/globe-visualization"),
  { ssr: false }
)

interface WatchedWallet {
  address: string
  label: string
  network: string
  riskScore: number
  riskLabel: string
  balance: number
  lastSeen: number
}

export default function PortfolioPage() {
  const router = useRouter()
  const [selectedNetwork, setSelectedNetwork] = useState("ETH")
  const [mounted, setMounted] = useState(false)
  const [addWalletOpen, setAddWalletOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [walletLabel, setWalletLabel] = useState("")
  const [selectedChain, setSelectedChain] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [wallets, setWallets] = useState<WatchedWallet[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadWallets()
  }, [])

  const loadWallets = async () => {
    const saved = localStorage.getItem("watchedWallets")
    if (saved) {
      setWallets(JSON.parse(saved))
    }
  }

  const saveWallets = (newWallets: WatchedWallet[]) => {
    setWallets(newWallets)
    localStorage.setItem("watchedWallets", JSON.stringify(newWallets))
  }

  const handleAddWallet = async () => {
    if (!walletAddress.trim()) return

    setIsAdding(true)
    try {
      const analysis = await api.analyze(walletAddress.trim(), selectedChain)
      const newWallet: WatchedWallet = {
        address: analysis.address,
        label: walletLabel || analysis.ens_name || analysis.address.slice(0, 8) + "...",
        network: CHAINS.find(c => c.id === selectedChain)?.short || "ETH",
        riskScore: analysis.risk_score,
        riskLabel: analysis.risk_label,
        balance: analysis.balance,
        lastSeen: Date.now(),
      }
      saveWallets([...wallets, newWallet])
      setWalletAddress("")
      setWalletLabel("")
      setAddWalletOpen(false)
    } catch (err) {
      console.error("Failed to add wallet:", err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveWallet = (address: string) => {
    saveWallets(wallets.filter(w => w.address !== address))
  }

  const handleAnalyzeWallet = (address: string, chainId: number = 1) => {
    const params = new URLSearchParams({
      address,
      chain: chainId.toString(),
    })
    router.push(`/dashboard?${params.toString()}`)
  }

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Sidebar />

      <Header selectedNetwork={selectedNetwork} onNetworkChange={setSelectedNetwork} />

      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: "16rem" }}
      >
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Portfolio</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your tracked wallets and transactions
                </p>
              </div>
              <button
                onClick={() => setAddWalletOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
                Add Wallet
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {addWalletOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Add Wallet to Watchlist</h3>
                  <button
                    onClick={() => setAddWalletOpen(false)}
                    className="p-1 text-gray-500 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter wallet address (0x...) or ENS name"
                      className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-white focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={walletLabel}
                    onChange={(e) => setWalletLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="w-48 rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white placeholder-gray-500 focus:border-white focus:outline-none"
                  />
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(Number(e.target.value))}
                    className="rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white focus:border-white focus:outline-none"
                  >
                    {CHAINS.filter(c => c.id !== 84532 && c.id !== 11155111).map((chain) => (
                      <option key={chain.id} value={chain.id}>{chain.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddWallet}
                    disabled={isAdding || !walletAddress.trim()}
                    className="flex items-center gap-2 rounded-lg bg-[#00FF94] px-6 py-3 font-medium text-black hover:opacity-90 disabled:opacity-50"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AccountsTable 
                showAll={true} 
                wallets={wallets.map(w => ({
                  id: w.address,
                  address: w.address,
                  ensName: w.label,
                  network: w.network as "ETH" | "BTC" | "SOL",
                  balance: w.balance,
                  balanceUsd: w.balance * 1800,
                  riskScore: w.riskScore,
                  riskLabel: w.riskLabel as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
                  label: w.label,
                  firstSeen: w.lastSeen,
                  lastSeen: w.lastSeen,
                }))}
                onAddWallet={() => setAddWalletOpen(true)}
                onRemoveWallet={handleRemoveWallet}
                onAnalyzeWallet={handleAnalyzeWallet}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TransactionsTable showAll={true} />
            </motion.div>

            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 border-t border-[#1A1A1A] py-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-white">
                    <span className="text-xs font-bold text-black">K</span>
                  </div>
                  <span className="text-sm font-medium text-gray-400">KRYPTOS</span>
                </div>
                <p className="text-xs text-gray-600">
                  © 2026 KRYPTOS. Blockchain Intelligence Platform.
                </p>
              </div>
            </motion.footer>
          </div>
        </div>
      </main>
    </div>
  )
}
