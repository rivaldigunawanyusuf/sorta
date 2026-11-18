import { useState } from 'react';
import { SEED_DEFAULT_PASSWORD, SEED_USER_ACCOUNTS } from '../data/seed';
import type { CitizenAccount, SeedUserAccount, UserRole } from '../types/sorta';
import { ProfileNavIcon, SortaMark, UsersGroupIcon } from './Icons';

interface AuthLoginScreenProps {
  existingHouses: CitizenAccount[];
  onLoginSuccess: (account: SeedUserAccount) => void;
}

const DEFAULT_USERNAME_BY_ROLE: Record<UserRole, string> = {
  PERORANGAN: 'warga-b4',
  PENGELOLA: 'pos-rw04',
};

export function AuthLoginScreen({
  existingHouses,
  onLoginSuccess,
}: AuthLoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('PERORANGAN');
  const [username, setUsername] = useState<string>(DEFAULT_USERNAME_BY_ROLE.PERORANGAN);
  const [password, setPassword] = useState<string>(SEED_DEFAULT_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectCategoryTab = (role: UserRole) => {
    setSelectedRole(role);
    setUsername(DEFAULT_USERNAME_BY_ROLE[role]);
    setPassword(SEED_DEFAULT_PASSWORD);
    setErrorMsg(null);
  };

  const handleSelectSeedAccount = (acc: SeedUserAccount) => {
    setSelectedRole(acc.role);
    setUsername(acc.username);
    setPassword(acc.password);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanCode.length < 2) {
      setErrorMsg('Masukkan kode akun atau username terlebih dahulu.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Masukkan password akun Anda.');
      return;
    }

    const matchedSeed = SEED_USER_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === cleanCode,
    );
    if (matchedSeed) {
      if (cleanPass !== matchedSeed.password) {
        setErrorMsg(`Password salah. Password akun seed testing: ${matchedSeed.password}`);
        return;
      }
      onLoginSuccess(matchedSeed);
      return;
    }

    // Also allow any registered house QR code to sign in with the default testing password
    const matchedHouse = existingHouses.find(
      (house) => !house.isCommunityPool && house.qrCode.toLowerCase() === cleanCode,
    );
    if (matchedHouse) {
      if (cleanPass !== SEED_DEFAULT_PASSWORD) {
        setErrorMsg(`Password salah. Gunakan ${SEED_DEFAULT_PASSWORD} untuk kode rumah.`);
        return;
      }
      onLoginSuccess({
        username: matchedHouse.qrCode.toLowerCase(),
        password: SEED_DEFAULT_PASSWORD,
        role: 'PERORANGAN',
        displayName: matchedHouse.name,
        areaLabel: matchedHouse.blockCode,
        citizenId: matchedHouse.id,
      });
      return;
    }

    setErrorMsg(
      'Kode atau username belum terdaftar. Pilih salah satu akun seed di bawah untuk pengujian.',
    );
  };

  const activeCategoryAccount =
    SEED_USER_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === username.trim().toLowerCase(),
    ) ?? null;

  return (
    <div className="auth-screen-wrap">
      <main id="main-content" className="auth-screen-inner">
        <div className="auth-hero-header">
          <div className="auth-brand-pill">
            <SortaMark className="brand-icon" />
            <span>SORTA Smart Waste Bank</span>
          </div>
          <h1>Masuk ke Sistem Pilah Sampah</h1>
          <p>
            Masuk menggunakan <strong>Kode / Username</strong> dan <strong>Password</strong>.
            Kredensial akun seed sudah terisi otomatis sesuai kategori yang dipilih.
          </p>
        </div>

        <div className="auth-role-tabs" role="tablist" aria-label="Kategori Akun Testing">
          <button
            type="button"
            role="tab"
            aria-selected={selectedRole === 'PERORANGAN'}
            className={`auth-role-tab ${selectedRole === 'PERORANGAN' ? 'is-selected' : ''}`}
            onClick={() => handleSelectCategoryTab('PERORANGAN')}
          >
            <ProfileNavIcon />
            <div>
              <strong>Perorangan</strong>
              <span>Akun rumah pilah mandiri</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedRole === 'PENGELOLA'}
            className={`auth-role-tab ${selectedRole === 'PENGELOLA' ? 'is-selected' : ''}`}
            onClick={() => handleSelectCategoryTab('PENGELOLA')}
          >
            <UsersGroupIcon />
            <div>
              <strong>Pengelola</strong>
              <span>Akun pos akumulator multi-rumah</span>
            </div>
          </button>
        </div>

        <section className="auth-card" aria-live="polite">
          <div className="auth-panel-body">
            <div className="auth-panel-lead">
              <div className="auth-lead-badges">
                <span
                  className={`role-pill ${
                    (activeCategoryAccount?.role ?? selectedRole) === 'PENGELOLA'
                      ? 'is-pengelola'
                      : 'is-perorangan'
                  }`}
                >
                  Kategori:{' '}
                  {(activeCategoryAccount?.role ?? selectedRole) === 'PENGELOLA'
                    ? 'Pengelola'
                    : 'Perorangan'}
                </span>
                <span className="seed-ready-tag">Data Seed Terisi Otomatis</span>
              </div>
              <h2>Masuk dengan Kode &amp; Password</h2>
              <p>
                {activeCategoryAccount
                  ? `Terdeteksi akun seed (${activeCategoryAccount.username}) pada kategori ${
                      activeCategoryAccount.role === 'PENGELOLA' ? 'Pengelola' : 'Perorangan'
                    }. Klik Masuk untuk langsung menguji aplikasi.`
                  : 'Masukkan kode akun atau pilih salah satu akun seed testing di bawah.'}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-form-grid">
                <div className="field-group">
                  <label htmlFor="login-username" className="field-label">
                    Kode Akun / Username
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Contoh: warga-b4 atau pos-rw04"
                    required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="login-password" className="field-label">
                    Password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Masukkan password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPassword ? 'Tutup' : 'Lihat'}
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <p className="form-error-text" role="alert">
                  {errorMsg}
                </p>
              )}

              <button type="submit" className="btn-commit auth-submit-btn">
                Masuk ke SORTA
              </button>
            </form>

            <div className="auth-seed-box">
              <div className="auth-seed-head">
                <span className="section-kicker">Akun Seed Testing (Password: {SEED_DEFAULT_PASSWORD})</span>
              </div>
              <div className="auth-house-chips">
                {SEED_USER_ACCOUNTS.map((acc) => {
                  const isActive =
                    acc.username.toLowerCase() === username.trim().toLowerCase();
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      className={`auth-house-chip ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleSelectSeedAccount(acc)}
                    >
                      <div className="auth-chip-top">
                        <code>{acc.username}</code>
                        <span
                          className={`auth-chip-role ${
                            acc.role === 'PENGELOLA' ? 'is-pengelola' : 'is-perorangan'
                          }`}
                        >
                          {acc.role === 'PENGELOLA' ? 'Pengelola' : 'Perorangan'}
                        </span>
                      </div>
                      <span className="auth-chip-desc">{acc.areaLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
