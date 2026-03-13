"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Shield, AlertTriangle, FileText, ExternalLink, Filter, Loader2, XCircle, Calendar, Eye, TrendingUp, Users, MessageSquare } from "lucide-react"
import Sidebar from "@/components/dashboard/sidebar"
import Header from "@/components/dashboard/header"
import { api } from "@/lib/api"
import type { SharedReportMeta, CommunityReport } from "@/types"

function formatAddress(addr: string): string {
  if (!addr) return ""
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return dateStr
  }
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

function getRiskLabel(score: number): string {
  if (score >= 70) return "Low"
  if (score >= 40) return "Medium"
  return "High"
}

interface RiskReportData {
  id: string
  address: string
  label?: string
  category?: string
  riskScore: number
  riskLevel: string
  lastActivity: string
  totalTransactions: number
  volume: string
  flags: string[]
  isShared?: boolean
  views?: number
  createdAt?: string
}

export default function RiskReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedRisk, setSelectedRisk] = useState("all")
  const [selectedNetwork, setSelectedNetwork] = useState("ETH")
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"shared" | "community">("shared")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharedReports, setSharedReports] = useState<SharedReportMeta[]>([])
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([])
  const [flaggedAddresses, setFlaggedAddresses] = useState<Array<{ address: string; report_count: number; categories: string[] }>>([])

  const loadSharedReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const reports = await api.communityRecent(20)
      setCommunityReports(reports.reports || [])
    } catch (err) {
      console.error("Failed to load community reports:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadFlaggedAddresses = useCallback(async () => {
    try {
      const result = await api.communityFlagged(2)
      setFlaggedAddresses(result.addresses || [])
    } catch (err) {
      console.error("Failed to load flagged addresses:", err)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadSharedReports()
    loadFlaggedAddresses()
  }, [loadSharedReports, loadFlaggedAddresses])

  const filteredReports = flaggedAddresses.map((addr, i) => ({
      id: `flagged-${i}`,
      address: addr.address,
      label: addr.categories[0] || "Flagged",
      category: "flagged",
      riskScore: Math.max(10, 70 - addr.report_count * 10),
      riskLevel: addr.report_count > 5 ? "Critical" : "High",
      lastActivity: `${addr.report_count} reports`,
      totalTransactions: 0,
      volume: "Unknown",
      flags: addr.categories,
    })).filter((report) => {
    const matchesSearch = 
      report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.label?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesCategory = selectedCategory === "all" || report.category === selectedCategory
    const matchesRisk = selectedRisk === "all" ||
      (selectedRisk === "high" && report.riskScore < 40) ||
      (selectedRisk === "medium" && report.riskScore >= 40 && report.riskScore < 70) ||
      (selectedRisk === "low" && report.riskScore >= 70)
    return matchesSearch && matchesCategory && matchesRisk
  })

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
            <h1 className="text-2xl font-bold text-white">Risk Reports</h1>
            <p className="mt-1 text-sm text-gray-500">View and analyze risk assessments for tracked wallets</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex gap-2"
          >
            <button
              onClick={() => setActiveTab("shared")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "shared"
                  ? "bg-white text-black"
                  : "bg-[#0A0A0A] text-gray-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Known Wallets
              </span>
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "community"
                  ? "bg-white text-black"
                  : "bg-[#0A0A0A] text-gray-400 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Community Reports
              </span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col gap-4 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by address or label..."
                className="w-full rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white focus:border-white focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="exchange">Exchange</option>
                <option value="defi">DeFi</option>
                <option value="stablecoin">Stablecoin</option>
                <option value="bridge">Bridge</option>
                <option value="notable">Notable</option>
                <option value="flagged">Flagged</option>
              </select>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] px-4 py-3 text-white focus:border-white focus:outline-none"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk (70+)</option>
                <option value="medium">Medium Risk (40-69)</option>
                <option value="high">High Risk (&lt;40)</option>
              </select>
            </div>
          </motion.div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}

          {!isLoading && activeTab === "shared" && (
            <div className="grid gap-4">
              <AnimatePresence>
                {filteredReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${getRiskBg(report.riskScore)}`}>
                          <Shield className={`h-7 w-7 ${getRiskColor(report.riskScore)}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{report.label}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRiskBg(report.riskScore)} ${getRiskColor(report.riskScore)}`}>
                              {report.riskLevel}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-sm text-gray-400">
                            {formatAddress(report.address)}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span className="capitalize">{report.category}</span>
                            <span>•</span>
                            <span>{report.lastActivity}</span>
                            {report.totalTransactions > 0 && (
                              <>
                                <span>•</span>
                                <span>{report.totalTransactions.toLocaleString()} txns</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{report.volume}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {report.flags.length > 0 && (
                          <div className="flex gap-2">
                            {report.flags.slice(0, 3).map((flag, i) => (
                              <span key={i} className="rounded-full bg-[#FF3B3B]/10 px-2 py-1 text-xs text-[#FF3B3B]">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${getRiskBg(report.riskScore)}`}>
                          <span className={`text-lg font-bold ${getRiskColor(report.riskScore)}`}>
                            {report.riskScore}
                          </span>
                        </div>
                        <button className="rounded-lg border border-[#1A1A1A] bg-[#111111] p-3 text-gray-400 hover:text-white">
                          <FileText className="h-5 w-5" />
                        </button>
                        <button className="rounded-lg border border-[#1A1A1A] bg-[#111111] p-3 text-gray-400 hover:text-white">
                          <ExternalLink className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!isLoading && activeTab === "community" && (
            <div className="grid gap-4">
              {communityReports.length === 0 && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <MessageSquare className="h-16 w-16 text-gray-600" />
                  <p className="mt-4 text-lg text-gray-400">No community reports yet</p>
                  <p className="text-sm text-gray-600">Be the first to submit a report</p>
                </motion.div>
              )}
              <AnimatePresence>
                {communityReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-[#FFB800]" />
                          <span className="rounded-full bg-[#FFB800]/10 px-2 py-0.5 text-xs font-medium text-[#FFB800]">
                            {report.category}
                          </span>
                        </div>
                        <p className="mt-2 font-mono text-sm text-white">
                          {formatAddress(report.address)}
                        </p>
                        {report.description && (
                          <p className="mt-2 text-sm text-gray-400">{report.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(report.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {report.votes} votes
                          </span>
                          {report.reporter_id && report.reporter_id !== "anonymous" && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {report.reporter_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-[#00FF94]/30 bg-[#00FF94]/10 px-3 py-2 text-sm text-[#00FF94] hover:bg-[#00FF94]/20">
                          +{report.votes}
                        </button>
                        <button className="rounded-lg border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 px-3 py-2 text-sm text-[#FF3B3B] hover:bg-[#FF3B3B]/20">
                          Report
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {filteredReports.length === 0 && !isLoading && activeTab === "shared" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Shield className="h-16 w-16 text-gray-600" />
              <p className="mt-4 text-lg text-gray-400">No risk reports found</p>
              <p className="text-sm text-gray-600">Try adjusting your filters</p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
