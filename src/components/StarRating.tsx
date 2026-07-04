import { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  ariaLabel?: string;
}

export function StarRating({
  value,
  onChange,
  size = 28,
  readOnly = false,
  ariaLabel,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const interactive = !readOnly && !!onChange;

  return (
    <div
      className="star"
      role={interactive ? 'radiogroup' : undefined}
      aria-label={ariaLabel}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i}점`}
          aria-pressed={value === i}
          disabled={readOnly}
          className={`star-cell ${i <= display ? 'filled' : ''}`}
          style={{ fontSize: size, background: 'transparent', border: 0, padding: 0 }}
          onMouseEnter={() => interactive && setHover(i)}
          onClick={() => interactive && onChange?.(i)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function StarStatic({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) {
  return (
    <div className="star-static" aria-label={`${value}점 / 5점 만점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star-cell ${i <= value ? 'filled' : ''}`}
          style={{ fontSize: size, cursor: 'default' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
