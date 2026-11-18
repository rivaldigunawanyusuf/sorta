import { useEffect, useRef, useState } from 'react';
import { formatIdr } from '../data/catalog';
import type { CitizenAccount, PayoutChannel } from '../types/sorta';

interface PayoutDialogProps {
  citizen: CitizenAccount | null;
  onClose: () => void;
  onConfirmWithdrawal: (
    citizenId: string,
    channel: PayoutChannel,
    destination: string,
    amountIdr: number,
  ) => void;
}

const CHANNELS: PayoutChannel[] = ['GoPay', 'OVO', 'Token Listrik PLN', 'Kas Tunai RT'];

export function PayoutDialog({
  citizen,
  onClose,
  onConfirmWithdrawal,
}: PayoutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [channel, setChannel] = useState<PayoutChannel>('GoPay');
  const [destination, setDestination] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (citizen && !dialog.open) {
      setChannel('GoPay');
      setDestination('');
      setAmountInput(String(citizen.balanceIdr));
      setErrorMsg(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizen) return;

    const parsedAmount = Math.round(Number(amountInput));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Masukkan nominal pencairan lebih dari Rp 0.');
      return;
    }
    if (parsedAmount > citizen.balanceIdr) {
      setErrorMsg(`Nominal melebihi saldo tersedia (${formatIdr(citizen.balanceIdr)}).`);
      return;
    }
    if (channel !== 'Kas Tunai RT' && destination.trim().length < 6) {
      setErrorMsg(
        channel === 'Token Listrik PLN'
          ? 'Masukkan ID Pelanggan / Nomor Meter PLN minimal 6 digit.'
          : 'Masukkan nomor HP akun e-Wallet minimal 6 digit.',
      );
      return;
    }

    onConfirmWithdrawal(
      citizen.id,
      channel,
      channel === 'Kas Tunai RT' ? 'Kas Bendahara Bank Sampah' : destination.trim(),
      parsedAmount,
    );
    onClose();
  };

  const destinationLabel =
    channel === 'Token Listrik PLN'
      ? 'Nomor Meter / ID Pelanggan PLN'
      : channel === 'Kas Tunai RT'
        ? 'Catatan Penerima Tunai'
        : `Nomor HP ${channel}`;

  const destinationPlaceholder =
    channel === 'Token Listrik PLN'
      ? 'Contoh: 53001928371'
      : channel === 'Kas Tunai RT'
        ? 'Opsional (diambil di pos bank sampah)'
        : 'Contoh: 0812xxxxxxxx';

  return (
    <dialog
      ref={dialogRef}
      id="payout-dialog"
      className="industrial-dialog"
      closedby="any"
      aria-labelledby="payout-dialog-title"
    >
      <div className="dialog-frame">
        <div className="dialog-header">
          <div>
            <span className="section-kicker">Pencairan Saldo Bank Sampah</span>
            <h2 id="payout-dialog-title">
              Cairkan Saldo: {citizen ? `${citizen.name} (${citizen.blockCode})` : ''}
            </h2>
          </div>
          <button
            type="button"
            className="btn-secondary dialog-close-btn"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup form pencairan saldo"
          >
            Batal
          </button>
        </div>

        <form className="dialog-body payout-form" onSubmit={handleSubmit}>
          <div className="payout-balance-banner">
            <span>Saldo Tersedia</span>
            <strong className="tabular-nums">{formatIdr(citizen?.balanceIdr ?? 0)}</strong>
          </div>

          <fieldset className="channel-fieldset">
            <legend className="field-label">Pilih Kanal Pencairan</legend>
            <div className="channel-radio-grid">
              {CHANNELS.map((item) => (
                <label key={item} className="channel-radio-option">
                  <input
                    type="radio"
                    name="payout-channel"
                    value={item}
                    checked={channel === item}
                    onChange={() => {
                      setChannel(item);
                      setErrorMsg(null);
                    }}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field-group">
            <label htmlFor="payout-destination" className="field-label">
              {destinationLabel}
            </label>
            <input
              id="payout-destination"
              type="text"
              inputMode={channel === 'Kas Tunai RT' ? 'text' : 'numeric'}
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={destinationPlaceholder}
              required={channel !== 'Kas Tunai RT'}
              autoFocus
            />
          </div>

          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="payout-amount" className="field-label">
                Nominal Pencairan (Rp)
              </label>
              {citizen && (
                <button
                  type="button"
                  className="text-action-btn"
                  onClick={() => {
                    setAmountInput(String(citizen.balanceIdr));
                    setErrorMsg(null);
                  }}
                >
                  Tarik Semua ({formatIdr(citizen.balanceIdr)})
                </button>
              )}
            </div>
            <input
              id="payout-amount"
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value.replace(/[^\d]/g, ''));
                setErrorMsg(null);
              }}
              placeholder="Nominal Rupiah"
              required
            />
          </div>

          {errorMsg && (
            <p className="form-error-text" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="dialog-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-commit"
              disabled={!citizen || citizen.balanceIdr <= 0}
            >
              Proses Pencairan Saldo
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
