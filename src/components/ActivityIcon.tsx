import { ACTIVITY_ICONS } from '../data/activityIcons';

interface Props {
  id: string;
  className?: string;
  fallback?: string;
}

/** Rounded tile showing the original hand-drawn SVG icon of an activity. */
export default function ActivityIcon({ id, className = 'h-14 w-14', fallback = '🧸' }: Props) {
  const icon = ACTIVITY_ICONS[id];
  if (!icon) {
    return (
      <span
        className={`grid place-items-center rounded-2xl bg-[#f3eefb] text-2xl ${className}`}
        aria-hidden="true"
      >
        {fallback}
      </span>
    );
  }
  return (
    <span
      className={`activity-icon block shrink-0 overflow-hidden rounded-[22%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_6px_14px_-8px_rgba(91,70,130,0.45)] ${className}`}
      style={{ backgroundColor: icon.bg }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}
