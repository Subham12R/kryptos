"use client"

import { useEffect, useRef } from "react"
import { Chart, ChartConfiguration, registerables } from "chart.js"

Chart.register(...registerables)

interface TransactionFlowChartProps {
  timeline?: Array<{ date: string; tx_count: number; volume: number }>
}

export default function TransactionFlowChart({ timeline = [] }: TransactionFlowChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  const hasData = timeline.length > 0

  useEffect(() => {
    if (!chartRef.current) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    const labels = hasData 
      ? timeline.map(t => t.date.slice(5))
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    const data = hasData 
      ? timeline.map(t => t.volume * 1800 / 1000000)
      : Array(12).fill(0)

    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)")
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)")
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Transaction Volume",
            data,
            borderColor: "#FFFFFF",
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#FFFFFF",
            pointBorderColor: "#000000",
            pointBorderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#CCCCCC",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#0A0A0A",
            borderColor: "#1A1A1A",
            borderWidth: 1,
            titleColor: "#FFFFFF",
            bodyColor: "#888888",
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => `Transaction Flow - ${items[0].label}`,
              label: (item) => `Volume: $${item.raw}M`,
              afterLabel: (item) => `Wallets: ${Math.round(Number(item.raw) * 1250)}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              drawTicks: false,
            },
            ticks: {
              color: "#555555",
              font: {
                size: 11,
              },
              padding: 8,
            },
            border: {
              display: false,
            },
          },
          y: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              drawTicks: false,
            },
            ticks: {
              color: "#555555",
              font: {
                size: 11,
              },
              padding: 8,
              callback: (value) => `$${value}M`,
            },
            border: {
              display: false,
            },
          },
        },
      },
    }

    chartInstanceRef.current = new Chart(ctx, config)

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [])

  const totalVolume = hasData ? timeline.reduce((acc, t) => acc + t.volume * 1800, 0) : 0
  const totalTx = hasData ? timeline.reduce((acc, t) => acc + t.tx_count, 0) : 0
  const avgDaily = hasData && timeline.length > 0 ? totalVolume / timeline.length : 0

  return (
    <div className="flex flex-col rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Transaction Flow Analysis</h3>
        {hasData && (
          <select className="rounded-lg border border-[#1A1A1A] bg-[#1A1A1A] px-3 py-1.5 text-xs text-white">
            <option>Last 12 months</option>
            <option>Last 6 months</option>
            <option>Last 30 days</option>
          </select>
        )}
      </div>

      {hasData ? (
        <>
          <div className="h-[280px]">
            <canvas ref={chartRef} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#1A1A1A] pt-4">
            <div>
              <p className="text-xs text-gray-600">Total Volume</p>
              <p className="text-lg font-bold text-white">${(totalVolume / 1000000).toFixed(1)}M</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Transactions</p>
              <p className="text-lg font-bold text-white">{totalTx.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg. Daily</p>
              <p className="text-lg font-bold text-white">${(avgDaily).toFixed(0)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[280px] flex-col items-center justify-center">
          <p className="text-sm text-gray-500">No transaction data available</p>
          <p className="text-xs text-gray-600">Analyze a wallet to see flow analysis</p>
        </div>
      )}
    </div>
  )
}
