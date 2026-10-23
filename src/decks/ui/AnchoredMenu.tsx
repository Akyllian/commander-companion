import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type React from 'react'
import { createPortal } from 'react-dom'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

interface AnchoredMenuProps {
  label: string
  /** The button that opened the menu: the menu hangs from it and focus returns to it. */
  trigger: React.RefObject<HTMLElement | null>
  items: MenuItem[]
  onClose: () => void
}

const MENU_WIDTH = 224
const GAP = 4
const MARGIN = 8

/**
 * A small action menu in a portal on <body> (R3 review), so no clipped ancestor can cut it.
 * It hangs below its trigger, right-aligned, and flips above or shifts sideways to stay in the
 * viewport. Focus starts on the first item; arrows move it; Escape, a tap outside or choosing an
 * item close the menu and give focus back to the trigger; Tab and Shift+Tab close it and carry on
 * from the trigger's place in the page.
 */
export function AnchoredMenu({ label, trigger, items, onClose }: AnchoredMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect()
      if (!anchor) return
      const height = menuRef.current?.offsetHeight ?? 0
      const left = Math.min(Math.max(anchor.right - MENU_WIDTH, MARGIN), window.innerWidth - MARGIN - MENU_WIDTH)
      const below = anchor.bottom + GAP
      const top = below + height > window.innerHeight - MARGIN ? Math.max(MARGIN, anchor.top - GAP - height) : below
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [trigger])

  // Focus waits for the first placement: a hidden menu cannot take focus in a browser.
  const placed = position !== null
  useEffect(() => {
    if (placed) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [placed])

  const close = () => {
    onClose()
    trigger.current?.focus()
  }
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || trigger.current?.contains(target)) return
      closeRef.current()
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [trigger])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const index = entries.indexOf(document.activeElement as HTMLElement)
    const next: Record<string, number> = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: entries.length - 1 }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      // Tab and Shift+Tab close the menu and are not prevented: focus sits on the trigger only as
      // the starting point, so the browser's own move lands on the control after or before it.
      close()
    } else if (event.key in next) {
      event.preventDefault()
      entries[(next[event.key] + entries.length) % entries.length]?.focus()
    }
  }

  return createPortal(
    <ul
      ref={menuRef}
      className="anchored-menu"
      role="menu"
      aria-label={label}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, width: MENU_WIDTH, visibility: position ? undefined : 'hidden' }}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <li key={item.label} role="none" className={item.danger ? 'anchored-menu__danger' : undefined}>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={item.danger ? 'quiet-danger' : undefined}
            onClick={() => {
              // Focus goes back to the trigger first: an inline action leaves it there, and a
              // surface it opens remembers the trigger as the place to return focus on close.
              trigger.current?.focus()
              onClose()
              item.onSelect()
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>,
    document.body,
  )
}
