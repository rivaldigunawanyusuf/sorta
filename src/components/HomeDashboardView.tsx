import { formatIdr } from '../data/catalog';
import {
  COMMUNITY_DIVERSION_TARGET_KG,
  getCitizenDailyMissions,
  getLevelProgress,
  getLocalDateKey,
} from '../data/gamification';
import type {
  AppView,
  AuthSession,
  BinPosition,
  BinState,
  CitizenAccount,
  TransactionRecord,
} from '../types/sorta';
import {
  CameraLensIcon,
  CheckBadgeIcon,
  StreakBoltIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersGroupIcon,
} from './Icons';

interface HomeDashboardViewProps {
  session: AuthSession;
  citizens: CitizenAccount[];
  activeCitizen: CitizenAccount;
  bins: Record<BinPosition, BinState>;
  transactions: TransactionRecord[];
  onNavigateView: (view: AppView) => void;
  onStartAccumulateCamera: () => void;
  onOpenRegisterCitizen: () => void;
}

const BIN_ORDER: BinPosition[] = ['LEFT', 'CENTER', 'RIGHT'];

export function HomeDashboardView({
  session,
  citizens,
  activeCitizen,
  bins,
  transactions,
  onNavigateView,
  onStartAccumulateCamera,
  onOpenRegisterCitizen,
}: HomeDashboardViewProps) {
  const isManager = session.role === 'PENGELOLA';
  const todayKey = getLocalDateKey();

  const totalSortedWeightKg =
    bins.LEFT.totalWeightKg + bins.CENTER.totalWeightKg + bins.RIGHT.totalWeightKg;
  const divertedKg = bins.LEFT.totalWeightKg + bins.CENTER.totalWeightKg;
  const communityGoalPct = Math.min(
    100,
    Math.round((divertedKg / COMMUNITY_DIVERSION_TARGET_KG) * 100),
  );

  const nonMandiriHouses = citizens.filter(
    (c) => !c.isCommunityPool && c.sortingMode === 'KELOLAAN_POS',
  );
  const mandiriHouses = citizens.filter(
    (c) => !c.isCommunityPool && c.sortingMode === 'MANDIRI',
  );
  const totalBalanceAll = citizens.reduce((sum, c) => sum + c.balanceIdr, 0);

  const levelInfo = getLevelProgress(activeCitizen.ecoPoints);
  const dailyMissions = getCitizenDailyMissions(activeCitizen, transactions, todayKey);
  const recentTx = isManager
    ? transactions.slice(0, 3)
    : transactions.filter((t) => t.citizenId === activeCitizen.id).slice(0, 3);

  return (
    <div className="home-view">
      {/* One UI Viewing Area Header */}
      <header className="oneui-page-header">
        <span className={`role-pill ${isManager ? 'is-pengelola' : 'is-perorangan'}`}>
          {isManager
            ? `Pengelola · ${session.areaName}`
            : `Akun Rumah · ${activeCitizen.blockCode}`}
        </span>
        <h1>
          {isManager ? `Halo, ${session.operatorName}` : `Halo, ${activeCitizen.name}`}
        </h1>
        <p>
          {isManager
            ? 'Kelola akumulasi sampah beberapa rumah sekaligus dan pantau kapasitas 3 tong.'
            : 'Pantau tabungan pilah rumah Anda, selesaikan misi harian, dan naikkan level.'}
        </p>
      </header>

      {/* Primary Hero Summary Card */}
      <section className="oneui-card home-hero-card" aria-label="Ringkasan Akun">
        {isManager ? (
          <>
            <div className="home-hero-top">
              <div>
                <span className="section-kicker">Total Akumulasi Komunitas</span>
                <div className="home-big-stat tabular-nums">
                  <strong>{totalSortedWeightKg.toFixed(2)} kg</strong>
                  <span className="home-stat-sub">
                    Total Saldo {formatIdr(totalBalanceAll)}
                  </span>
                </div>
              </div>
              <div className="home-hero-actions">
                <button type="button" className="btn-commit" onClick={onStartAccumulateCamera}>
                  <UsersGroupIcon />
                  <span>Akumulasi &amp; Pindai</span>
                </button>
                <button type="button" className="btn-secondary" onClick={onOpenRegisterCitizen}>
                  <UserPlusIcon />
                  <span>Tambah Rumah</span>
                </button>
              </div>
            </div>

            <div className="home-role-metrics-grid tabular-nums">
              <div className="home-mini-metric">
                <span>Rumah Kelolaan Pos</span>
                <strong>{nonMandiriHouses.length} rumah</strong>
              </div>
              <div className="home-mini-metric">
                <span>Rumah Pilah Mandiri</span>
                <strong>{mandiriHouses.length} rumah</strong>
              </div>
              <div className="home-mini-metric">
                <span>Target Komunitas ({COMMUNITY_DIVERSION_TARGET_KG} kg)</span>
                <strong>{communityGoalPct}%</strong>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="home-hero-top">
              <div>
                <span className="section-kicker">Saldo Tabungan Rumah</span>
                <div className="home-big-stat tabular-nums">
                  <strong className="accent-emerald">
                    {formatIdr(activeCitizen.balanceIdr)}
                  </strong>
                  <span className="home-stat-sub">
                    {activeCitizen.totalWeightKg.toFixed(2)} kg terpilah ({activeCitizen.itemsSorted}{' '}
                    item)
                  </span>
                </div>
              </div>
              <div className="home-hero-actions">
                <button
                  type="button"
                  className="btn-commit"
                  onClick={() => onNavigateView('camera')}
                >
                  <CameraLensIcon />
                  <span>Pindai Sampah</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onNavigateView('ledger')}
                >
                  <span>Bank Sampah</span>
                </button>
              </div>
            </div>

            <div className="home-gamify-bar">
              <div className="gamify-header">
                <div className="gamify-tier-title">
                  <span className="section-kicker">
                    <TrophyIcon /> Lv. {levelInfo.currentTier.level} ·{' '}
                    {levelInfo.currentTier.title}
                  </span>
                </div>
                <span className="streak-badge tabular-nums">
                  <StreakBoltIcon /> {activeCitizen.streakDays} Hari Streak
                </span>
              </div>
              <div className="xp-bar-block">
                <div className="xp-bar-meta tabular-nums">
                  <strong>{activeCitizen.ecoPoints} Poin Hijau</strong>
                  <span>
                    {levelInfo.nextTier
                      ? `${levelInfo.pointsToNext} poin lagi ke ${levelInfo.nextTier.title}`
                      : 'Level Tertinggi'}
                  </span>
                </div>
                <div className="xp-progress-track" aria-hidden="true">
                  <div
                    className="xp-progress-fill"
                    style={{ width: `${levelInfo.progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3 Physical Bins Overview */}
      <section className="oneui-card" aria-labelledby="home-bins-heading">
        <div className="oneui-card-head">
          <div>
            <span className="section-kicker">Status Kiosk Fisik</span>
            <h2 id="home-bins-heading">Kapasitas 3 Tong Sampah</h2>
          </div>
          <button
            type="button"
            className="text-action-btn"
            onClick={() => onNavigateView('camera')}
          >
            Buka Kamera
          </button>
        </div>

        <div className="home-bins-grid">
          {BIN_ORDER.map((pos) => {
            const bin = bins[pos];
            const fillPct = Math.min(100, Math.round((bin.totalWeightKg / bin.capacityKg) * 100));
            const colorClass =
              pos === 'LEFT' ? 'bin-emerald' : pos === 'CENTER' ? 'bin-amber' : 'bin-crimson';
            const title =
              pos === 'LEFT'
                ? 'Organik'
                : pos === 'CENTER'
                  ? 'Anorganik Bernilai'
                  : 'Residu';

            return (
              <div key={pos} className={`home-bin-tile ${colorClass}`}>
                <div className="home-bin-row">
                  <strong>{title}</strong>
                  <span className="tabular-nums">{fillPct}%</span>
                </div>
                <div className="home-bin-weight tabular-nums">
                  <span>{bin.totalWeightKg.toFixed(2)} kg</span>
                  <span>{bin.itemCount} item</span>
                </div>
                <div className="bin-capacity-track" aria-hidden="true">
                  <div className="bin-capacity-fill" style={{ width: `${fillPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-column Bottom Split: Daily Missions + Recent Activity */}
      <div className="home-split-grid">
        <section className="oneui-card" aria-labelledby="home-missions-heading">
          <div className="oneui-card-head">
            <div>
              <span className="section-kicker">Gamifikasi Harian</span>
              <h2 id="home-missions-heading">
                Misi {isManager ? 'Pos & Komunitas' : 'Rumah Hari Ini'}
              </h2>
            </div>
          </div>

          <div className="mission-list">
            {dailyMissions.map((mission) => (
              <div
                key={mission.id}
                className={`mission-row ${mission.completed ? 'is-completed' : ''}`}
              >
                <div className="mission-info">
                  <CheckBadgeIcon className="mission-check-icon" />
                  <span className="mission-title">{mission.title}</span>
                </div>
                <div className="mission-meta tabular-nums">
                  <span className="mission-counter">
                    {mission.current}/{mission.target}
                  </span>
                  <span className="mission-reward">+{mission.rewardPoints}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="oneui-card" aria-labelledby="home-recent-heading">
          <div className="oneui-card-head">
            <div>
              <span className="section-kicker">Aktivitas Terkini</span>
              <h2 id="home-recent-heading">Setoran Terbaru</h2>
            </div>
            <button
              type="button"
              className="text-action-btn"
              onClick={() => onNavigateView('ledger')}
            >
              Semua Riwayat
            </button>
          </div>

          {recentTx.length === 0 ? (
            <div className="empty-state-box">
              <strong>Belum ada setoran tercatat.</strong>
              <p>Tekan tab Kamera di tengah untuk memindai sampah atau mencatat setoran.</p>
            </div>
          ) : (
            <ul className="home-activity-list">
              {recentTx.map((tx) => (
                <li key={tx.id} className="home-activity-item">
                  <div>
                    <strong>{tx.itemName}</strong>
                    <span>
                      {tx.citizenName} · {tx.weightGrams} g
                      {tx.batchHouseCount && tx.batchHouseCount > 1
                        ? ` (Akumulasi ${tx.batchHouseCount} rumah)`
                        : ''}
                    </span>
                  </div>
                  <div className="tx-earned-cell tabular-nums">
                    <strong className="balance-cell-value">+{formatIdr(tx.payoutIdr)}</strong>
                    <span>+{tx.pointsEarned} Poin</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
