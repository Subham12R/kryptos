export interface Wallet {
  id: string
  address: string
  ensName?: string
  network: "ETH" | "BTC" | "SOL"
  balance: number
  balanceUsd: number
  riskScore: number
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  label: string
  firstSeen: number
  lastSeen: number
}

export interface Transaction {
  id: string
  hash: string
  timestamp: number
  from: string
  to: string
  value: number
  valueUsd: number
  token: string
  status: "success" | "failed"
  gasUsed: number
  network: "ETH" | "BTC" | "SOL"
}

export interface Counterparty {
  address: string
  transactionCount: number
  totalValue: number
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  riskScore: number
}

export interface RiskFlag {
  id: string
  type: "OFAC" | "Rapid Fire" | "Sanctioned Counterparty" | "High Risk Destination" | "Mixer Usage" | "Rapid Fire Transactions"
  severity: "low" | "medium" | "high" | "critical"
  description: string
}

export interface WalletSummary {
  address: string
  ensName?: string
  balance: number
  balanceUsd: number
  riskScore: number
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  flags: RiskFlag[]
  tags: string[]
}

export interface GlobeData {
  from: { lat: number; lng: number; country: string }
  to: { lat: number; lng: number; country: string }
  value: number
}

export interface MetricData {
  label: string
  value: number
  change: number
  icon: string
  sparklineData: number[]
}

export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}
