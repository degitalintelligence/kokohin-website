'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { createPortal } from 'react-dom'

export type SearchDropdownOption = {
  value: string
  label: string
  group?: string
  keywords?: string
}

type SearchDropdownProps = {
  options: SearchDropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  name?: string
  required?: boolean
}

const normalize = (text: string) => text.toLowerCase().trim()

export default function SearchDropdown({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Cari...',
  emptyText = 'Data tidak ditemukan',
  disabled = false,
  name,
  required = false,
}: SearchDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })
  const selected = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = normalize(search)
    if (!q) return options
    return options.filter((opt) => {
      const haystack = normalize(`${opt.label} ${opt.group ?? ''} ${opt.keywords ?? ''}`)
      return haystack.includes(q)
    })
  }, [options, search])

  const grouped = useMemo(() => {
    const map = new Map<string, SearchDropdownOption[]>()
    for (const option of filtered) {
      const key = option.group || '__ungrouped__'
      const current = map.get(key) ?? []
      current.push(option)
      map.set(key, current)
    }
    return Array.from(map.entries())
  }, [filtered])

  useEffect(() => {
    if (!open) return
    const updatePanelPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPanelStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    updatePanelPosition()
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return
      const target = event.target as Node
      const clickedInsideRoot = rootRef.current.contains(target)
      const clickedInsidePanel = panelRef.current?.contains(target) ?? false
      if (!clickedInsideRoot && !clickedInsidePanel) setOpen(false)
    }
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-[120]' : ''}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {name && required ? (
        <input
          value={value}
          onChange={() => undefined}
          required
          tabIndex={-1}
          aria-hidden
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
        />
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-11 px-4 border rounded-lg bg-white text-left text-sm flex items-center justify-between gap-3 ${
          disabled ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'hover:border-gray-400'
        }`}
      >
        <span className={selected ? 'text-gray-800 truncate' : 'text-gray-400 truncate'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-auto py-1">
            {grouped.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>
            ) : (
              grouped.map(([groupName, items]) => (
                <div key={groupName}>
                  {groupName !== '__ungrouped__' ? (
                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                      {groupName}
                    </p>
                  ) : null}
                  {items.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                        setSearch('')
                      }}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        option.value === value
                          ? 'bg-[#E30613]/10 text-[#E30613] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  )
}
