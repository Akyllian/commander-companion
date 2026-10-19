import { Fragment } from 'react'
import { RULE_GROUPS, RULE_ITEMS, RULES_DISCLAIMER, RULES_INTRODUCTION } from '../content/rules'
import type { RuleTextPart } from '../content/rules'
import { FAN_CONTENT_NOTICE } from '../content/legal'
import { ModalSideSheet } from './ModalSideSheet'

interface RulesDialogProps {
  open: boolean
  onClose: () => void
}

function RuleText({ part }: { part: RuleTextPart }) {
  const content = part.accessibleLabel ? (
    <span className="mana-cost" role="img" aria-label={part.accessibleLabel}>
      {part.text}
    </span>
  ) : (
    part.text
  )
  return part.emphasis ? <strong>{content}</strong> : <>{content}</>
}

/**
 * Quick rules reference (Phase 2a): one scrollable document in the shared side sheet.
 * Presentation only — opening or closing it never touches the game or its history.
 */
export function RulesDialog({ open, onClose }: RulesDialogProps) {
  return (
    <ModalSideSheet open={open} title="Regole Commander" className="rules-sheet" onClose={onClose}>
      {/* Decorative arcane band (no artwork behind body copy); scenic strips await original art. */}
      <div className="rules-band" aria-hidden="true" />
      <p className="rules-intro">{RULES_INTRODUCTION}</p>
      {RULE_GROUPS.map((group) => (
        <section key={group.id} className="rules-group" aria-labelledby={`rules-${group.id}`}>
          <h3 id={`rules-${group.id}`}>{group.title}</h3>
          {RULE_ITEMS.filter((item) => item.group === group.id).map((item) => (
            <article key={item.id} className="rule-item" aria-labelledby={`rule-${item.id}`}>
              {/* Scanning aid for table discussions: a muted column, never a badge. */}
              <span className="rule-id">{item.id}</span>
              <div className="rule-content">
                <h4 id={`rule-${item.id}`}>{item.title}</h4>
                {item.status === 'not-tracked' && <p className="rule-status">Non tracciata dall’app</p>}
                <p>
                  {item.body.map((part, index) => (
                    <Fragment key={index}>
                      <RuleText part={part} />
                    </Fragment>
                  ))}
                </p>
                <p className="rule-reference">{item.references.join(', ')}</p>
              </div>
            </article>
          ))}
        </section>
      ))}
      <p className="rules-footer">{RULES_DISCLAIMER}</p>
      {/* Also here because the app footer is hidden in compact landscape (D-025). */}
      <p className="fan-content-notice" lang="en">
        {FAN_CONTENT_NOTICE}
      </p>
    </ModalSideSheet>
  )
}
