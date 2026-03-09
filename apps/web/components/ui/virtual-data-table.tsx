'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  width?: number
  sortable?: boolean
}

interface VirtualDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  estimatedRowHeight?: number
}

export function VirtualDataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  estimatedRowHeight = 56,
}: VirtualDataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(columns.map((col) => col.key))
  )
  const [selectedRow, setSelectedRow] = React.useState<T | null>(null)

  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue || '').toLowerCase()
      const bStr = String(bValue || '').toLowerCase()

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
  }, [data, sortColumn, sortDirection])

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  })

  const handleRowClick = (row: T) => {
    setSelectedRow(row)
    if (onRowClick) {
      onRowClick(row)
    }
  }

  const visibleColumnsList = columns.filter((col) => visibleColumns.has(col.key))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {sortedData.length} rows
          </span>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-md border"
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                {visibleColumnsList.map((col, index) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:bg-muted/80 whitespace-nowrap',
                      col.width && `w-[${col.width}px]`
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={{
                      position: 'relative',
                      left: 0,
                      width: col.width ? `${col.width}px` : 'auto',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortColumn === col.key && (
                        <span className="text-primary">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = sortedData[virtualRow.index]
                return (
                  <tr
                    key={virtualRow.index}
                    className={cn(
                      'hover:bg-muted/50 cursor-pointer transition-colors border-b',
                      selectedRow === row && 'bg-muted'
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                    }}
                    onClick={() => handleRowClick(row)}
                  >
                    {visibleColumnsList.map((col) => (
                      <td
                        key={`${virtualRow.index}-${col.key}`}
                        className="px-4 py-3 text-sm"
                        style={{
                          position: 'relative',
                          left: 0,
                          width: col.width ? `${col.width}px` : 'auto',
                        }}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
