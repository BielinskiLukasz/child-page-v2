import type { ComponentType, SVGProps } from 'react';
import type { ActivityCategory } from '../data/activities';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: '0 0 48 48',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  focusable: 'false' as const,
  ...props,
});

/** Friendly hand-drawn mascot used in the brand lockup. */
export function MascotIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="14" cy="15" r="6.5" fill="#c99a74" stroke="#a97a55" strokeWidth="2" />
      <circle cx="34" cy="15" r="6.5" fill="#c99a74" stroke="#a97a55" strokeWidth="2" />
      <circle cx="14" cy="15" r="2.8" fill="#e8c4a2" />
      <circle cx="34" cy="15" r="2.8" fill="#e8c4a2" />
      <circle cx="24" cy="26" r="15" fill="#d9b99b" stroke="#b9906c" strokeWidth="2" />
      <ellipse cx="24" cy="30" rx="7" ry="5.5" fill="#f0d8c4" />
      <circle cx="18.5" cy="23" r="1.8" fill="#5b5675" />
      <circle cx="29.5" cy="23" r="1.8" fill="#5b5675" />
      <ellipse cx="24" cy="28.5" rx="2.4" ry="1.8" fill="#6b5a73" />
      <path d="M21 33q3 2.5 6 0" stroke="#8a6a6a" strokeWidth="1.7" />
      <circle cx="13.5" cy="29" r="2.2" fill="#f2a9be" opacity=".65" />
      <circle cx="34.5" cy="29" r="2.2" fill="#f2a9be" opacity=".65" />
    </svg>
  );
}

export function NatureIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="37" cy="12" r="5" fill="#ffe08a" />
      <path d="M24 42V26" stroke="#7fbf8f" strokeWidth="3" />
      <path d="M24 35q-8 1-10-6 8 0 10 6z" fill="#a9dcb4" stroke="#7fbf8f" strokeWidth="1.8" />
      <path d="M24 31q8 1 10-6-8 0-10 6z" fill="#a9dcb4" stroke="#7fbf8f" strokeWidth="1.8" />
      <g fill="#f7a8c9" stroke="#e58fb4" strokeWidth="1.4">
        <circle cx="24" cy="11" r="5" />
        <circle cx="16" cy="18" r="5" />
        <circle cx="32" cy="18" r="5" />
        <circle cx="19" cy="26" r="5" />
        <circle cx="29" cy="26" r="5" />
      </g>
      <circle cx="24" cy="19" r="4.6" fill="#ffe9a8" />
    </svg>
  );
}

export function AnimalsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <g fill="#d2a67f" stroke="#b1845f" strokeWidth="1.8">
        <ellipse cx="13" cy="16" rx="4.2" ry="5.5" transform="rotate(-18 13 16)" />
        <ellipse cx="22" cy="11" rx="4.2" ry="5.5" transform="rotate(-6 22 11)" />
        <ellipse cx="31" cy="12" rx="4.2" ry="5.5" transform="rotate(10 31 12)" />
        <ellipse cx="38" cy="19" rx="4.2" ry="5.5" transform="rotate(24 38 19)" />
        <path d="M24 24c-8 0-13 6-13 11 0 5 5 7 13 7s13-2 13-7c0-5-5-11-13-11z" />
      </g>
      <circle cx="16" cy="39" r="2.4" fill="#f7b7cf" opacity=".8" />
      <circle cx="32" cy="39" r="2.4" fill="#f7b7cf" opacity=".8" />
    </svg>
  );
}

export function VehiclesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="38" cy="11" r="4.5" fill="#ffe08a" />
      <path d="M7 31h30a4 4 0 0 0 4-4V17a4 4 0 0 0-4-4H13a6 6 0 0 0-6 6z" fill="#ffd98a" stroke="#d9a860" strokeWidth="2" />
      <rect x="12" y="17" width="9" height="9" rx="2" fill="#dff1fb" />
      <rect x="24" y="17" width="9" height="9" rx="2" fill="#dff1fb" />
      <rect x="36" y="17" width="5" height="9" rx="2" fill="#a8d8f0" />
      <path d="M7 31h34" stroke="#d9a860" strokeWidth="2" />
      <circle cx="16" cy="36" r="4.5" fill="#6b6585" stroke="#4a4560" strokeWidth="1.5" />
      <circle cx="34" cy="36" r="4.5" fill="#6b6585" stroke="#4a4560" strokeWidth="1.5" />
      <circle cx="16" cy="36" r="1.6" fill="#e6e2f2" />
      <circle cx="34" cy="36" r="1.6" fill="#e6e2f2" />
      <path d="M12 9q3-4 6 0" stroke="#c9c1e6" strokeWidth="2" />
    </svg>
  );
}

export function CreativeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M24 7c-9 0-16 7-16 15 0 7 5 10 9 10 2 0 3-2 2-4-1-2 0-4 2-4h4c4 0 7-3 7-7 0-6-3-10-8-10z"
        fill="#f6e6d5"
        stroke="#c9a98a"
        strokeWidth="2"
      />
      <circle cx="16" cy="17" r="2.6" fill="#f7a8c9" />
      <circle cx="22" cy="13" r="2.6" fill="#a8d8f0" />
      <circle cx="29" cy="14" r="2.6" fill="#ffd98a" />
      <circle cx="14" cy="25" r="2.6" fill="#b9e3c0" />
      <path d="M34 26l9 12-3 2-3-2-6 4-2-3 5-4-2-3z" fill="#c9b8f2" stroke="#9b87cf" strokeWidth="1.8" />
      <circle cx="40" cy="9" r="2" fill="#ffe08a" />
    </svg>
  );
}

export function LearningIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="16" cy="16" r="8" fill="#f7a8c9" stroke="#df8fb5" strokeWidth="1.8" />
      <rect x="26" y="8" width="15" height="15" rx="3" fill="#a8d8f0" stroke="#83b9db" strokeWidth="1.8" />
      <path d="M16 27l9 15H7z" fill="#ffd98a" stroke="#e0b75c" strokeWidth="1.8" />
      <path d="M33 28l3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z" fill="#c9b8f2" stroke="#a58edb" strokeWidth="1.5" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="18" cy="18" rx="9" ry="11" fill="#f7a8c9" stroke="#df8fb5" strokeWidth="1.8" />
      <path d="M18 29q-2 4 0 7t-2 6" stroke="#8a84a8" strokeWidth="1.8" />
      <ellipse cx="33" cy="22" rx="7" ry="9" fill="#a8d8f0" stroke="#83b9db" strokeWidth="1.8" />
      <path d="M33 31q-1 3 0 6" stroke="#8a84a8" strokeWidth="1.8" />
      <circle cx="12" cy="13" r="2.4" fill="#fff" opacity=".75" />
      <circle cx="30" cy="18" r="2" fill="#fff" opacity=".75" />
      <path d="M40 9l1.4 3.6L45 14l-3.6 1.4L40 19l-1.4-3.6L35 14l3.6-1.4z" fill="#ffe08a" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 4l4.2 13.8L42 22l-13.8 4.2L24 40l-4.2-13.8L6 22l13.8-4.2z" fill="currentColor" />
      <circle cx="39" cy="9" r="2.4" fill="currentColor" opacity=".7" />
      <circle cx="9" cy="38" r="1.8" fill="currentColor" opacity=".6" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="24" cy="24" r="9" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="3">
        <path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.5 10.5l3.5 3.5M34 34l3.5 3.5M37.5 10.5L34 14M14 34l-3.5 3.5" />
      </g>
    </svg>
  );
}

export function SunsetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 34a16 16 0 0 1 32 0z" fill="currentColor" opacity=".85" />
      <path d="M4 34h40M9 40h30" stroke="currentColor" strokeWidth="3" />
      <circle cx="36" cy="12" r="4" fill="currentColor" opacity=".55" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" fill="currentColor" />
      <path d="M37 10l1.4 3.6L42 15l-3.6 1.4L37 20l-1.4-3.6L32 15l3.6-1.4z" fill="currentColor" opacity=".7" />
    </svg>
  );
}

export function AllIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 34a19 19 0 0 1 38 0" fill="none" stroke="#f7a8c9" strokeWidth="5" />
      <path d="M10 34a14 14 0 0 1 28 0" fill="none" stroke="#ffd98a" strokeWidth="5" />
      <path d="M15 34a9 9 0 0 1 18 0" fill="none" stroke="#a9dcb4" strokeWidth="5" />
      <circle cx="9" cy="14" r="3" fill="#c9b8f2" />
      <circle cx="39" cy="14" r="2.4" fill="#a8d8f0" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M24 5l5.6 11.8 13 1.8-9.4 9.1 2.3 12.9L24 34.4l-11.5 6.2 2.3-12.9-9.4-9.1 13-1.8z"
        fill="#ffd98a"
        stroke="#e8b84f"
        strokeWidth="2"
      />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<ActivityCategory, ComponentType<IconProps>> = {
  przyroda: NatureIcon,
  zwierzeta: AnimalsIcon,
  pojazdy: VehiclesIcon,
  kreatywne: CreativeIcon,
  nauka: LearningIcon,
  zabawa: PlayIcon,
};
