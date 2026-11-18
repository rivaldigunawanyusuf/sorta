import { formatIdr } from '../data/catalog';
import { getLevelProgress } from '../data/gamification';
import { useCountUp } from '../hooks/useCountUp';
import type { WakeLockStatus } from '../hooks/useWakeLock';
import type { AppView, AuthSession, CitizenAccount } from '../types/sorta';
import {
  CameraLensIcon,
  DeviceNavIcon,
  HomeNavIcon,
  LedgerNavIcon,
  ProfileNavIcon,
  SortaMark,
  SpeakerIcon,
} from './Icons';

interface TopTelemetryBarProps {
  session: AuthSession;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  isDesktop: boolean;
  wakeLockStatus: WakeLockStatus;
  onToggleWakeLock: () => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  activeCitizen: CitizenAccount;
  citizens: CitizenAccount[];
}

export function TopTelemetryBar({
  session,
  activeView,
  onSelectView,
  isDesktop,
  wakeLockStatus,
  onToggleWakeLock,
  ttsEnabled,
  onToggleTts,
  activeCitizen,
  citizens,
}: TopTelemetryBarProps) {
  const isManager = session.role === 'PENGELOLA';
  const totalCommunityBalanceIdr = citizens.reduce((sum, c) => sum + c.balanceIdr, 0);
  const managedHouseCount = citizens.filter((c) => !c.isCommunityPool).length;
  const animatedBalance = useCountUp(
    isManager ? totalCommunityBalanceIdr : activeCitizen.balanceIdr,
    420,
  );
  const { currentTier } = getLevelProgress(activeCitizen.ecoPoints);

  const wakeLabel =
    wakeLockStatus === 'ACTIVE'
      ? isDesktop
        ? 'Layar Terjaga'
        : 'Layar'
      : wakeLockStatus === 'UNSUPPORTED'
        ? 'Standar'
        : 'Otomatis';

  const ttsLabel = ttsEnabled ? (isDesktop ? 'Suara Aktif' : 'Suara') : isDesktop ? 'Suara Mati' : 'Senyap';

  return (
    <header className="zone-header">
      <div className="zone-header-inner">
        <div className="header-top-row">
          <div className="brand-block">
            <SortaMark className="brand-icon" />
            <span className="brand-wordmark">SORTA</span>
            <span className={`header-role-tag ${isManager ? 'is-pengelola' : 'is-perorangan'}`}>
              {isManager ? 'Pengelola' : activeCitizen.blockCode}
            </span>
          </div>

          {isDesktop && (
            <nav className="primary-nav" aria-label="Menu Utama">
              <button
                type="button"
                className="nav-btn"
                aria-current={activeView === 'home' ? 'page' : undefined}
                onClick={() => onSelectView('home')}
              >
                <HomeNavIcon />
                <span>Home</span>
              </button>
              <button
                type="button"
                className="nav-btn"
                aria-current={activeView === 'ledger' ? 'page' : undefined}
                onClick={() => onSelectView('ledger')}
              >
                <LedgerNavIcon />
                <span>Bank Sampah</span>
              </button>
              <button
                type="button"
                className="nav-btn nav-btn-camera"
                aria-current={activeView === 'camera' ? 'page' : undefined}
                onClick={() => onSelectView('camera')}
              >
                <CameraLensIcon />
                <span>Kamera</span>
              </button>
              <button
                type="button"
                className="nav-btn"
                aria-current={activeView === 'devices' ? 'page' : undefined}
                onClick={() => onSelectView('devices')}
              >
                <DeviceNavIcon />
                <span>Perangkat</span>
              </button>
              <button
                type="button"
                className="nav-btn"
                aria-current={activeView === 'profile' ? 'page' : undefined}
                onClick={() => onSelectView('profile')}
              >
                <ProfileNavIcon />
                <span>Profil</span>
              </button>
            </nav>
          )}

          <div className="header-right-cluster">
            {isDesktop && (
              <button
                type="button"
                className="header-account-pill"
                onClick={() => onSelectView('profile')}
                title="Lihat Profil & Akun"
              >
                <span className="header-account-name">
                  {isManager ? session.operatorName : activeCitizen.name}
                </span>
                <span className="citizen-level-chip tabular-nums">
                  {isManager ? `${managedHouseCount} Rumah` : `Lv.${currentTier.level}`}
                </span>
                <strong className="balance-amount tabular-nums">
                  {formatIdr(animatedBalance)}
                </strong>
              </button>
            )}

            <div className="header-utility-pills" role="group" aria-label="Status Layar dan Suara">
              <button
                type="button"
                className={`status-pill ${wakeLockStatus === 'ACTIVE' ? 'is-live' : ''}`}
                aria-pressed={wakeLockStatus === 'ACTIVE'}
                aria-label={`Status layar: ${wakeLabel}`}
                disabled={wakeLockStatus === 'UNSUPPORTED'}
                onClick={onToggleWakeLock}
              >
                <span className="status-dot" aria-hidden="true" />
                <span>{wakeLabel}</span>
              </button>

              <button
                type="button"
                className={`status-pill tts-toggle-pill ${ttsEnabled ? 'is-live' : ''}`}
                aria-pressed={ttsEnabled}
                aria-label={`Panduan suara: ${ttsEnabled ? 'Aktif' : 'Mati'}`}
                onClick={onToggleTts}
              >
                <SpeakerIcon muted={!ttsEnabled} />
                <span>{ttsLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
