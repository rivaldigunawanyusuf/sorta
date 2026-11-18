import { useEffect, useRef, useState } from 'react';
import { formatIdr } from '../data/catalog';
import { getLevelProgress } from '../data/gamification';
import { detectQrCodeFromVideo, isNativeQrDetectorSupported } from '../services/qrScanner';
import type { CitizenAccount } from '../types/sorta';
import { QrCodeIcon, UserPlusIcon } from './Icons';

interface QrCitizenDialogProps {
  open: boolean;
  onClose: () => void;
  citizens: CitizenAccount[];
  activeCitizenId: string;
  onSelectCitizen: (id: string) => void;
  onRequestRegisterCitizen: () => void;
  cameraStream: MediaStream | null;
}

export function QrCitizenDialog({
  open,
  onClose,
  citizens,
  activeCitizenId,
  onSelectCitizen,
  onRequestRegisterCitizen,
  cameraStream,
}: QrCitizenDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const nativeQrSupported = isNativeQrDetectorSupported();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setScanFeedback(null);
      setManualCode('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

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
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [onClose]);

  useEffect(() => {
    if (!open || !cameraStream || !qrVideoRef.current) return;
    const videoEl = qrVideoRef.current;
    videoEl.srcObject = cameraStream;
    void videoEl.play().catch(() => undefined);

    if (!nativeQrSupported) return;

    const timer = window.setInterval(async () => {
      const detected = await detectQrCodeFromVideo(videoEl);
      if (!detected) return;
      const match = citizens.find(
        (c) => c.qrCode.toUpperCase() === detected.trim().toUpperCase(),
      );
      if (match) {
        onSelectCitizen(match.id);
        onClose();
      } else {
        setScanFeedback(`QR terbaca (${detected}) belum terdaftar.`);
      }
    }, 350);

    return () => window.clearInterval(timer);
  }, [open, cameraStream, nativeQrSupported, citizens, onSelectCitizen, onClose]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = manualCode.trim().toUpperCase();
    const match = citizens.find(
      (c) =>
        c.qrCode.toUpperCase() === normalized ||
        c.blockCode.toUpperCase() === normalized ||
        c.name.toUpperCase().includes(normalized),
    );
    if (!match) {
      setScanFeedback('Kode QR, blok, atau nama warga tidak ditemukan.');
      return;
    }
    onSelectCitizen(match.id);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      id="qr-citizen-dialog"
      className="industrial-dialog"
      closedby="any"
      aria-labelledby="qr-dialog-title"
    >
      <div className="dialog-frame">
        <div className="dialog-header">
          <div>
            <span className="section-kicker">Identitas Bank Sampah</span>
            <h2 id="qr-dialog-title">Pindai / Pilih Kartu Warga</h2>
          </div>
          <button
            type="button"
            className="btn-secondary dialog-close-btn"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup dialog QR Warga"
          >
            Tutup
          </button>
        </div>

        <div className="dialog-body">
          <div className="qr-scanner-box">
            {cameraStream ? (
              <video
                ref={qrVideoRef}
                className="qr-video-preview"
                autoPlay
                playsInline
                muted
                width={320}
                height={180}
              />
            ) : (
              <div className="qr-camera-standby">
                <QrCodeIcon />
                <p>
                  Aktifkan kamera di Kiosk untuk memindai kartu QR warga otomatis, atau cari nama /
                  kode kartu di bawah ini.
                </p>
              </div>
            )}
            <p className="qr-detector-note">
              {nativeQrSupported
                ? 'Pemindai QR otomatis siap saat kamera aktif.'
                : 'Masukkan kode kartu / blok atau pilih akun warga di bawah.'}
            </p>
          </div>

          <form className="qr-manual-form" onSubmit={handleManualSubmit}>
            <label htmlFor="manual-qr-input" className="field-label">
              Cari Kode QR / Nama / Blok
            </label>
            <div className="qr-input-row">
              <input
                id="manual-qr-input"
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setScanFeedback(null);
                }}
                placeholder="Contoh: SORTA-KOMUNITAS"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
              <button type="submit" className="btn-primary">
                Terapkan
              </button>
            </div>
            {scanFeedback && (
              <p className="form-error-text" role="alert">
                {scanFeedback}
              </p>
            )}
          </form>

          <div className="qr-quick-grid">
            <div className="field-label-row">
              <span className="section-kicker">Daftar Akun Terdaftar ({citizens.length})</span>
              <button
                type="button"
                className="btn-hud-small"
                onClick={() => {
                  onClose();
                  onRequestRegisterCitizen();
                }}
              >
                <UserPlusIcon />
                <span>Tambah Warga</span>
              </button>
            </div>
            <div className="qr-cards-list">
              {citizens.map((citizen) => {
                const isSelected = citizen.id === activeCitizenId;
                const { currentTier } = getLevelProgress(citizen.ecoPoints);
                return (
                  <button
                    key={citizen.id}
                    type="button"
                    className={`qr-citizen-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onSelectCitizen(citizen.id);
                      onClose();
                    }}
                  >
                    <div className="qr-citizen-meta">
                      <span className="qr-monogram" aria-hidden="true">
                        L{currentTier.level}
                      </span>
                      <div>
                        <strong>{citizen.name}</strong>
                        <span className="qr-code-tag">
                          {citizen.blockCode} · {citizen.qrCode}
                        </span>
                      </div>
                    </div>
                    <div className="qr-card-stats tabular-nums">
                      <span className="qr-card-balance">{formatIdr(citizen.balanceIdr)}</span>
                      <span className="qr-card-points">{citizen.ecoPoints} Poin</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
