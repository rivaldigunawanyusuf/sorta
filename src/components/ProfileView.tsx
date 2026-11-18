import { useEffect, useState } from 'react';
import { formatIdr } from '../data/catalog';
import { BADGE_DEFINITIONS, getLevelProgress } from '../data/gamification';
import type { AuthSession, CitizenAccount, HouseSortingMode } from '../types/sorta';
import {
  CheckBadgeIcon,
  QrCodeIcon,
  ShieldRoleIcon,
  StreakBoltIcon,
  UserPlusIcon,
} from './Icons';

interface ProfileViewProps {
  session: AuthSession;
  citizens: CitizenAccount[];
  activeCitizen: CitizenAccount;
  onUpdateCitizenProfile: (id: string, name: string, blockCode: string) => void;
  onToggleHouseSortingMode: (id: string, mode: HouseSortingMode) => void;
  onSelectActiveCitizen: (id: string) => void;
  onOpenRegisterCitizen: () => void;
  onSwitchRoleTo: (role: AuthSession['role']) => void;
  onLogout: () => void;
}

export function ProfileView({
  session,
  citizens,
  activeCitizen,
  onUpdateCitizenProfile,
  onToggleHouseSortingMode,
  onSelectActiveCitizen,
  onOpenRegisterCitizen,
  onSwitchRoleTo,
  onLogout,
}: ProfileViewProps) {
  const isManager = session.role === 'PENGELOLA';
  const [editName, setEditName] = useState(activeCitizen.name);
  const [editBlock, setEditBlock] = useState(activeCitizen.blockCode);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [houseSearch, setHouseSearch] = useState('');

  useEffect(() => {
    setEditName(activeCitizen.name);
    setEditBlock(activeCitizen.blockCode);
    setSavedToast(null);
  }, [activeCitizen.id, activeCitizen.name, activeCitizen.blockCode]);

  const { currentTier } = getLevelProgress(activeCitizen.ecoPoints);
  const unlockedSet = new Set(activeCitizen.badges);
  const houseAccounts = citizens.filter((c) => !c.isCommunityPool);
  const filteredHouseAccounts = houseAccounts.filter((h) => {
    const q = houseSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      h.blockCode.toLowerCase().includes(q) ||
      h.qrCode.toLowerCase().includes(q)
    );
  });
  const managedOnlyCount = houseAccounts.filter((h) => h.sortingMode === 'KELOLAAN_POS').length;
  const totalManagedBalance = citizens.reduce((sum, c) => sum + c.balanceIdr, 0);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim().length < 2 || editBlock.trim().length < 2) return;
    onUpdateCitizenProfile(activeCitizen.id, editName.trim(), editBlock.trim());
    setSavedToast('Profil akun berhasil diperbarui.');
  };

  return (
    <div className="profile-view">
      <header className="oneui-page-header">
        <span className={`role-pill ${isManager ? 'is-pengelola' : 'is-perorangan'}`}>
          {isManager ? 'Mode Pengelola Pos' : 'Mode Perorangan (Rumah)'}
        </span>
        <h1>Profil &amp; Pengaturan Akun</h1>
        <p>
          {isManager
            ? 'Kelola daftar rumah non-mandiri, ubah status pemilahan tiap rumah, atau beralih akun.'
            : 'Lihat kartu QR rumah, pencapaian lencana, atau beralih ke mode Pengelola.'}
        </p>
      </header>

      {/* Active Account Identity Card */}
      <section className="oneui-card profile-identity-card" aria-label="Identitas Akun Aktif">
        <div className="profile-avatar-row">
          <div className="profile-squircle-avatar" aria-hidden="true">
            {(isManager ? session.operatorName : activeCitizen.name).slice(0, 2).toUpperCase()}
          </div>
          <div className="profile-id-meta">
            <h2>{isManager ? session.operatorName : activeCitizen.name}</h2>
            <p>
              {isManager
                ? `@${session.username} · ${session.areaName}`
                : `@${session.username} · ${activeCitizen.blockCode} · ${activeCitizen.qrCode}`}
            </p>
            <div className="profile-chip-row tabular-nums">
              {isManager ? (
                <>
                  <span className="hud-points-pill">
                    {houseAccounts.length} Rumah Terdaftar
                  </span>
                  <span className="profile-balance-tag">
                    {managedOnlyCount} Non-Mandiri
                  </span>
                  <span className="profile-balance-tag">
                    Kas {formatIdr(totalManagedBalance)}
                  </span>
                </>
              ) : (
                <>
                  <span className="hud-points-pill">
                    Lv.{currentTier.level} {currentTier.title}
                  </span>
                  <span className="streak-badge">
                    <StreakBoltIcon /> {activeCitizen.streakDays} Hari
                  </span>
                  <span className="profile-balance-tag">
                    {formatIdr(activeCitizen.balanceIdr)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-role-switcher">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onSwitchRoleTo(isManager ? 'PERORANGAN' : 'PENGELOLA')}
          >
            <ShieldRoleIcon />
            <span>
              {isManager ? 'Beralih ke Mode Perorangan' : 'Masuk sebagai Pengelola'}
            </span>
          </button>
          <button type="button" className="btn-secondary" onClick={onLogout}>
            Ganti Akun / Keluar
          </button>
        </div>
      </section>

      {isManager ? (
        /* Pengelola Section: Household Sorting Mode Manager */
        <section className="oneui-card" aria-labelledby="manage-houses-heading">
          <div className="oneui-card-head">
            <div>
              <span className="section-kicker">Manajemen Akumulasi Rumah</span>
              <h2 id="manage-houses-heading">Daftar Rumah Warga ({houseAccounts.length})</h2>
            </div>
            <button type="button" className="btn-commit" onClick={onOpenRegisterCitizen}>
              <UserPlusIcon />
              <span>Tambah Rumah</span>
            </button>
          </div>

          <p className="field-hint">
            Tandai rumah sebagai <strong>Kelolaan Pengelola</strong> jika penghuni belum memilah
            mandiri sehingga setoran dapat diakumulasikan sekaligus di menu Kamera.
          </p>

          {houseAccounts.length > 0 && (
            <div className="profile-house-search-wrap">
              <label htmlFor="profile-house-search" className="visually-hidden">
                Cari daftar rumah warga
              </label>
              <input
                id="profile-house-search"
                type="text"
                className="ledger-search-input"
                value={houseSearch}
                onChange={(e) => setHouseSearch(e.target.value)}
                placeholder="Cari rumah atau blok..."
              />
            </div>
          )}

          {filteredHouseAccounts.length === 0 ? (
            <div className="empty-state-box">
              <strong>
                {houseAccounts.length === 0
                  ? 'Belum ada rumah warga terdaftar.'
                  : 'Rumah tidak ditemukan.'}
              </strong>
              <p>
                {houseAccounts.length === 0
                  ? 'Tambahkan rumah warga agar Pengelola dapat mengakumulasi sampah beberapa rumah sekaligus.'
                  : 'Ubah kata kunci pencarian di atas.'}
              </p>
            </div>
          ) : (
            <ul className="house-manage-list">
              {filteredHouseAccounts.map((house) => {
                const isManaged = house.sortingMode === 'KELOLAAN_POS';
                return (
                  <li key={house.id} className="house-manage-row">
                    <div className="house-manage-info">
                      <strong>{house.name}</strong>
                      <span>
                        {house.blockCode} · {house.qrCode} ·{' '}
                        <strong className="accent-emerald tabular-nums">
                          {formatIdr(house.balanceIdr)}
                        </strong>
                      </span>
                    </div>
                    <div className="house-manage-controls">
                      <button
                        type="button"
                        className={`mode-toggle-chip ${isManaged ? 'is-managed' : 'is-self'}`}
                        onClick={() =>
                          onToggleHouseSortingMode(
                            house.id,
                            isManaged ? 'MANDIRI' : 'KELOLAAN_POS',
                          )
                        }
                      >
                        {isManaged ? 'Kelolaan Pengelola' : 'Pilah Mandiri'}
                      </button>
                      <button
                        type="button"
                        className="btn-hud-small"
                        onClick={() => onSelectActiveCitizen(house.id)}
                      >
                        {house.id === activeCitizen.id ? 'Aktif' : 'Pilih'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        /* Perorangan Section: Edit House Info, QR Card & Badges */
        <>
          <section className="oneui-card" aria-labelledby="edit-house-heading">
            <div className="oneui-card-head">
              <div>
                <span className="section-kicker">Informasi Rumah</span>
                <h2 id="edit-house-heading">Edit Identitas Rumah</h2>
              </div>
              <span className="qr-card-chip">
                <QrCodeIcon /> <code>{activeCitizen.qrCode}</code>
              </span>
            </div>

            <form className="profile-edit-form" onSubmit={handleSaveProfile}>
              <div className="auth-form-grid">
                <div className="field-group">
                  <label htmlFor="profile-edit-name" className="field-label">
                    Nama Penghuni / Rumah
                  </label>
                  <input
                    id="profile-edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setSavedToast(null);
                    }}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="profile-edit-block" className="field-label">
                    Blok / Nomor Rumah
                  </label>
                  <input
                    id="profile-edit-block"
                    type="text"
                    value={editBlock}
                    onChange={(e) => {
                      setEditBlock(e.target.value);
                      setSavedToast(null);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="profile-save-row">
                <button type="submit" className="btn-primary">
                  Simpan Perubahan
                </button>
                {savedToast && (
                  <span className="diag-status-ok" role="status">
                    {savedToast}
                  </span>
                )}
              </div>
            </form>
          </section>

          <section className="oneui-card" aria-labelledby="profile-badges-heading">
            <div className="oneui-card-head">
              <div>
                <span className="section-kicker">Pencapaian Pilah Mandiri</span>
                <h2 id="profile-badges-heading">Lencana Rumah Anda</h2>
              </div>
              <span className="badge-progress-summary tabular-nums">
                {activeCitizen.badges.length} / {BADGE_DEFINITIONS.length} Terbuka
              </span>
            </div>

            <div className="badges-grid">
              {BADGE_DEFINITIONS.map((badge) => {
                const isUnlocked = unlockedSet.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`achievement-badge-card ${isUnlocked ? 'is-unlocked' : ''}`}
                  >
                    <div className="achievement-badge-top">
                      <CheckBadgeIcon />
                      <span className="achievement-state">
                        {isUnlocked ? 'Terbuka' : 'Terkunci'}
                      </span>
                    </div>
                    <strong>{badge.title}</strong>
                    <p>{badge.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
