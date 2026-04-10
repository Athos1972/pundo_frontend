// Only imports from src/components/ui/ allowed (Clean Boundary)
// Server Component — no interactivity needed for tree display

import Link from 'next/link'
import type { SysAdminCategory } from '@/types/system-admin'

interface CategoryTreeViewProps {
  categories: SysAdminCategory[]
  editLabel: string
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
        // Parent not in list (outside page) — show as root
        roots.push(node)
      }
    }
  }

  return roots
}

function TreeNode({ node, depth, editLabel }: { node: TreeNode; depth: number; editLabel: string }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded px-2"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.child_count > 0 && (
          <span className="text-gray-400 text-xs">▸</span>
        )}
        <span className="text-sm text-gray-800 flex-1">{node.name}</span>
        <span className="text-xs text-gray-400">L{node.level}</span>
        <Link
          href={`/admin/categories/${node.id}/edit`}
          className="text-xs text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
        >
          {editLabel}
        </Link>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} editLabel={editLabel} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function CategoryTreeView({ categories, editLabel }: CategoryTreeViewProps) {
  const roots = buildTree(categories)

  if (roots.length === 0) {
    return <p className="text-sm text-gray-500">No categories.</p>
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <ul className="py-1">
        {roots.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} editLabel={editLabel} />
        ))}
      </ul>
    </div>
  )
}
