import { useMemo, useState } from 'react';
import { formatIdr } from '../data/catalog';
import { COMMUNITY_DIVERSION_TARGET_KG } from '../data/gamification';
import type {
  AuthSession,
  BinPosition,
  BinState,
  CitizenAccount,
  HouseSortingMode,
  MaterialCatalogItem,
  MaterialCode,
  TransactionRecord,
  WeightSensorMode,
  WithdrawalRecord,
} from '../types/sorta';
import { CitizenDetailDialog } from './CitizenDetailDialog';
import { TrophyIcon, UserPlusIcon } from './Icons';

type LedgerSubTab = 'ranking' | 'history' | 'catalog';
type CitizenSortOption = 'points' | 'balance' | 'weight' | 'streak' | 'name';
type TxSortOption = 'latest' | 'payout' | 'weight';
type CatalogSortOption = 'price_desc' | 'price_asc' | 'name';

function formatSensorModeLabel(mode: WeightSensorMode): string {
  if (mode === 'BLE_LOAD_CELL') return 'BLE';
  if (mode === 'MANUAL_SCALE') return 'Manual';
  return 'Kamera';
}

interface LedgerViewProps {
  session: AuthSession;
  citizens: CitizenAccount[];
  activeCitizen: CitizenAccount;
  transactions: TransactionRecord[];
  withdrawals: WithdrawalRecord[];
  catalog: MaterialCatalogItem[];
  bins: Record<BinPosition, BinState>;
  onOpenPayout: (citizen: CitizenAccount) => void;
  onOpenRegisterCitizen: () => void;
  onUpdateCatalogItem: (
    code: MaterialCode,
    field: 'pricePerKgIdr' | 'defaultWeightGrams',
    value: number,
  ) => void;
  onResetCatalogDefaults: () => void;
  onGoToCamera: () => void;
}

export function LedgerView({
  session,
  citizens,
  activeCitizen,
  transactions,
  withdrawals,
  catalog,
  bins,
  onOpenPayout,
  onOpenRegisterCitizen,
  onUpdateCatalogItem,
  onResetCatalogDefaults,
  onGoToCamera,
}: LedgerViewProps) {
  const isManager = session.role === 'PENGELOLA';

  const [subTab, setSubTab] = useState<LedgerSubTab>('ranking');

  // Leaderboard Search, Category Filter & Sort
  const [citizenSearch, setCitizenSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | HouseSortingMode>('ALL');
  const [citizenSort, setCitizenSort] = useState<CitizenSortOption>('points');
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  // History Sub-tab Search, Filter & Sort
  const [historyFocus, setHistoryFocus] = useState<'deposits' | 'withdrawals'>('deposits');
  const [txSearch, setTxSearch] = useState('');
  const [filterCitizenId, setFilterCitizenId] = useState<string>('ALL');
  const [txSort, setTxSort] = useState<TxSortOption>('latest');

  // Catalog Sub-tab Search, Filter & Sort
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogBinFilter, setCatalogBinFilter] = useState<'ALL' | BinPosition>('ALL');
  const [catalogSort, setCatalogSort] = useState<CatalogSortOption>('price_desc');

  const totalSortedWeightKg =
    bins.LEFT.totalWeightKg + bins.CENTER.totalWeightKg + bins.RIGHT.totalWeightKg;
  const divertedWeightKg = bins.LEFT.totalWeightKg + bins.CENTER.totalWeightKg;
  const diversionRatePct =
    totalSortedWeightKg > 0
      ? Math.round((divertedWeightKg / totalSortedWeightKg) * 100)
      : 0;
  const totalCitizenBalanceIdr = citizens.reduce((sum, c) => sum + c.balanceIdr, 0);
  const totalCo2SavedKg = citizens.reduce((sum, c) => sum + c.co2SavedKg, 0);
  const communityGoalPct = Math.min(
    100,
    Math.round((divertedWeightKg / COMMUNITY_DIVERSION_TARGET_KG) * 100),
  );

  // Compute canonical rank index (#1..#N) by points
  const canonicalRankMap = useMemo(() => {
    const byPoints = [...citizens].sort((a, b) => {
      if (b.ecoPoints !== a.ecoPoints) return b.ecoPoints - a.ecoPoints;
      if (b.totalWeightKg !== a.totalWeightKg) return b.totalWeightKg - a.totalWeightKg;
      return b.balanceIdr - a.balanceIdr;
    });
    const map = new Map<string, number>();
    byPoints.forEach((c, idx) => map.set(c.id, idx + 1));
    return map;
  }, [citizens]);

  const filteredSortedCitizens = useMemo(() => {
    const q = citizenSearch.trim().toLowerCase();
    const list = citizens.filter((c) => {
      if (modeFilter !== 'ALL' && c.sortingMode !== modeFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.blockCode.toLowerCase().includes(q) ||
        c.qrCode.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (citizenSort === 'balance') return b.balanceIdr - a.balanceIdr;
      if (citizenSort === 'weight') return b.totalWeightKg - a.totalWeightKg;
      if (citizenSort === 'streak') return b.streakDays - a.streakDays;
      if (citizenSort === 'name') return a.name.localeCompare(b.name, 'id');
      if (b.ecoPoints !== a.ecoPoints) return b.ecoPoints - a.ecoPoints;
      return b.balanceIdr - a.balanceIdr;
    });
  }, [citizens, citizenSearch, modeFilter, citizenSort]);

  const filteredSortedTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    const list = transactions.filter((tx) => {
      if (filterCitizenId !== 'ALL' && tx.citizenId !== filterCitizenId) return false;
      if (!q) return true;
      return (
        tx.itemName.toLowerCase().includes(q) ||
        tx.citizenName.toLowerCase().includes(q) ||
        tx.materialCode.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (txSort === 'payout') return b.payoutIdr - a.payoutIdr;
      if (txSort === 'weight') return b.weightGrams - a.weightGrams;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [transactions, filterCitizenId, txSearch, txSort]);

  const filteredWithdrawals = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return withdrawals.filter((wd) => {
      if (filterCitizenId !== 'ALL' && wd.citizenId !== filterCitizenId) return false;
      if (!q) return true;
      return (
        wd.citizenName.toLowerCase().includes(q) ||
        wd.channel.toLowerCase().includes(q) ||
        wd.destination.toLowerCase().includes(q)
      );
    });
  }, [withdrawals, filterCitizenId, txSearch]);

  const filteredSortedCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const list = catalog.filter((item) => {
      if (catalogBinFilter !== 'ALL' && item.binPosition !== catalogBinFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (catalogSort === 'price_asc') return a.pricePerKgIdr - b.pricePerKgIdr;
      if (catalogSort === 'name') return a.name.localeCompare(b.name, 'id');
      return b.pricePerKgIdr - a.pricePerKgIdr;
    });
  }, [catalog, catalogSearch, catalogBinFilter, catalogSort]);

  const selectedDetailCitizen =
    detailTargetId ? (citizens.find((c) => c.id === detailTargetId) ?? null) : null;

  return (
    <div className="ledger-view">
      {/* Compact Hero Summary Strip */}
      <section className="ledger-hero-strip oneui-card" aria-label="Ringkasan Bank Sampah">
        <div className="ledger-heading-row">
          <div>
            <span className={`role-pill ${isManager ? 'is-pengelola' : 'is-perorangan'}`}>
              {isManager ? `Pengelola · ${session.areaName}` : 'Bank Sampah Komunitas'}
            </span>
            <h1>Bank Sampah &amp; Papan Peringkat</h1>
          </div>
          {isManager && (
            <button type="button" className="btn-commit" onClick={onOpenRegisterCitizen}>
              <UserPlusIcon />
              <span>Daftarkan Rumah</span>
            </button>
          )}
        </div>

        <div className="ledger-totals-bar">
          <div className="ledger-metric-cell">
            <span className="section-kicker">Total Saldo</span>
            <strong className="tabular-nums accent-emerald">
              {formatIdr(totalCitizenBalanceIdr)}
            </strong>
          </div>
          <div className="ledger-metric-cell">
            <span className="section-kicker">Terpilah</span>
            <strong className="tabular-nums">{totalSortedWeightKg.toFixed(2)} kg</strong>
          </div>
          <div className="ledger-metric-cell">
            <span className="section-kicker">Reduksi TPA</span>
            <strong className="tabular-nums accent-emerald">{diversionRatePct}%</strong>
          </div>
          <div className="ledger-metric-cell">
            <span className="section-kicker">Emisi Dicegah</span>
            <strong className="tabular-nums">{totalCo2SavedKg.toFixed(1)} kg CO2e</strong>
          </div>
        </div>

        <div className="community-goal-box">
          <div className="community-goal-head tabular-nums">
            <span className="section-kicker">
              <TrophyIcon /> Target Sirkular ({divertedWeightKg.toFixed(2)} /{' '}
              {COMMUNITY_DIVERSION_TARGET_KG} kg)
            </span>
            <strong>{communityGoalPct}%</strong>
          </div>
          <div className="community-goal-track" aria-hidden="true">
            <div className="community-goal-fill" style={{ width: `${communityGoalPct}%` }} />
          </div>
        </div>
      </section>

      {/* Lightweight Segmented Sub-Tabs (No Long Vertical Scrolling) */}
      <div className="ledger-subtabs" role="tablist" aria-label="Bagian Bank Sampah">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'ranking'}
          className={`ledger-subtab ${subTab === 'ranking' ? 'is-active' : ''}`}
          onClick={() => setSubTab('ranking')}
        >
          <span>Peringkat</span>
          <em className="subtab-count tabular-nums">{citizens.length}</em>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'history'}
          className={`ledger-subtab ${subTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setSubTab('history')}
        >
          <span>Riwayat</span>
          <em className="subtab-count tabular-nums">
            {transactions.length + withdrawals.length}
          </em>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'catalog'}
          className={`ledger-subtab ${subTab === 'catalog' ? 'is-active' : ''}`}
          onClick={() => setSubTab('catalog')}
        >
          <span>Harga</span>
          <em className="subtab-count tabular-nums">{catalog.length}</em>
        </button>
      </div>

      {/* Sub-Tab 1: Compact Clickable Leaderboard + Search + Sort + Detail Modal */}
      {subTab === 'ranking' && (
        <section className="ledger-section oneui-card" aria-labelledby="citizens-heading">
          <div className="section-header-row">
            <div>
              <span className="section-kicker">Klik baris untuk detail lengkap</span>
              <h2 id="citizens-heading">Papan Peringkat &amp; Saldo Rumah</h2>
            </div>
          </div>

          <div className="ledger-controls-bar">
            <label htmlFor="ledger-search-input" className="visually-hidden">
              Cari nama rumah, blok, atau kode QR
            </label>
            <input
              id="ledger-search-input"
              type="text"
              className="ledger-search-input"
              value={citizenSearch}
              onChange={(e) => setCitizenSearch(e.target.value)}
              placeholder="Cari nama rumah, blok, atau kode..."
            />

            <div className="ledger-select-pair">
              <label htmlFor="ledger-mode-filter" className="visually-hidden">
                Filter kategori rumah
              </label>
              <select
                id="ledger-mode-filter"
                className="ledger-filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as 'ALL' | HouseSortingMode)}
              >
                <option value="ALL">Semua Kategori</option>
                <option value="KELOLAAN_POS">Kelolaan Pos</option>
                <option value="MANDIRI">Pilah Mandiri</option>
              </select>

              <label htmlFor="ledger-sort-select" className="visually-hidden">
                Urutkan peringkat
              </label>
              <select
                id="ledger-sort-select"
                className="ledger-filter-select"
                value={citizenSort}
                onChange={(e) => setCitizenSort(e.target.value as CitizenSortOption)}
              >
                <option value="points">Poin Tertinggi</option>
                <option value="balance">Saldo Terbanyak</option>
                <option value="weight">Berat Terbanyak</option>
                <option value="streak">Streak Terlama</option>
                <option value="name">Nama A-Z</option>
              </select>
            </div>
          </div>

          {filteredSortedCitizens.length === 0 ? (
            <div className="empty-state-box">
              <strong>Tidak ada rumah yang cocok.</strong>
              <p>Ubah kata kunci pencarian atau filter kategori di atas.</p>
            </div>
          ) : (
            <ul className="compact-rank-list">
              {filteredSortedCitizens.map((citizen) => {
                const rankNumber = canonicalRankMap.get(citizen.id) ?? 1;
                const isOwnHouse = citizen.id === activeCitizen.id;
                const isManagedMode = citizen.sortingMode === 'KELOLAAN_POS';
                const canWithdraw = citizen.balanceIdr > 0 && (isManager || isOwnHouse);

                return (
                  <li
                    key={citizen.id}
                    className={`compact-rank-item ${isOwnHouse ? 'is-own-highlight' : ''}`}
                  >
                    <button
                      type="button"
                      className="compact-rank-trigger"
                      onClick={() => setDetailTargetId(citizen.id)}
                      aria-label={`Lihat detail ${citizen.name}`}
                    >
                      <span className={`rank-pill ${rankNumber === 1 ? 'is-top' : ''}`}>
                        #{rankNumber}
                      </span>

                      <div className="compact-rank-main">
                        <div className="compact-rank-title-row">
                          <strong>
                            {citizen.name}
                            {!isManager && isOwnHouse ? ' (Anda)' : ''}
                          </strong>
                          <span
                            className={`mode-tag-pill ${
                              isManagedMode ? 'is-managed' : 'is-self'
                            }`}
                          >
                            {isManagedMode ? 'Kelolaan Pos' : 'Mandiri'}
                          </span>
                        </div>
                        <span className="compact-rank-sub tabular-nums">
                          {citizen.blockCode} · {citizen.ecoPoints} Poin ·{' '}
                          {citizen.totalWeightKg.toFixed(2)} kg
                        </span>
                      </div>

                      <div className="compact-rank-right tabular-nums">
                        <strong className="balance-cell-value">
                          {formatIdr(citizen.balanceIdr)}
                        </strong>
                        <span>Detail &rsaquo;</span>
                      </div>
                    </button>

                    {canWithdraw && (
                      <button
                        type="button"
                        className="btn-primary btn-compact-withdraw"
                        onClick={() => onOpenPayout(citizen)}
                      >
                        Cairkan
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Sub-Tab 2: Searchable & Sortable Transactions + Withdrawals */}
      {subTab === 'history' && (
        <section className="ledger-section oneui-card" aria-labelledby="tx-heading">
          <div className="section-header-row">
            <div>
              <span className="section-kicker">Log Aktivitas Bank Sampah</span>
              <h2 id="tx-heading">
                {historyFocus === 'deposits' ? 'Riwayat Setoran' : 'Riwayat Pencairan'}
              </h2>
            </div>

            <div className="history-focus-pills" role="group" aria-label="Jenis Riwayat">
              <button
                type="button"
                className={`history-focus-pill ${historyFocus === 'deposits' ? 'is-active' : ''}`}
                onClick={() => setHistoryFocus('deposits')}
              >
                Setoran ({transactions.length})
              </button>
              <button
                type="button"
                className={`history-focus-pill ${
                  historyFocus === 'withdrawals' ? 'is-active' : ''
                }`}
                onClick={() => setHistoryFocus('withdrawals')}
              >
                Pencairan ({withdrawals.length})
              </button>
            </div>
          </div>

          <div className="ledger-controls-bar">
            <label htmlFor="tx-search-input" className="visually-hidden">
              Cari material atau nama rumah
            </label>
            <input
              id="tx-search-input"
              type="text"
              className="ledger-search-input"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder={
                historyFocus === 'deposits'
                  ? 'Cari item sampah atau nama rumah...'
                  : 'Cari nama rumah, GoPay, OVO...'
              }
            />

            <div className="ledger-select-pair">
              <label htmlFor="tx-citizen-filter" className="visually-hidden">
                Filter rumah
              </label>
              <select
                id="tx-citizen-filter"
                className="ledger-filter-select"
                value={filterCitizenId}
                onChange={(e) => setFilterCitizenId(e.target.value)}
              >
                <option value="ALL">Semua Rumah</option>
                {citizens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.blockCode})
                  </option>
                ))}
              </select>

              {historyFocus === 'deposits' && (
                <>
                  <label htmlFor="tx-sort-select" className="visually-hidden">
                    Urutkan riwayat
                  </label>
                  <select
                    id="tx-sort-select"
                    className="ledger-filter-select"
                    value={txSort}
                    onChange={(e) => setTxSort(e.target.value as TxSortOption)}
                  >
                    <option value="latest">Terbaru</option>
                    <option value="payout">Nilai Tertinggi</option>
                    <option value="weight">Berat Terbesar</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {historyFocus === 'deposits' ? (
            filteredSortedTransactions.length === 0 ? (
              <div className="empty-state-box">
                <strong>Tidak ada riwayat setoran yang cocok.</strong>
                <p>Buka tab Kamera untuk memindai sampah atau ubah kata kunci pencarian.</p>
                <button type="button" className="btn-primary" onClick={onGoToCamera}>
                  Buka Kamera Pindai
                </button>
              </div>
            ) : (
              <ul className="compact-tx-list">
                {filteredSortedTransactions.map((tx) => (
                  <li key={tx.id} className="compact-tx-row">
                    <div className="compact-tx-main">
                      <div className="compact-tx-title">
                        <strong>{tx.itemName}</strong>
                        {tx.batchHouseCount && tx.batchHouseCount > 1 && (
                          <span className="batch-tx-tag">
                            Akumulasi {tx.batchHouseCount} rumah
                          </span>
                        )}
                      </div>
                      <span className="compact-tx-sub tabular-nums">
                        {tx.citizenName} · {tx.weightGrams} g ·{' '}
                        {formatSensorModeLabel(tx.sensorMode)} ·{' '}
                        {new Date(tx.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="tx-earned-cell tabular-nums">
                      <strong className="balance-cell-value">+{formatIdr(tx.payoutIdr)}</strong>
                      <span>+{tx.pointsEarned} Poin</span>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : filteredWithdrawals.length === 0 ? (
            <div className="empty-state-box">
              <strong>Belum ada riwayat pencairan dana.</strong>
              <p>
                Buka tab Peringkat lalu tekan tombol &ldquo;Cairkan&rdquo; pada akun yang
                memiliki saldo.
              </p>
            </div>
          ) : (
            <ul className="compact-tx-list">
              {filteredWithdrawals.map((wd) => (
                <li key={wd.id} className="compact-tx-row">
                  <div className="compact-tx-main">
                    <strong>
                      {wd.citizenName} ({wd.channel})
                    </strong>
                    <span className="compact-tx-sub">
                      Tujuan: {wd.destination} ·{' '}
                      {new Date(wd.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <strong className="withdrawal-amount tabular-nums">
                    -{formatIdr(wd.amountIdr)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Sub-Tab 3: Searchable & Sortable Material Price Catalog */}
      {subTab === 'catalog' && (
        <section className="ledger-section oneui-card" aria-labelledby="catalog-heading">
          <div className="section-header-row">
            <div>
              <span className="section-kicker">
                {isManager ? 'Kelola Harga Beli Pengepul' : 'Tarif Resmi Bank Sampah'}
              </span>
              <h2 id="catalog-heading">Katalog Harga Material</h2>
            </div>
            {isManager && (
              <button
                type="button"
                className="btn-secondary btn-compact-sec"
                onClick={onResetCatalogDefaults}
              >
                Reset Harga Standar
              </button>
            )}
          </div>

          <div className="ledger-controls-bar">
            <label htmlFor="catalog-search-input" className="visually-hidden">
              Cari material atau kode
            </label>
            <input
              id="catalog-search-input"
              type="text"
              className="ledger-search-input"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Cari nama material atau kode (PET, ALU...)"
            />

            <div className="ledger-select-pair">
              <label htmlFor="catalog-bin-filter" className="visually-hidden">
                Filter tong material
              </label>
              <select
                id="catalog-bin-filter"
                className="ledger-filter-select"
                value={catalogBinFilter}
                onChange={(e) => setCatalogBinFilter(e.target.value as 'ALL' | BinPosition)}
              >
                <option value="ALL">Semua Tong</option>
                <option value="CENTER">Anorganik Bernilai</option>
                <option value="LEFT">Organik Kompos</option>
                <option value="RIGHT">Residu</option>
              </select>

              <label htmlFor="catalog-sort-select" className="visually-hidden">
                Urutkan material
              </label>
              <select
                id="catalog-sort-select"
                className="ledger-filter-select"
                value={catalogSort}
                onChange={(e) => setCatalogSort(e.target.value as CatalogSortOption)}
              >
                <option value="price_desc">Harga Tertinggi</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="name">Nama A-Z</option>
              </select>
            </div>
          </div>

          {filteredSortedCatalog.length === 0 ? (
            <div className="empty-state-box">
              <strong>Material tidak ditemukan.</strong>
              <p>Coba kata kunci lain atau pilih &ldquo;Semua Tong&rdquo;.</p>
            </div>
          ) : (
            <ul className="compact-catalog-list">
              {filteredSortedCatalog.map((item) => {
                const binBadgeClass =
                  item.binPosition === 'LEFT'
                    ? 'tag-emerald'
                    : item.binPosition === 'CENTER'
                      ? 'tag-amber'
                      : 'tag-crimson';

                return (
                  <li key={item.code} className="compact-catalog-row">
                    <div className="compact-catalog-info">
                      <div className="compact-rank-title-row">
                        <strong>{item.name}</strong>
                        <span className={`bin-mini-tag ${binBadgeClass}`}>
                          {item.binPosition === 'LEFT'
                            ? 'Organik'
                            : item.binPosition === 'CENTER'
                              ? 'Anorganik'
                              : 'Residu'}
                        </span>
                      </div>
                      <span className="compact-tx-sub">
                        <code>{item.code}</code> · Acuan {item.defaultWeightGrams} g/item
                      </span>
                    </div>

                    <div className="compact-catalog-price tabular-nums">
                      {isManager ? (
                        <div className="catalog-edit-pair">
                          <input
                            type="number"
                            min={0}
                            max={200000}
                            step={100}
                            className="inline-num-input tabular-nums"
                            aria-label={`Harga Rupiah per kilogram untuk ${item.name}`}
                            value={item.pricePerKgIdr}
                            onChange={(e) =>
                              onUpdateCatalogItem(
                                item.code,
                                'pricePerKgIdr',
                                Math.max(0, Number(e.target.value) || 0),
                              )
                            }
                          />
                          <span>Rp/kg</span>
                        </div>
                      ) : (
                        <strong className="accent-emerald">
                          {formatIdr(item.pricePerKgIdr)}/kg
                        </strong>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <CitizenDetailDialog
        citizen={selectedDetailCitizen}
        rankNumber={
          selectedDetailCitizen ? (canonicalRankMap.get(selectedDetailCitizen.id) ?? 1) : null
        }
        isManager={isManager}
        isOwnHouse={selectedDetailCitizen?.id === activeCitizen.id}
        transactions={transactions}
        withdrawals={withdrawals}
        onClose={() => setDetailTargetId(null)}
        onRequestPayout={onOpenPayout}
      />
    </div>
  );
}
