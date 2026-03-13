"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Search, AlertTriangle, Shield, Coins, Wallet, ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2, XCircle, Zap, Activity, Globe, GitBranch, Share2, LayoutDashboard } from "lucide-react"
import Sidebar from "@/components/dashboard/sidebar"
import Header from "@/components/dashboard/header"
import { api } from "@/lib/api"
import { CHAINS } from "@/lib/constants"
import type { WalletAnalysis, TokenPortfolio } from "@/types"

const NetworkGraph = dynamic(
  () => import("@/components/dashboard/network-graph"),
  { ssr: false }
)

function formatAddress(addr: string): string {
  if (!addr) return ""
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatBalance(balance: number): string {
  if (!balance || isNaN(balance)) return "$0.00"
  if (balance >= 1000000) return `$${(balance / 1000000).toFixed(2)}M`
  if (balance >= 1000) return `$${(balance / 1000).toFixed(2)}K`
  return `$${balance.toFixed(2)}`
}

function getRiskColor(score: number): string {
  if (score >= 70) return "text-[#00FF94]"
  if (score >= 40) return "text-[#FFB800]"
  return "text-[#FF3B3B]"
}

function getRiskBg(score: number): string {
  if (score >= 70) return "bg-[#00FF94]/10"
  if (score >= 40) return "bg-[#FFB800]/10"
  return "bg-[#FF3B3B]/10"
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-[#00FF94]"
  if (score >= 40) return "text-[#FFB800]"
  return "text-[#FF3B3B]"
}

interface FactorData {
  name: string
  score: number
  status: "good" | "medium" | "bad"
}

export default function WalletScannerPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState("ETH")
  const [mounted, setMounted] = useState(false)
  const [analysis, setAnalysis] = useState<WalletAnalysis | null>(null)
  const [graphMode, setGraphMode] = useState<"3d" | "2d" | "timeline">("3d")
  const [tokens, setTokens] = useState<TokenPortfolio | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedChainId, setSelectedChainId] = useState(1)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletAddress.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    setError(null)
    setAnalysis(null)
    setTokens(null)

    try {
      const [analysisResult, tokensResult] = await Promise.all([
        api.analyze(walletAddress.trim(), selectedChainId),
        api.tokens(walletAddress.trim(), selectedChainId).catch(() => null),
      ])
      setAnalysis(analysisResult)
      setTokens(tokensResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsSearching(false)
    }
  }

  const handleAnalyze = () => {
    if (walletAddress.trim()) {
      const params = new URLSearchParams({
        address: walletAddress.trim(),
        chain: selectedChainId.toString(),
      })
      router.push(`/dashboard?${params.toString()}`)
    }
  }

  const getFactors = (): FactorData[] => {
    if (!analysis) return []
    
    const factors: FactorData[] = [
      { name: "Transaction History", score: analysis.tx_count > 100 ? 85 : 50, status: analysis.tx_count > 100 ? "good" : "medium" },
      { name: "Token Interactions", score: analysis.token_transfers > 10 ? 65 : 40, status: analysis.token_transfers > 10 ? "medium" : "bad" },
      { name: "Counterparty Risk", score: analysis.counterparty_sanctions?.sanctioned_count ? 30 : 70, status: analysis.counterparty_sanctions?.sanctioned_count ? "bad" : "good" },
      { name: "Network Activity", score: analysis.neighbors_analyzed > 5 ? 80 : 50, status: analysis.neighbors_analyzed > 5 ? "good" : "medium" },
      { name: "Entity Tags", score: analysis.flags.length === 0 ? 90 : 40, status: analysis.flags.length === 0 ? "good" : "bad" },
    ]
    return factors
  }

  const getRecentActivity = () => {
    if (!analysis?.timeline?.length) return []
    return analysis.timeline.slice(-5).reverse().map((t, i) => ({
      type: t.in_count > t.out_count ? "receive" : "transfer",
      token: "ETH",
      amount: formatBalance(t.volume * 1800),
      time: t.date,
    }))
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

      <main className="pt-16 transition-all duration-300" style={{ marginLeft: "16rem" }}>
        <div className="p-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-2xl font-bold text-white">Wallet Scanner</h1>
            <p className="mt-1 text-sm text-gray-500">Analyze any wallet address for risk assessment</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter wallet address (0x...) or ENS name"
                  className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                className="rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white focus:border-white focus:outline-none"
              >
                {CHAINS.filter(c => c.id !== 84532 && c.id !== 11155111).map((chain) => (
                  <option key={chain.id} value={chain.id}>{chain.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isSearching || !walletAddress.trim()}
                className="rounded-lg bg-white px-6 py-3 font-medium text-black transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </span>
                ) : "Scan"}
              </button>
            </form>
          </motion.div>

          <AnimatePresence>
            {hasSearched && isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 className="h-12 w-12 animate-spin text-white" />
                <p className="mt-4 text-lg text-gray-400">Analyzing wallet...</p>
                <p className="text-sm text-gray-600">This may take a few seconds</p>
              </motion.div>
            )}

            {hasSearched && !isSearching && error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 p-6"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-[#FF3B3B]" />
                  <div>
                    <h3 className="font-semibold text-[#FF3B3B]">Analysis Failed</h3>
                    <p className="text-sm text-gray-400">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {hasSearched && !isSearching && analysis && (
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Scanned Wallet</p>
                        <p className="font-mono text-sm text-white">
                          {analysis.ens_name || formatAddress(analysis.address)}
                        </p>
                        {analysis.ens_name && (
                          <p className="font-mono text-xs text-gray-500">{formatAddress(analysis.address)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleAnalyze}
                        className="flex items-center gap-2 rounded-lg bg-[#00FF94] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Analyze in Dashboard
                      </button>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className="font-semibold text-white">{formatBalance(analysis.balance)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Transactions</p>
                        <p className="font-semibold text-white">{analysis.tx_count.toLocaleString()}</p>
                      </div>
                      <a
                        href={`${analysis.chain.explorer}/address/${analysis.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#111111] px-3 py-2 text-sm text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Explorer
                      </a>
                    </div>
                  </div>

                  {analysis.flags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {analysis.flags.slice(0, 5).map((flag, i) => (
                        <span key={i} className="rounded-full bg-[#FF3B3B]/10 px-3 py-1 text-xs text-[#FF3B3B]">
                          {flag}
                        </span>
                      ))}
                      {analysis.flags.length > 5 && (
                        <span className="rounded-full bg-[#FFB800]/10 px-3 py-1 text-xs text-[#FFB800]">
                          +{analysis.flags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-6 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">Risk Report</h2>
                      <span className="ml-auto rounded-full bg-[#1A1A1A] px-2 py-1 text-xs text-gray-400">
                        {analysis.chain.name}
                      </span>
                    </div>

                    <div className="mb-6 flex items-center justify-center">
                      <div className="relative flex h-32 w-32 items-center justify-center">
                        <svg className="h-32 w-32 -rotate-90">
                          <circle cx="64" cy="64" r="56" stroke="#1A1A1A" strokeWidth="8" fill="none" />
                          <circle
                            cx="64" cy="64" r="56"
                            stroke={analysis.risk_score >= 70 ? "#00FF94" : analysis.risk_score >= 40 ? "#FFB800" : "#FF3B3B"}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${(analysis.risk_score / 100) * 352} 352`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <p className={`text-3xl font-bold ${getScoreColor(analysis.risk_score)}`}>{analysis.risk_score}</p>
                          <p className="text-xs text-gray-400">{analysis.risk_label}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {getFactors().map((factor, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{factor.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#1A1A1A]">
                              <div
                                className={`h-full rounded-full ${factor.status === "good" ? "bg-[#00FF94]" : factor.status === "medium" ? "bg-[#FFB800]" : "bg-[#FF3B3B]"}`}
                                style={{ width: `${factor.score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(factor.score)}`}>{factor.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {analysis.sanctions.is_sanctioned && (
                      <div className="mt-4 rounded-lg bg-[#FF3B3B]/10 p-3">
                        <p className="text-sm font-medium text-[#FF3B3B]">⚠️ Sanctioned Address</p>
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-6 flex items-center gap-2">
                      <Coins className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">Token Portfolio</h2>
                      {tokens && (
                        <span className="ml-auto rounded-full bg-[#1A1A1A] px-2 py-1 text-xs text-gray-400">
                          {tokens.tokens.length} tokens
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {tokens?.tokens.slice(0, 5).map((token, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-[#111111] p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                              <span className="text-xs font-bold text-white">{(token.symbol || "??").slice(0, 2)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{token.symbol || "Unknown"}</p>
                              <p className="text-xs text-gray-500">{token.name || "Unknown Token"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-white">${(token.value ?? 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{Number(token.balance || 0).toFixed(4)}</p>
                          </div>
                        </div>
                      ))}
                      {(!tokens || tokens.tokens.length === 0) && (
                        <p className="text-center text-sm text-gray-500">No tokens found</p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-white" />
                        <h2 className="text-lg font-semibold text-white">Network Graph</h2>
                      </div>
                      <div className="flex gap-1">
                        {(["3d", "2d", "timeline"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setGraphMode(mode)}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              graphMode === mode
                                ? "bg-[#00FF94] text-black"
                                : "bg-[#111111] text-gray-400 hover:text-white"
                            }`}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-[280px] w-full">
                      {(analysis.graph?.nodes?.length > 0 || analysis.timeline?.length > 0) ? (
                        <NetworkGraph
                          nodes={analysis.graph?.nodes || []}
                          links={analysis.graph?.links || []}
                          timeline={analysis.timeline}
                          width={350}
                          height={280}
                          mode={analysis.graph?.nodes?.length === 0 && analysis.timeline ? "timeline" : graphMode}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#111111]">
                          <p className="text-xs text-gray-500">No graph data</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">ML Analysis</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">ML Raw Score</span>
                        <span className="font-medium text-white">{analysis.ml_raw_score.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Heuristic Score</span>
                        <span className="font-medium text-white">{analysis.heuristic_score.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Neighbors Analyzed</span>
                        <span className="font-medium text-white">{analysis.neighbors_analyzed}</span>
                      </div>
                      {analysis.trained_model && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">Trained Model</span>
                          <span className="font-medium text-[#00FF94]">Active</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">Advanced</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">GNN Score</span>
                        <span className={`font-medium ${getScoreColor(100 - (analysis.gnn?.gnn_score || 50))}`}>
                          {analysis.gnn?.gnn_score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Temporal Risk</span>
                        <span className={`font-medium ${getScoreColor(100 - (analysis.temporal?.temporal_risk_score || 50))}`}>
                          {analysis.temporal?.temporal_risk_score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">MEV Risk</span>
                        <span className={`font-medium ${getScoreColor(100 - (analysis.mev?.mev_risk_score || 50))}`}>
                          {analysis.mev?.mev_risk_score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Bridge Risk</span>
                        <span className={`font-medium ${getScoreColor(100 - (analysis.bridges?.bridge_risk_score || 50))}`}>
                          {analysis.bridges?.bridge_risk_score?.toFixed(0) || "N/A"}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-white" />
                      <h2 className="text-lg font-semibold text-white">On-Chain</h2>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Internal Txs</span>
                        <span className="font-medium text-white">{analysis.internal_tx_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Token Transfers</span>
                        <span className="font-medium text-white">{analysis.token_transfers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Community Risk</span>
                        <span className={`font-medium ${analysis.community_risk_modifier > 0 ? "text-[#FFB800]" : "text-[#00FF94]"}`}>
                          {analysis.community_risk_modifier > 0 ? `+${analysis.community_risk_modifier}` : "0"}
                        </span>
                      </div>
                      {analysis.on_chain?.ipfs_cid && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-400">IPFS</span>
                          <span className="font-medium text-[#00FF94]">Stored</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Counterparties</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1A1A1A] text-left text-xs text-gray-500">
                          <th className="pb-3 font-medium">Address</th>
                          <th className="pb-3 font-medium">Label</th>
                          <th className="pb-3 font-medium">Transactions</th>
                          <th className="pb-3 font-medium">Volume</th>
                          <th className="pb-3 font-medium">Sent</th>
                          <th className="pb-3 font-medium">Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.top_counterparties.slice(0, 8).map((cp, i) => (
                          <tr key={i} className="border-b border-[#1A1A1A]/50">
                            <td className="py-3 font-mono text-sm text-white">{formatAddress(cp.address)}</td>
                            <td className="py-3 text-sm text-gray-400">{cp.label || "Unknown"}</td>
                            <td className="py-3 text-sm text-white">{cp.tx_count}</td>
                            <td className="py-3 text-sm text-white">{formatBalance(cp.total_value * 1800)}</td>
                            <td className="py-3 text-sm text-[#FF3B3B]">{formatBalance(cp.sent * 1800)}</td>
                            <td className="py-3 text-sm text-[#00FF94]">{formatBalance(cp.received * 1800)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Timeline</h2>
                  </div>

                  <div className="space-y-3">
                    {analysis.timeline.slice(-10).reverse().map((entry, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-[#1A1A1A] pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00FF94]/10">
                            <Activity className="h-4 w-4 text-[#00FF94]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{entry.date}</p>
                            <p className="text-xs text-gray-500">{entry.tx_count} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">{formatBalance(entry.volume * 1800)}</p>
                          <p className="text-xs text-gray-500">In: {entry.in_count} / Out: {entry.out_count}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {!hasSearched && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#0A0A0A]">
                <Search className="h-10 w-10 text-gray-600" />
              </div>
              <p className="text-lg text-gray-400">Enter a wallet address to scan</p>
              <p className="text-sm text-gray-600">Get risk reports and token analysis</p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
