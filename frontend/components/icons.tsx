import type { ReactNode } from "react";

type IconProps = {
  size?: number;
};

function IconFrame({ size = 18, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function CheckIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <path
        d="M5 12.5 9.2 17 19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function PlusIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </IconFrame>
  );
}

export function ClipboardIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <rect x="7" y="6.5" width="10" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9 6.5V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9.5 12h5M9.5 15.2h3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

export function CheckCircleIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.6 12.2 11 14.6 15.5 9.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}

export function ProgressIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    </IconFrame>
  );
}

export function BoltIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <path d="M13 2.5 5.8 13.2H12L10.6 21.5 18.4 10.2H12.2L13 2.5Z" fill="currentColor" />
    </IconFrame>
  );
}

export function CalendarIcon({ size = 14 }: IconProps) {
  return (
    <IconFrame size={size}>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.5v3.2M16 3.5v3.2M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

export function KebabIcon({ size = 18 }: IconProps) {
  return (
    <IconFrame size={size}>
      <circle cx="12" cy="6" r="1.45" fill="currentColor" />
      <circle cx="12" cy="12" r="1.45" fill="currentColor" />
      <circle cx="12" cy="18" r="1.45" fill="currentColor" />
    </IconFrame>
  );
}

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <IconFrame size={size}>
      <path
        d="M4 20h4L18.5 9.5 14.5 5.5 4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="m13.2 6.8 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <IconFrame size={size}>
      <path d="M5 7.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9 7.4V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2v2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m7.5 7.5.8 12.2A1.2 1.2 0 0 0 9.5 21h5a1.2 1.2 0 0 0 1.2-1.3l.8-12.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </IconFrame>
  );
}
