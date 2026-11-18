import type { MaterialSilhouette } from '../types/sorta';

interface IconProps {
  className?: string;
}

export function SortaMark({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="12" width="3.5" height="7" fill="#10B981" />
      <rect x="10.25" y="9" width="3.5" height="10" fill="#F59E0B" />
      <rect x="15.5" y="12" width="3.5" height="7" fill="#F43F5E" />
      <path d="M8 6H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function CameraLensIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="4.75" width="1.5" height="1.5" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon({ muted, className }: IconProps & { muted: boolean }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 6H5.5L9.5 3V13L5.5 10H2.5V6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
      {muted ? (
        <path d="M11.5 6L14.5 10M14.5 6L11.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      ) : (
        <path d="M11.5 5.5C12.7 6.8 12.7 9.2 11.5 10.5M13.5 4C15.5 6.2 15.5 9.8 13.5 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      )}
    </svg>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 12.5H14M4 12.5V9.5H12V12.5M8 9.5V5.5M5 5.5H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      <circle cx="8" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function QrCodeIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9.5" y="2" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 9.5H11.5V11.5H9.5V9.5ZM12.5 12.5H14V14H12.5V12.5ZM10 13.5H11.5M13.5 9.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

export function DownArrowKinetic({ className }: IconProps) {
  return (
    <svg className={className} width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path
        d="M22 6V36M22 36L10 24M22 36L34 24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function KioskNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 6V2.5H6M12 2.5H15.5V6M15.5 12V15.5H12M6 15.5H2.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LedgerNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7H12.5M5.5 10H10.5M5.5 12.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

export function DiagnosticsNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 9H5.5L7.5 4.5L10.5 13.5L12.5 9H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function UploadPhotoIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 10.5V2.5M8 2.5L4.75 5.75M8 2.5L11.25 5.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 10.5V12.5C2.5 13.05 2.95 13.5 3.5 13.5H12.5C13.05 13.5 13.5 13.05 13.5 12.5V10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 2.5H11V6.5C11 8.16 9.66 9.5 8 9.5C6.34 9.5 5 8.16 5 6.5V2.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 3.5H3V5.5C3 6.5 3.8 7.3 4.8 7.4M11 3.5H13V5.5C13 6.5 12.2 7.3 11.2 7.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 9.5V12.5M5.5 13.5H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function StreakBoltIcon({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9 1.5L3.5 9H8L7 14.5L12.5 7H8L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function UserPlusIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 13.5C2 11.2 4 9.5 6.5 9.5C9 9.5 11 11.2 11 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 5V9M11 7H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CheckBadgeIcon({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 8.2L7.2 9.9L10.8 6.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 7.75L9 2.5L15.5 7.75V14.5C15.5 15.05 15.05 15.5 14.5 15.5H3.5C2.95 15.5 2.5 15.05 2.5 14.5V7.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 15.5V10.5H11V15.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function DeviceNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="3.5" width="12" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 15H11.5M9 12.5V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileNavIcon({ className }: IconProps) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 15.5C3.5 12.6 5.95 10.5 9 10.5C12.05 10.5 14.5 12.6 14.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UsersGroupIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5.2" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 13.2C2 11 3.7 9.5 6 9.5C8.3 9.5 10 11 10 13.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="11.2" cy="5.8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11.5 9.8C13.2 10.1 14.3 11.3 14.3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldRoleIcon({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.8L13.2 3.8V7.6C13.2 10.8 11 13.1 8 14.2C5 13.1 2.8 10.8 2.8 7.6V3.8L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.8 8L7.3 9.5L10.4 6.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SampleSilhouette({
  silhouette,
  className,
}: {
  silhouette: MaterialSilhouette;
  className?: string;
}) {
  switch (silhouette) {
    case 'pet':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9.5 2.5H14.5V5L16.5 7.5V20.5H7.5V7.5L9.5 5V2.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.5 11.5H16.5M7.5 15.5H16.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'can':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6.5" y="4" width="11" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.5 7.5H17.5M6.5 16.5H17.5M10.5 2.5H13.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'cardboard':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3.5 7.5L12 3.5L20.5 7.5V17.5L12 21L3.5 17.5V7.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 7.5L12 11.5L20.5 7.5M12 11.5V21" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'hdpe':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10 3H14V6L17.5 8.5V20.5H6.5V8.5L10 6V3Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 9.5H16V14.5H14" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'organic':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18.5 5.5C11.5 5.5 6 10.5 6 17.5C13 17.5 18.5 12.5 18.5 5.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 18.5L13.5 10.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'residue':
      return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 4H19L17.5 20H6.5L5 4Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}
