"use client"

import { useRef, useCallback, useState } from "react"
import dynamic from "next/dynamic"

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
})

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
})

export interface NetworkNode {
  id: string
  group: string
  val: number
  label?: string | null
}

export interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  value: number
  type: string
}

export interface TimelineEntry {
  date: string
  tx_count: number
  volume: number
  in_count: number
  out_count: number
}

interface NetworkGraphProps {
  nodes: NetworkNode[]
  links: NetworkLink[]
  timeline?: TimelineEntry[]
  width?: number
  height?: number
  mode?: "3d" | "2d" | "globe" | "timeline"
}

const getGroupColor = (group: string): string => {
  const colors: Record<string, string> = {
    suspect: "#FF3B3B",
    scam: "#FF3B3B",
    high_risk: "#FF6B6B",
    medium_risk: "#FFB800",
    low_risk: "#00FF94",
    safe: "#00FF94",
    exchange: "#00BFFF",
    defi: "#9B59B6",
    nft: "#E91E63",
    bridge: "#FF9800",
    mixer: "#FF5722",
    notable: "#00FF94",
    neighbor: "#888888",
    unknown: "#666666",
  }
  return colors[group?.toLowerCase() || ""] || "#666666"
}

export default function NetworkGraph({ 
  nodes, 
  links, 
  timeline,
  width = 800, 
  height = 500,
  mode = "3d" 
}: NetworkGraphProps) {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node)
  }, [])

  const hasNodes = nodes && nodes.length > 0
  const hasTimeline = timeline && timeline.length > 0

  if (!hasNodes && !hasTimeline) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#0A0A0A]">
        <p className="text-sm text-gray-500">No graph data available</p>
      </div>
    )
  }

  const graphNodes = nodes.map(n => ({
    ...n,
    group: n.group || "unknown",
    val: n.val || 5,
  }))

  const graphLinks = links.map(l => ({
    ...l,
    source: typeof l.source === "string" ? l.source : l.source.id,
    target: typeof l.target === "string" ? l.target : l.target.id,
  }))

  if (mode === "globe" || mode === "3d") {
    const centerNode = graphNodes.find(n => n.val >= 15) || graphNodes[0]
    const positionedNodes = graphNodes.map((n, i) => {
      if (n.id === centerNode?.id) {
        return { ...n, fx: 0, fy: 0, fz: 0 }
      }
      const angle = (i / Math.max(graphNodes.length - 1, 1)) * Math.PI * 2
      const radius = 80 + Math.random() * 40
      return {
        ...n,
        fx: Math.cos(angle) * radius,
        fy: Math.sin(angle) * radius * 0.6,
        fz: (Math.random() - 0.5) * 60,
      }
    })

    return (
      <div className="h-full w-full rounded-lg bg-[#0A0A0A] overflow-hidden">
        <ForceGraph3D
          graphData={{ nodes: positionedNodes, links: graphLinks }}
          width={width}
          height={height}
          backgroundColor="#0A0A0A"
          nodeThreeObject={(node: any) => {
            const groupColor = getGroupColor(node.group)
            const THREE = (window as any).THREE
            const size = node.val ? Math.max(3, node.val * 1.5) : 4
            const geometry = new THREE.SphereGeometry(size)
            const material = new THREE.MeshStandardMaterial({ 
              color: groupColor,
              emissive: groupColor,
              emissiveIntensity: 0.4,
              metalness: 0.6,
              roughness: 0.3,
            })
            return new THREE.Mesh(geometry, material)
          }}
          nodeColor={(node: any) => getGroupColor(node.group)}
          linkColor={() => "#444444"}
          linkWidth={1.5}
          onNodeClick={handleNodeClick}
          cooldownTicks={200}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.15}
          numDimensions={3}
        />
      </div>
    )
  }

  if (mode === "2d") {
    const centerNode = graphNodes.find(n => n.val >= 15) || graphNodes[0]
    const positionedNodes = graphNodes.map((n, i) => {
      if (n.id === centerNode?.id) {
        return { ...n, fx: width / 2, fy: height / 2 }
      }
      const layer = Math.ceil(i / 8)
      const angleInLayer = ((i - 1) % 8) / 8 * Math.PI * 2
      const radius = 60 + layer * 50
      const angle = angleInLayer + (layer * 0.3)
      return {
        ...n,
        fx: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        fy: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
      }
    })

    return (
      <div className="h-full w-full rounded-lg bg-[#0A0A0A] overflow-hidden">
        <ForceGraph2D
          graphData={{ nodes: positionedNodes, links: graphLinks }}
          width={width}
          height={height}
          backgroundColor="#0A0A0A"
          nodeColor={(node: any) => getGroupColor(node.group)}
          nodeRelSize={4}
          nodeVal={2}
          nodeLabel={(node: any) => `${node.label || node.id.slice(0, 8)}...`}
          linkColor={() => "#444444"}
          linkWidth={1.5}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          cooldownTicks={150}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.2}
        />
      </div>
    )
  }

  const centerNode = graphNodes.find(n => n.val >= 15) || graphNodes[0]
  const positionedNodes = graphNodes.map((n, i) => {
    if (n.id === centerNode?.id) {
      return { ...n, fx: 0, fy: 0, fz: 0 }
    }
    const angle = ((i - 1) / Math.max(graphNodes.length - 1, 1)) * Math.PI * 2
    const radius = 80 + Math.random() * 50
    return {
      ...n,
      fx: Math.cos(angle) * radius,
      fy: Math.sin(angle) * radius * 0.7,
      fz: (Math.random() - 0.5) * 50,
    }
  })

  return (
    <div className="h-full w-full rounded-lg bg-[#0A0A0A] overflow-hidden">
      <ForceGraph3D
        graphData={{ nodes: positionedNodes, links: graphLinks }}
        width={width}
        height={height}
        backgroundColor="#0A0A0A"
        nodeThreeObject={(node: any) => {
          const groupColor = getGroupColor(node.group)
          const size = node.val ? Math.max(4, node.val * 1.8) : 5
          const THREE = (window as any).THREE
          
          if (node.group === "suspect" || node.group === "scam") {
            const geometry = new THREE.OctahedronGeometry(size)
            const material = new THREE.MeshStandardMaterial({ 
              color: groupColor,
              emissive: groupColor,
              emissiveIntensity: 0.6,
              wireframe: true,
            })
            return new THREE.Mesh(geometry, material)
          }
          
          if (node.group === "exchange" || node.group === "defi") {
            const geometry = new THREE.BoxGeometry(size, size, size)
            const material = new THREE.MeshStandardMaterial({ 
              color: groupColor,
              emissive: groupColor,
              emissiveIntensity: 0.4,
              metalness: 0.8,
              roughness: 0.2,
            })
            return new THREE.Mesh(geometry, material)
          }
          
          const geometry = new THREE.SphereGeometry(size)
          const material = new THREE.MeshStandardMaterial({ 
            color: groupColor,
            emissive: groupColor,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.4,
          })
          return new THREE.Mesh(geometry, material)
        }}
        nodeColor={(node: any) => getGroupColor(node.group)}
        linkColor={(link: any) => link.type === "in" ? "#00FF94" : "#FF3B3B"}
        linkWidth={2}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        onNodeClick={handleNodeClick}
        cooldownTicks={200}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.15}
        numDimensions={3}
      />
    </div>
  )
}
