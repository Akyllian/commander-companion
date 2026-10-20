import type React from 'react'
import { DecksIcon, LifeIcon, MoreIcon, OpenBookIcon } from '../components/icons'
import { SECTION_LABELS, SECTIONS, sectionHref } from './sections'
import type { Section } from './sections'

const ICONS: Record<Section, () => React.JSX.Element> = {
  partita: LifeIcon,
  mazzi: DecksIcon,
  impara: OpenBookIcon,
  altro: MoreIcon,
}

export type SectionNavState = 'persistent' | 'revealed' | 'hidden'

interface SectionNavProps {
  id: string
  section: Section
  /** Persistent outside the game; during play hidden until the rhombus reveals it. */
  state: SectionNavState
  onNavigate: (next: Section) => void
  /** Choosing Partita while already playing just hides the revealed bar. */
  onRequestClose: () => void
}

/** Top-level navigation (R1): a plain `nav` with `aria-current`, not a tab list. */
export function SectionNav({ id, section, state, onNavigate, onRequestClose }: SectionNavProps) {
  const hidden = state === 'hidden'
  return (
    <nav id={id} className="section-nav" data-state={state} aria-label="Sezioni" hidden={hidden} inert={hidden}>
      <ul className="section-nav__list">
        {SECTIONS.map((item) => {
          const Icon = ICONS[item]
          return (
            <li key={item}>
              <a
                className="section-nav__item"
                href={sectionHref(item)}
                aria-current={item === section ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  if (item === section && state === 'revealed') onRequestClose()
                  else onNavigate(item)
                }}
              >
                <Icon />
                <span>{SECTION_LABELS[item]}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
