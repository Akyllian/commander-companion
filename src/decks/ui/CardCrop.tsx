import { useArtImage } from '../../media/useCommanderArt'

/**
 * A cached art crop, or the neutral arcane texture (R3 §6.1, §10.3). Two ids split 50/50 on the
 * approved diagonal (D-031). Decorative: the card or deck is named in text next to it.
 */
export function CardCrop({ cardIds, className = '' }: { cardIds: [string | null, (string | null)?]; className?: string }) {
  const first = useArtImage(cardIds[0])
  const second = useArtImage(cardIds[1] ?? null)
  const split = Boolean(first && second)
  return (
    <span className={`card-crop ${className}`} aria-hidden="true" data-split={split || undefined} data-empty={first ? undefined : ''}>
      {split ? (
        <>
          <span className="card-crop__half card-crop__half--1">
            <img src={first?.url} alt="" decoding="async" />
          </span>
          <span className="card-crop__half card-crop__half--2">
            <img src={second?.url} alt="" decoding="async" />
          </span>
        </>
      ) : (
        first && <img key={first.url} src={first.url} alt="" decoding="async" />
      )}
    </span>
  )
}
