"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Search,
  Coins,
  Users,
  Globe,
  FileWarning,
  MessageSquare,
  Trophy,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SIDEBAR_ITEMS } from "@/lib/constants"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Search,
  Coins,
  Users,
  Globe,
  FileWarning,
  MessageSquare,
  Trophy,
  CreditCard,
  Settings,
}

interface SidebarProps {
  activeItem: string
  onItemClick: (id: string) => void
}

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-[#1F1A2E] bg-[#05010A] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-[#1F1A2E] px-4">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7]">
                <span className="text-sm font-bold text-white">K</span>
              </div>
              <span className="text-lg font-bold text-[#E5E7EB]">KRYPTOS</span>
            </motion.div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#1F1A2E] hover:text-[#E5E7EB]"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              const isActive = activeItem === item.id

              return (
                <li key={item.id}>
                  <button
                    onClick={() => onItemClick(item.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-[#7C3AED]/20 text-[#A855F7]"
                        : "text-[#9CA3AF] hover:bg-[#1F1A2E] hover:text-[#E5E7EB]"
                    )}
                  >
                    {Icon && (
                      <span className={cn(
                        "relative flex-shrink-0",
                        isActive && "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                      )}>
                        <Icon className={cn("h-5 w-5", isActive && "text-[#A855F7]")} />
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-glow"
                            className="absolute -inset-1 rounded-lg bg-[#7C3AED]/30 blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </span>
                    )}
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-[#1F1A2E] p-4">
          <div className={cn(
            "rounded-lg bg-gradient-to-r from-[#7C3AED]/20 to-[#A855F7]/20 p-3",
            collapsed && "p-2"
          )}>
            {!collapsed && (
              <p className="text-xs font-medium text-[#E5E7EB]">Pro Plan</p>
            )}
            {!collapsed && (
              <p className="mt-1 text-xs text-[#9CA3AF]">Unlimited scans</p>
            )}
            {collapsed && (
              <CreditCard className="h-5 w-5 text-[#A855F7]" />
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
