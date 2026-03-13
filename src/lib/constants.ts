export const COLORS = {
  bg: {
    primary: "#05010A",
    card: "#0B0215",
    secondary: "#120A1F",
  },
  accent: {
    primary: "#7C3AED",
    secondary: "#A855F7",
    glow: "#8B5CF6",
  },
  status: {
    positive: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  text: {
    primary: "#E5E7EB",
    secondary: "#9CA3AF",
    muted: "#6B7280",
  },
  border: {
    default: "#1F1A2E",
    hover: "#2D2640",
  },
} as const

export const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "wallet-scanner", label: "Wallet Scanner", icon: "Search" },
  { id: "token-scanner", label: "Token Scanner", icon: "Coins" },
  { id: "culture-circle", label: "Culture Circle", icon: "Users" },
  { id: "geopolitical", label: "Geopolitical Wallets", icon: "Globe" },
  { id: "risk-reports", label: "Risk Reports", icon: "FileWarning" },
  { id: "community", label: "Community Intelligence", icon: "MessageSquare" },
  { id: "leaderboard", label: "Leaderboard", icon: "Trophy" },
  { id: "pricing", label: "Pricing", icon: "CreditCard" },
  { id: "settings", label: "Settings", icon: "Settings" },
] as const

export const NETWORKS = ["ETH", "BTC", "SOL"] as const

export type Network = (typeof NETWORKS)[number]
