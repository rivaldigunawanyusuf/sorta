import { useEffect, useRef, useState } from 'react';
import type { CitizenAccount, HouseSortingMode } from '../types/sorta';

interface RegisterCitizenDialogProps {
  open: boolean;
  existingCitizens: CitizenAccount[];
  defaultSortingMode?: HouseSortingMode;
  onClose: () => void;
  onCreateCitizen: (
    name: string,
    blockCode: string,
    customQrCode: string,
    sortingMode: HouseSortingMode,
  ) => void;
}

function buildSuggestedQr(blockCode: string, existingCount: number): string {
  const cleanBlock = blockCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 8);
  const seq = String(existingCount + 1).padStart(2, '0');
  return cleanBlock ? `SORTA-${cleanBlock}-${seq}` : `SORTA-RMH-${seq}`;
}

export function RegisterCitizenDialog({
  open,
  existingCitizens,
  defaultSortingMode = 'KELOLAAN_POS',
  onClose,
  onCreateCitizen,
}: RegisterCitizenDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [sortingMode, setSortingMode] = useState<HouseSortingMode>(defaultSortingMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setName('');
      setBlockCode('');
      setQrCode('');
      setSortingMode(defaultSortingMode);
      setErrorMsg(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, defaultSortingMode]);

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

  const suggestedQr = buildSuggestedQr(blockCode, existingCitizens.length);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanBlock = blockCode.trim();
    const finalQr = (qrCode.trim() || suggestedQr).toUpperCase();

    if (cleanName.length < 2) {
      setErrorMsg('Masukkan nama warga atau rumah minimal 2 karakter.');
      return;
    }
    if (cleanBlock.length < 2) {
      setErrorMsg('Masukkan blok, nomor rumah, atau unit RT.');
      return;
    }
    if (existingCitizens.some((c) => c.qrCode.toUpperCase() === finalQr)) {
      setErrorMsg(`Kode QR ${finalQr} sudah terdaftar untuk rumah lain.`);
      return;
    }

    onCreateCitizen(cleanName, cleanBlock, finalQr, sortingMode);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      id="register-citizen-dialog"
      className="industrial-dialog"
      closedby="any"
      aria-labelledby="register-dialog-title"
    >
      <div className="dialog-frame">
        <div className="dialog-header">
          <div>
            <span className="section-kicker">Pendaftaran Rumah Warga</span>
            <h2 id="register-dialog-title">Daftarkan Rumah Baru</h2>
          </div>
          <button
            type="button"
            className="btn-secondary dialog-close-btn"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup form pendaftaran rumah"
          >
            Batal
          </button>
        </div>

        <form className="dialog-body payout-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="reg-citizen-name" className="field-label">
              Nama Kepala Keluarga / Rumah
            </label>
            <input
              id="reg-citizen-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Contoh: Keluarga Siti Rahayu"
              required
              autoFocus
            />
          </div>

          <div className="field-group">
            <label htmlFor="reg-citizen-block" className="field-label">
              Blok / Nomor Rumah
            </label>
            <input
              id="reg-citizen-block"
              type="text"
              value={blockCode}
              onChange={(e) => {
                setBlockCode(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Contoh: Blok B4"
              required
            />
          </div>

          <fieldset className="channel-fieldset">
            <legend className="field-label">Kebiasaan Pemilahan Rumah</legend>
            <div className="channel-radio-grid">
              <label className="channel-radio-option">
                <input
                  type="radio"
                  name="reg-sorting-mode"
                  value="KELOLAAN_POS"
                  checked={sortingMode === 'KELOLAAN_POS'}
                  onChange={() => setSortingMode('KELOLAAN_POS')}
                />
                <span>Kelolaan Pengelola</span>
              </label>
              <label className="channel-radio-option">
                <input
                  type="radio"
                  name="reg-sorting-mode"
                  value="MANDIRI"
                  checked={sortingMode === 'MANDIRI'}
                  onChange={() => setSortingMode('MANDIRI')}
                />
                <span>Pilah Mandiri</span>
              </label>
            </div>
          </fieldset>

          <div className="field-group">
            <label htmlFor="reg-citizen-qr" className="field-label">
              Kode Kartu QR (Opsional)
            </label>
            <input
              id="reg-citizen-qr"
              type="text"
              value={qrCode}
              onChange={(e) => {
                setQrCode(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={`Otomatis: ${suggestedQr}`}
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
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
            <button type="submit" className="btn-commit">
              Simpan Rumah
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
