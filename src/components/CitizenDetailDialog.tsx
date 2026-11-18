import { useEffect, useRef } from 'react';
import { formatIdr } from '../data/catalog';
import { BADGE_DEFINITIONS, getLevelProgress } from '../data/gamification';
import type { CitizenAccount, TransactionRecord, WithdrawalRecord } from '../types/sorta';
import { CheckBadgeIcon, StreakBoltIcon } from './Icons';

interface CitizenDetailDialogProps {
  citizen: CitizenAccount | null;
  rankNumber: number | null;
  isManager: boolean;
  isOwnHouse: boolean;
  transactions: TransactionRecord[];
  withdrawals: WithdrawalRecord[];
  onClose: () => void;
  onRequestPayout: (citizen: CitizenAccount) => void;
}

export function CitizenDetailDialog({
  citizen,
  rankNumber,
  isManager,
  isOwnHouse,
  transactions,
  withdrawals,
  onClose,
  onRequestPayout,
}: CitizenDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (citizen && !dialog.open) {
      dialog.showModal();
    } else if (!citizen && dialog.open) {
      dialog.close();
    }
  }, [citizen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', handleClose);
    }

    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, [onClose]);

  const levelInfo = citizen ? getLevelProgress(citizen.ecoPoints) : null;
  const citizenTx = citizen
    ? transactions.filter((t) => t.citizenId === citizen.id).slice(0, 3)
    : [];
  const citizenWd = citizen
    ? withdrawals.filter((w) => w.citizenId === citizen.id).slice(0, 2)
    : [];
  const canWithdraw = Boolean(citizen && citizen.balanceIdr > 0 && (isManager || isOwnHouse));
  const unlockedSet = new Set(citizen?.badges ?? []);

  return (
    <dialog
      ref={dialogRef}
      id="citizen-detail-dialog"
      className="industrial-dialog"
      closedby="any"
      aria-labelledby="citizen-detail-title"
    >
      {citizen && levelInfo && (
        <div className="dialog-frame">
          <div className="dialog-header">
            <div>
              <div className="detail-modal-badges">
                {rankNumber !== null && (
                  <span className={`rank-pill ${rankNumber === 1 ? 'is-top' : ''}`}>
                    Peringkat #{rankNumber}
                  </span>
                )}
                <span
                  className={`mode-tag-pill ${
                    citizen.sortingMode === 'KELOLAAN_POS' ? 'is-managed' : 'is-self'
                  }`}
                >
                  {citizen.sortingMode === 'KELOLAAN_POS' ? 'Kelolaan Pos' : 'Pilah Mandiri'}
                </span>
              </div>
              <h2 id="citizen-detail-title">{citizen.name}</h2>
              <p className="detail-modal-sub">
                {citizen.blockCode} · <code>{citizen.qrCode}</code>
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary dialog-close-btn"
              onClick={() => dialogRef.current?.close()}
            >
              Tutup
            </button>
          </div>

          <div className="dialog-body">
            <div className="detail-stats-grid tabular-nums">
              <div className="detail-stat-tile">
                <span className="section-kicker">Saldo Siap Cair</span>
                <strong className="accent-emerald">{formatIdr(citizen.balanceIdr)}</strong>
              </div>
              <div className="detail-stat-tile">
                <span className="section-kicker">Level &amp; Poin</span>
                <strong>
                  Lv.{levelInfo.currentTier.level} · {citizen.ecoPoints} Poin
                </strong>
                <span>{levelInfo.currentTier.title}</span>
              </div>
              <div className="detail-stat-tile">
                <span className="section-kicker">Total Terpilah</span>
                <strong>{citizen.totalWeightKg.toFixed(2)} kg</strong>
                <span>{citizen.itemsSorted} item tercatat</span>
              </div>
              <div className="detail-stat-tile">
                <span className="section-kicker">Streak &amp; Dampak</span>
                <strong className="inline-streak">
                  <StreakBoltIcon /> {citizen.streakDays} hari
                </strong>
                <span>{citizen.co2SavedKg.toFixed(2)} kg CO2e dicegah</span>
              </div>
            </div>

            <div className="detail-section-block">
              <div className="detail-section-head">
                <span className="section-kicker">Lencana Pencapaian</span>
                <strong className="tabular-nums">
                  {citizen.badges.length} / {BADGE_DEFINITIONS.length} Terbuka
                </strong>
              </div>
              <div className="detail-badges-wrap">
                {BADGE_DEFINITIONS.map((badge) => {
                  const unlocked = unlockedSet.has(badge.id);
                  return (
                    <span
                      key={badge.id}
                      className={`detail-badge-chip ${unlocked ? 'is-unlocked' : ''}`}
                    >
                      <CheckBadgeIcon />
                      <span>{badge.title}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="detail-section-block">
              <span className="section-kicker">Setoran Terbaru Rumah Ini</span>
              {citizenTx.length === 0 ? (
                <p className="detail-empty-note">Belum ada setoran tercatat untuk akun ini.</p>
              ) : (
                <ul className="detail-mini-list">
                  {citizenTx.map((tx) => (
                    <li key={tx.id} className="detail-mini-row">
                      <div>
                        <strong>{tx.itemName}</strong>
                        <span>
                          {tx.weightGrams} g ·{' '}
                          {new Date(tx.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <strong className="accent-emerald tabular-nums">
                        +{formatIdr(tx.payoutIdr)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {citizenWd.length > 0 && (
              <div className="detail-section-block">
                <span className="section-kicker">Pencairan Terakhir</span>
                <ul className="detail-mini-list">
                  {citizenWd.map((wd) => (
                    <li key={wd.id} className="detail-mini-row">
                      <div>
                        <strong>{wd.channel}</strong>
                        <span>Tujuan: {wd.destination}</span>
                      </div>
                      <strong className="tabular-nums">-{formatIdr(wd.amountIdr)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="dialog-actions-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn-commit"
                disabled={!canWithdraw}
                onClick={() => {
                  const target = citizen;
                  dialogRef.current?.close();
                  onRequestPayout(target);
                }}
              >
                Cairkan Saldo ({formatIdr(citizen.balanceIdr)})
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
