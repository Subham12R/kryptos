"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Wallet, 
  Play, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  Zap,
  RefreshCw,
  X,
  Plus,
  Copy
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWallet } from "@/lib/wallet"
import { useSession } from "@/lib/session"

interface WalletAnalysisResult {
  address: string
  status: "pending" | "analyzing" | "complete" | "error"
  riskScore?: number
  riskLevel?: "low" | "medium" | "high"
  error?: string
  data?: {
    risk_score: number
    risk_level: string
    risk_flags: string[]
    token_count: number
    transaction_count: number
    balance: string
    top_counterparties: Array<{ address: string; risk_score: number }>
  }
}

const MAX_PRO_WALLETS = 5
const CHUNK_SIZE = 3
const CHUNK_DELAY = 1000

type AnalysisMode = "single" | "multi"

export default function BatchAnalysis() {
  const { address: connectedAddress } = useWallet()
  const { user } = useSession()
  
  const [mode, setMode] = useState<AnalysisMode>("single")
  const [walletInput, setWalletInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<WalletAnalysisResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [singleResult, setSingleResult] = useState<WalletAnalysisResult | null>(null)

  const isPro = user?.premium_tier === "pro" || user?.premium_tier === "enterprise"

  const parseWallets = useCallback((input: string): string[] => {
    const cleaned = input
      .replace(/\n/g, ",")
      .split(",")
      .map(w => w.trim().toLowerCase())
      .filter(w => /^0x[a-fA-F0-9]{40}$/.test(w))
    return [...new Set(cleaned)]
  }, [])

  const wallets = parseWallets(walletInput)
  const canAnalyzeMulti = isPro && wallets.length > 0 && wallets.length <= MAX_PRO_WALLETS

  const addConnectedWallet = () => {
    if (connectedAddress && mode === "multi") {
      const current = parseWallets(walletInput)
      if (!current.includes(connectedAddress.toLowerCase())) {
        setWalletInput(prev => prev ? `${prev}, ${connectedAddress.toLowerCase()}` : connectedAddress.toLowerCase())
      }
    }
  }

  const removeWallet = (walletAddress: string) => {
    setWalletInput(prev => {
      const current = parseWallets(prev)
      return current.filter(w => w !== walletAddress).join(", ")
    })
  }

  const analyzeSingleWallet = async (walletAddress: string): Promise<WalletAnalysisResult> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    
    try {
      const response = await fetch(`${API_BASE_URL}/analyze/${walletAddress}?chain_id=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Analysis failed")

      const data = await response.json()

      return {
        address: walletAddress,
        status: "complete",
        riskScore: data.risk_score || 0,
        riskLevel: (data.risk_level?.toLowerCase() || "unknown") as "low" | "medium" | "high",
        data: {
          risk_score: data.risk_score || 0,
          risk_level: data.risk_level || "unknown",
          risk_flags: data.risk_flags || [],
          token_count: data.token_count || 0,
          transaction_count: data.transaction_count || 0,
          balance: data.balance || "0",
          top_counterparties: data.top_counterparties || [],
        },
      }
    } catch (error) {
      return {
        address: walletAddress,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  const startAnalysis = async () => {
    if (mode === "single") {
      const address = walletInput.trim().toLowerCase()
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return

      setIsAnalyzing(true)
      setSingleResult(null)
      
      const result = await analyzeSingleWallet(address)
      setSingleResult(result)
      setIsAnalyzing(false)
    } else {
      if (!canAnalyzeMulti) return

      setIsAnalyzing(true)
      setResults(wallets.map(w => ({ address: w, status: "pending" })))
      setCurrentIndex(0)

      const allResults: WalletAnalysisResult[] = []

      for (let i = 0; i < wallets.length; i += CHUNK_SIZE) {
        setCurrentIndex(i)
        
        const chunk = wallets.slice(i, i + CHUNK_SIZE)
        
        setResults(prev => prev.map(r => 
          chunk.includes(r.address) ? { ...r, status: "analyzing" as const } : r
        ))

        const chunkResults = await Promise.all(chunk.map(analyzeSingleWallet))
        
        setResults(prev => {
          const updated = [...prev]
          chunkResults.forEach(result => {
            const idx = updated.findIndex(r => r.address === result.address)
            if (idx !== -1) updated[idx] = result
          })
          return updated
        })
        
        allResults.push(...chunkResults)

        if (i + CHUNK_SIZE < wallets.length) {
          await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY))
        }
      }

      setIsAnalyzing(false)
    }
  }

  const getRiskColor = (level?: string) => {
    switch (level) {
      case "low": return "text-[#00FF94]"
      case "medium": return "text-[#FFB800]"
      case "high": return "text-[#FF3B3B]"
      default: return "text-[#888]"
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const completedResults = results.filter(r => r.status === "complete" && r.data)
  const avgRiskScore = completedResults.length > 0
    ? Math.round(completedResults.reduce((sum, r) => sum + (r.riskScore || 0), 0) / completedResults.length)
    : 0
  const totalTransactions = completedResults.reduce((sum, r) => sum + (r.data?.transaction_count || 0), 0)

  const isValidSingleAddress = /^0x[a-fA-F0-9]{40}$/.test(walletInput.trim())
  const canAnalyzeSingle = isValidSingleAddress && !isAnalyzing

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">
          Wallet Analyze <span className="text-[#888]">|</span> Multi Wallet Analyse
        </h3>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode("single"); setWalletInput(""); setResults([]); setSingleResult(null); }}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            mode === "single" 
              ? "bg-[#00FF94] text-black" 
              : "bg-[#1A1A1A] text-[#888] hover:text-white"
          )}
        >
          Single Wallet
        </button>
        <button
          onClick={() => { setMode("multi"); setWalletInput(""); setResults([]); setSingleResult(null); }}
          disabled={!isPro}
          className={cn(
            "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            mode === "multi" 
              ? "bg-[#00FF94] text-black" 
              : isPro 
                ? "bg-[#1A1A1A] text-[#888] hover:text-white"
                : "bg-[#1A1A1A] text-[#555] cursor-not-allowed"
          )}
        >
          Multi Wallet {!isPro && "🔒"}
        </button>
      </div>

      {/* Multi Wallet Locked State */}
      {!isPro && mode === "multi" && (
        <div className="rounded-lg bg-[#1A1A1A] p-6 text-center">
          <Zap className="h-8 w-8 text-[#FFB800] mx-auto mb-3" />
          <p className="text-[#888] mb-3">Multi-wallet analysis is available for Pro members</p>
          <button 
            onClick={() => window.location.href = "/pricing"}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFB800] px-4 py-2 text-sm font-medium text-black"
          >
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Area */}
      {(isPro || mode === "single") && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#888]">
                {mode === "multi" ? `Wallet Addresses (${wallets.length}/${MAX_PRO_WALLETS})` : "Wallet Address"}
              </span>
              {mode === "multi" && isPro && (
                <button 
                  onClick={addConnectedWallet}
                  disabled={!connectedAddress || wallets.length >= MAX_PRO_WALLETS}
                  className="flex items-center gap-1 text-xs text-[#00FF94] hover:underline disabled:text-[#555]"
                >
                  <Plus className="h-3 w-3" />
                  Add Connected
                </button>
              )}
            </div>
            
            <textarea
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder={mode === "single" 
                ? "Enter wallet address (0x...)" 
                : "Enter wallet addresses (comma or newline separated)\nExample: 0xABC..., 0xDEF..., 0xGHI..."}
              disabled={isAnalyzing || (mode === "multi" && !isPro)}
              rows={mode === "single" ? 1 : 3}
              className={cn(
                "w-full rounded-lg border bg-[#111] px-3 py-2 text-sm font-mono text-white placeholder-[#555] focus:outline-none",
                mode === "single" 
                  ? isValidSingleAddress 
                    ? "border-[#00FF94]" 
                    : walletInput 
                      ? "border-[#FF3B3B]" 
                      : "border-[#1A1A1A]"
                  : wallets.length > MAX_PRO_WALLETS 
                    ? "border-[#FF3B3B]" 
                    : "border-[#1A1A1A]"
              )}
            />

            {mode === "multi" && wallets.length > MAX_PRO_WALLETS && (
              <p className="text-xs text-[#FF3B3B] mt-1">Maximum {MAX_PRO_WALLETS} wallets allowed</p>
            )}
            
            {mode === "multi" && wallets.length > 0 && wallets.length <= MAX_PRO_WALLETS && (
              <div className="flex flex-wrap gap-2 mt-3">
                {wallets.map((wallet) => (
                  <div key={wallet} className="flex items-center gap-2 rounded-lg border border-[#1A1A1A] bg-[#111] px-3 py-1.5">
                    <span className="font-mono text-sm text-white">{formatAddress(wallet)}</span>
                    <button onClick={() => removeWallet(wallet)} className="text-[#888] hover:text-[#FF3B3B]">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={startAnalysis}
            disabled={isAnalyzing || (mode === "single" ? !canAnalyzeSingle : !canAnalyzeMulti)}
            className="w-full rounded-lg bg-[#00FF94] py-3 font-medium text-black transition-all hover:bg-[#00FF94]/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                {mode === "single" ? "Analyze Wallet" : `Analyze ${wallets.length} Wallet${wallets.length > 1 ? "s" : ""}`}
              </span>
            )}
          </button>
        </>
      )}

      {/* Single Result Display */}
      {singleResult && !isAnalyzing && (
        <div className="mt-6 pt-4 border-t border-[#1A1A1A]">
          {singleResult.status === "complete" && singleResult.data && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg border p-4",
                singleResult.riskLevel === "low" 
                  ? "border-[#00FF94]/30 bg-[#00FF94]/5" 
                  : singleResult.riskLevel === "medium"
                    ? "border-[#FFB800]/30 bg-[#FFB800]/5"
                    : "border-[#FF3B3B]/30 bg-[#FF3B3B]/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-white">{formatAddress(singleResult.address)}</p>
                  <p className="text-xs text-[#888] mt-1">
                    {singleResult.data.transaction_count} transactions • {singleResult.data.token_count} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-3xl font-bold", getRiskColor(singleResult.riskLevel))}>
                    {singleResult.riskScore}
                  </p>
                  <p className={cn("text-xs font-medium", getRiskColor(singleResult.riskLevel))}>
                    {singleResult.riskLevel?.toUpperCase()} RISK
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {singleResult.status === "error" && (
            <div className="rounded-lg border border-[#FF3B3B]/30 bg-[#FF3B3B]/5 p-4">
              <p className="text-[#FF3B3B] text-sm">{singleResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Multi Results */}
      {results.length > 0 && mode === "multi" && (
        <div className="mt-6 pt-4 border-t border-[#1A1A1A] space-y-3">
          <span className="text-sm text-[#888]">Analysis Results</span>
          
          {results.map((result) => (
            <motion.div
              key={result.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3",
                result.status === "complete" 
                  ? result.riskLevel === "low" 
                    ? "border-[#00FF94]/30 bg-[#00FF94]/5" 
                    : result.riskLevel === "medium"
                      ? "border-[#FFB800]/30 bg-[#FFB800]/5"
                      : "border-[#FF3B3B]/30 bg-[#FF3B3B]/5"
                  : "border-[#1A1A1A] bg-[#111]"
              )}
            >
              <div className="flex items-center gap-3">
                {result.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-[#333]" />}
                {result.status === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-[#FFB800]" />}
                {result.status === "complete" && <CheckCircle2 className="h-4 w-4 text-[#00FF94]" />}
                {result.status === "error" && <AlertCircle className="h-4 w-4 text-[#FF3B3B]" />}
                <span className="font-mono text-sm text-white">{formatAddress(result.address)}</span>
              </div>
              {result.status === "complete" && result.riskScore !== undefined && (
                <p className={cn("text-xl font-bold", getRiskColor(result.riskLevel))}>
                  {result.riskScore}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {completedResults.length > 0 && mode === "multi" && !isAnalyzing && (
        <div className="mt-6 pt-4 border-t border-[#1A1A1A]">
          <h4 className="text-sm font-semibold text-white mb-3">Summary</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className={cn("text-xl font-bold", getRiskColor(avgRiskScore >= 70 ? "low" : avgRiskScore >= 40 ? "medium" : "high"))}>
                {avgRiskScore}
              </p>
              <p className="text-xs text-[#888]">Avg Risk</p>
            </div>
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className="text-xl font-bold text-white">{totalTransactions}</p>
              <p className="text-xs text-[#888]">Total Txns</p>
            </div>
            <div className="rounded-lg bg-[#111] p-3 text-center">
              <p className="text-xl font-bold text-white">{completedResults.length}</p>
              <p className="text-xs text-[#888]">Analyzed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
