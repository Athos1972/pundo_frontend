'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState } from 'react'
import Link from 'next/link'
import type { SysAdminCategory } from '@/types/system-admin'

interface CategoryTreeViewProps {
  categories: SysAdminCategory[]
  editLabel: string
  expandAllLabel?: string
  collapseAllLabel?: string
}

interface TreeNode extends SysAdminCategory {
  children: TreeNode[]
}

function buildTree(categories: SysAdminCategory[]): TreeNode[] {
  const byId = new Map<number, TreeNode>()
  const roots: TreeNode[] = []

  for (const cat of categories) {
    byId.set(cat.id, { ...cat, children: [] })
  }

  for (const node of byId.values()) {
    if (node.parent_id == null) {
      roots.push(node)
    } else {
      const parent = byId.get(node.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  }

  // Sort by name/external_id at each level
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => (a.name ?? a.external_id).localeCompare(b.name ?? b.external_id))
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)

  return roots
}

function getAllIds(nodes: TreeNode[]): Set<number> {
  const ids = new Set<number>()
  function collect(n: TreeNode) {
    if (n.children.length > 0) {
      ids.add(n.id)
      n.children.forEach(collect)
    }
  }
  nodes.forEach(collect)
  return ids
}

interface TreeNodeProps {
  node: TreeNode
  depth: number
  editLabel: string
  expanded: Set<number>
  onToggle: (id: number) => void
}

function TreeNodeRow({ node, depth, editLabel, expanded, onToggle }: TreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.id)

  return (
    <li>
      <div
        className="flex items-start gap-1 py-1.5 hover:bg-gray-50 rounded px-2 group"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={`shrink-0 w-4 text-center text-xs mt-0.5 transition-transform
            ${hasChildren ? 'text-gray-400 hover:text-gray-700 cursor-pointer' : 'invisible'}`}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-900 font-medium">{node.name ?? node.external_id}</span>
          <span className="ml-2 text-xs text-gray-400 font-mono">{node.external_id}</span>
          {node.taxonomy_type && (
            <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {node.taxonomy_type}
            </span>
          )}
          {node.level && (
            <span className="ml-1 text-xs text-gray-300">L{node.level}</span>
          )}
        </div>

        {/* Edit link */}
        <Link
          href={`/admin/categories/${node.id}/edit`}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity underline-offset-2 hover:underline ml-2"
        >
          {editLabel}
        </Link>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              editLabel={editLabel}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function CategoryTreeView({
  categories,
  editLabel,
  expandAllLabel = 'Expand all',
  collapseAllLabel = 'Collapse all',
}: CategoryTreeViewProps) {
  const roots = buildTree(categories)
  const allIds = getAllIds(roots)

  // Default: top-level nodes expanded
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const s = new Set<number>()
    roots.forEach((r) => { if (r.children.length > 0) s.add(r.id) })
    return s
  })

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (roots.length === 0) {
    return <p className="text-sm text-gray-500">No categories.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Expand/Collapse controls */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setExpanded(new Set(allIds))}
          className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
        >
          {expandAllLabel}
        </button>
        <span className="text-gray-300 text-xs">|</span>
        <button
          type="button"
          onClick={() => setExpanded(new Set())}
          className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
        >
          {collapseAllLabel}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <ul className="py-1">
          {roots.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              editLabel={editLabel}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
