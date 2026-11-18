import { useEffect, useRef, useState } from 'react';
import {
  isWebBluetoothSupported,
  SORTA_BLE_SERVICE_UUID,
  SORTA_BLE_WEIGHT_CHAR_UUID,
} from '../services/bleScale';
import { verifyGeminiApiKey } from '../services/geminiVision';
import type {
  BleChannelWeights,
  BleConnectionStatus,
  WasteClassificationResult,
  WeightSensorMode,
} from '../types/sorta';

export type ThemePreference = 'light' | 'dark' | 'light dark';

function formatBleStatusLabel(status: BleConnectionStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'Terhubung';
    case 'CONNECTING':
      return 'Menghubungkan...';
    case 'UNSUPPORTED':
      return 'Tidak Didukung';
    case 'ERROR':
      return 'Gagal Pairing';
    default:
      return 'Siaga';
  }
}

function formatSensorModeLabel(mode: WeightSensorMode): string {
  if (mode === 'BLE_LOAD_CELL') return 'Timbangan BLE';
  if (mode === 'MANUAL_SCALE') return 'Timbangan Manual';
  return 'Estimasi Visual';
}

interface DiagnosticsViewProps {
  themePreference: ThemePreference;
  onChangeThemePreference: (pref: ThemePreference) => void;
  geminiApiKey: string;
  onChangeGeminiApiKey: (key: string) => void;
  bleStatus: BleConnectionStatus;
  bleMessage: string;
  bleDeviceName: string | null;
  bleChannels: BleChannelWeights;
  onConnectBle: () => void;
  onDisconnectBle: () => void;
  sensorMode: WeightSensorMode;
  overrideWeightGrams: number;
  onChangeManualWeight: (grams: number) => void;
  motionSensitivity: number;
  onChangeMotionSensitivity: (value: number) => void;
  autoScanOnMotion: boolean;
  onToggleAutoScanOnMotion: () => void;
  autoCommitEnabled: boolean;
  onToggleAutoCommitEnabled: () => void;
  ttsEnabled: boolean;
  onTestIndonesianVoice: () => void;
  lastClassification: WasteClassificationResult | null;
  cameraActive: boolean;
  onToggleCamera: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetLocalData: () => void;
}

export function DiagnosticsView({
  themePreference,
  onChangeThemePreference,
  geminiApiKey,
  onChangeGeminiApiKey,
  bleStatus,
  bleMessage,
  bleDeviceName,
  bleChannels,
  onConnectBle,
  onDisconnectBle,
  sensorMode,
  overrideWeightGrams,
  onChangeManualWeight,
  motionSensitivity,
  onChangeMotionSensitivity,
  autoScanOnMotion,
  onToggleAutoScanOnMotion,
  autoCommitEnabled,
  onToggleAutoCommitEnabled,
  ttsEnabled,
  onTestIndonesianVoice,
  lastClassification,
  cameraActive,
  onToggleCamera,
  isFullscreen,
  onToggleFullscreen,
  onResetLocalData,
}: DiagnosticsViewProps) {
  const [keyInput, setKeyInput] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const motionSliderRef = useRef<HTMLInputElement>(null);
  const diagWeightSliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKeyInput(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    if (motionSliderRef.current) {
      motionSliderRef.current.style.setProperty('--attr-min', '5');
      motionSliderRef.current.style.setProperty('--attr-max', '60');
      motionSliderRef.current.style.setProperty('--control-value', String(motionSensitivity));
    }
  }, [motionSensitivity]);

  useEffect(() => {
    if (diagWeightSliderRef.current) {
      diagWeightSliderRef.current.style.setProperty('--attr-min', '1');
      diagWeightSliderRef.current.style.setProperty('--attr-max', '5000');
      diagWeightSliderRef.current.style.setProperty('--control-value', String(overrideWeightGrams));
    }
  }, [overrideWeightGrams]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeGeminiApiKey(keyInput.trim());
    setKeyStatusMsg({
      ok: true,
      text: keyInput.trim()
        ? 'Kunci layanan cloud disimpan di perangkat ini.'
        : 'Kunci dikosongkan. Klasifikasi memakai pengenalan visual lokal.',
    });
  };

  const handleVerifyKey = async () => {
    setTestingKey(true);
    setKeyStatusMsg(null);
    const res = await verifyGeminiApiKey(keyInput);
    onChangeGeminiApiKey(keyInput.trim());
    setTestingKey(false);
    setKeyStatusMsg({ ok: res.ok, text: res.message });
  };

  const bleSupported = isWebBluetoothSupported();

  return (
    <div className="diagnostics-view">
      <header className="oneui-page-header">
        <span className="section-kicker">Pengaturan Kiosk</span>
        <h1>Perangkat &amp; Tampilan</h1>
        <p>Atur koneksi timbangan Bluetooth, kamera, suara kiosk, serta tema tampilan aplikasi.</p>
      </header>

      <div className="diag-layout-grid">
        {/* Appearance, Camera & Audio Card */}
        <section className="diag-panel oneui-card" aria-labelledby="diag-motion-heading">
          <div className="diag-panel-head">
            <div>
              <span className="section-kicker">Layar, Kamera, &amp; Suara</span>
              <h2 id="diag-motion-heading">Preferensi Perangkat</h2>
            </div>
            <span className={`diag-badge ${cameraActive ? 'is-live' : ''}`}>
              {cameraActive ? 'Kamera Aktif' : 'Siaga'}
            </span>
          </div>

          <fieldset className="theme-segmented-fieldset">
            <legend className="field-label">Tampilan Tema Aplikasi</legend>
            <div className="theme-segmented-track">
              {[
                { value: 'light' as const, label: 'Terang' },
                { value: 'dark' as const, label: 'Gelap' },
                { value: 'light dark' as const, label: 'Sistem' },
              ].map((opt) => (
                <label key={opt.value} className="theme-radio-option">
                  <input
                    type="radio"
                    name="sorta-theme-pref"
                    value={opt.value}
                    checked={themePreference === opt.value}
                    onChange={() => onChangeThemePreference(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="diag-slider-block">
            <div className="field-label-row">
              <label htmlFor="motion-sensitivity-slider" className="field-label">
                Sensitivitas Gerakan Kamera
              </label>
              <strong className="tabular-nums">{motionSensitivity}% piksel</strong>
            </div>
            <input
              ref={motionSliderRef}
              id="motion-sensitivity-slider"
              className="load-cell-slider"
              type="range"
              min={5}
              max={60}
              step={1}
              value={motionSensitivity}
              aria-valuetext={`${motionSensitivity} persen perubahan piksel`}
              onChange={(e) => onChangeMotionSensitivity(Number(e.target.value))}
            />
            <p className="field-hint">
              Nilai lebih kecil membuat kamera lebih responsif memicu pemindaian otomatis.
            </p>
          </div>

          <div className="toggle-stack">
            <label className="switch-row">
              <span>Scan otomatis saat objek stabil 400ms</span>
              <input
                type="checkbox"
                className="oneui-switch"
                checked={autoScanOnMotion}
                onChange={onToggleAutoScanOnMotion}
              />
            </label>

            <label className="switch-row">
              <span>Catat setoran otomatis setelah 3 detik</span>
              <input
                type="checkbox"
                className="oneui-switch"
                checked={autoCommitEnabled}
                onChange={onToggleAutoCommitEnabled}
              />
            </label>
          </div>

          <div className="diag-btn-row">
            <button type="button" className="btn-secondary" onClick={onToggleCamera}>
              {cameraActive ? 'Matikan Kamera' : 'Buka Kamera Belakang'}
            </button>
            <button type="button" className="btn-secondary" onClick={onTestIndonesianVoice}>
              Uji Suara ({ttsEnabled ? 'Aktif' : 'Mati'})
            </button>
            <button type="button" className="btn-secondary" onClick={onToggleFullscreen}>
              {isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Kiosk'}
            </button>
          </div>
        </section>

        {/* Web Bluetooth HX711 Scale Card */}
        <section className="diag-panel oneui-card" aria-labelledby="diag-ble-heading">
          <div className="diag-panel-head">
            <div>
              <span className="section-kicker">Timbangan Digital (ESP32 + HX711)</span>
              <h2 id="diag-ble-heading">Koneksi Timbangan Bluetooth</h2>
            </div>
            <span
              className={`diag-badge ${
                bleStatus === 'CONNECTED'
                  ? 'is-live'
                  : bleStatus === 'ERROR'
                    ? 'is-error'
                    : ''
              }`}
            >
              {formatBleStatusLabel(bleStatus)}
            </span>
          </div>

          <p className="diag-desc">{bleMessage}</p>

          <div className="diag-btn-row">
            {bleStatus === 'CONNECTED' ? (
              <button type="button" className="btn-secondary" onClick={onDisconnectBle}>
                Putuskan {bleDeviceName ?? 'Timbangan BLE'}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={bleStatus === 'CONNECTING'}
                onClick={onConnectBle}
              >
                {bleStatus === 'CONNECTING'
                  ? 'Memindai Perangkat...'
                  : 'Hubungkan Timbangan BLE'}
              </button>
            )}
            <span className="mono-note">
              Web Bluetooth: {bleSupported ? 'Tersedia' : 'Tidak tersedia'}
            </span>
          </div>

          <div className="ble-channel-grid tabular-nums">
            <div className="ble-channel-cell">
              <span className="section-kicker">Organik</span>
              <strong>{bleChannels.leftGrams} g</strong>
            </div>
            <div className="ble-channel-cell">
              <span className="section-kicker">Anorganik</span>
              <strong>{bleChannels.centerGrams} g</strong>
            </div>
            <div className="ble-channel-cell">
              <span className="section-kicker">Residu</span>
              <strong>{bleChannels.rightGrams} g</strong>
            </div>
          </div>

          <div className="diag-slider-block">
            <div className="field-label-row">
              <label htmlFor="diag-load-cell-slider" className="field-label">
                Kalibrasi Berat Default ({overrideWeightGrams} g)
              </label>
              <span className="mono-note">{formatSensorModeLabel(sensorMode)}</span>
            </div>
            <input
              ref={diagWeightSliderRef}
              id="diag-load-cell-slider"
              className="load-cell-slider"
              type="range"
              min={1}
              max={5000}
              step={5}
              value={overrideWeightGrams}
              aria-valuetext={`${overrideWeightGrams} gram`}
              onChange={(e) => onChangeManualWeight(Number(e.target.value))}
            />
          </div>

          <details className="tech-disclosure">
            <summary>Detail Spesifikasi GATT ESP32</summary>
            <div className="uuid-spec-box">
              <p>
                Service UUID: <code>{SORTA_BLE_SERVICE_UUID}</code>
              </p>
              <p>
                Characteristic: <code>{SORTA_BLE_WEIGHT_CHAR_UUID}</code>
              </p>
            </div>
          </details>
        </section>

        {/* Visual Recognition Engine & Data Maintenance Card */}
        <section className="diag-panel oneui-card" aria-labelledby="diag-vision-heading">
          <div className="diag-panel-head">
            <div>
              <span className="section-kicker">Pengenalan Material Kamera</span>
              <h2 id="diag-vision-heading">Koneksi Cloud Vision</h2>
            </div>
            <span className={`diag-badge ${geminiApiKey ? 'is-live' : ''}`}>
              {geminiApiKey ? 'Cloud Aktif' : 'Mode Lokal'}
            </span>
          </div>

          <form className="diag-form" onSubmit={handleSaveKey}>
            <label htmlFor="gemini-api-key-input" className="field-label">
              Kunci Layanan Pengenalan Gambar (Disimpan lokal di browser)
            </label>
            <div className="api-key-row">
              <input
                id="gemini-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyStatusMsg(null);
                }}
                placeholder="Opsional untuk pemindaian cloud..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn-secondary"
                aria-pressed={showKey}
                onClick={() => setShowKey((prev) => !prev)}
              >
                {showKey ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>

            <div className="diag-btn-row">
              <button type="submit" className="btn-primary">
                Simpan Kunci
              </button>
              <button
                type="button"
                className="btn-amber-sm"
                disabled={testingKey || !keyInput.trim()}
                onClick={handleVerifyKey}
              >
                {testingKey ? 'Menguji Koneksi...' : 'Uji Koneksi'}
              </button>
              {geminiApiKey && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setKeyInput('');
                    onChangeGeminiApiKey('');
                    setKeyStatusMsg({
                      ok: true,
                      text: 'Kunci dihapus. Kembali memakai pengenalan visual lokal.',
                    });
                  }}
                >
                  Hapus Kunci
                </button>
              )}
            </div>

            {keyStatusMsg && (
              <p
                className={keyStatusMsg.ok ? 'diag-status-ok' : 'form-error-text'}
                role="status"
              >
                {keyStatusMsg.text}
              </p>
            )}
          </form>

          <details className="tech-disclosure">
            <summary>Lihat Log Klasifikasi Terakhir (JSON)</summary>
            <pre
              tabIndex={0}
              role="region"
              aria-label="Inspeksi JSON hasil klasifikasi terakhir"
              className="json-pre"
            >
              <code>
                {lastClassification
                  ? JSON.stringify(lastClassification, null, 2)
                  : 'Belum ada pemindaian pada sesi ini.'}
              </code>
            </pre>
          </details>

          <div className="data-maintenance-box">
            <span className="section-kicker">Pemeliharaan Data Perangkat</span>
            {!confirmResetOpen ? (
              <button
                type="button"
                className="btn-secondary btn-reset-local"
                onClick={() => setConfirmResetOpen(true)}
              >
                Reset Data Bank Sampah Lokal
              </button>
            ) : (
              <div className="confirm-reset-row">
                <span>
                  Kembalikan seluruh data bank sampah, rumah warga, dan riwayat ke kondisi seed
                  awal?
                </span>
                <div className="diag-btn-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmResetOpen(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn-danger-solid"
                    onClick={() => {
                      onResetLocalData();
                      setConfirmResetOpen(false);
                    }}
                  >
                    Ya, Reset Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
