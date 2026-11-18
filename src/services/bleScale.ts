import type { BleChannelWeights, BleConnectionStatus } from '../types/sorta';

export const SORTA_BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const SORTA_BLE_WEIGHT_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
export const STANDARD_WEIGHT_SCALE_SERVICE = 0x181d;

interface BluetoothGattCharacteristicLike extends EventTarget {
  startNotifications(): Promise<BluetoothGattCharacteristicLike>;
  value?: DataView;
}

interface BluetoothDeviceLike extends EventTarget {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{
      getPrimaryService(uuid: string | number): Promise<{
        getCharacteristic(uuid: string | number): Promise<BluetoothGattCharacteristicLike>;
      }>;
    }>;
    disconnect(): void;
  };
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ services?: Array<string | number>; namePrefix?: string }>;
      acceptAllDevices?: boolean;
      optionalServices?: Array<string | number>;
    }): Promise<BluetoothDeviceLike>;
  };
}

export function isWebBluetoothSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'bluetooth' in navigator;
}

function parseBleWeightPayload(dataView: DataView): BleChannelWeights | null {
  try {
    const text = new TextDecoder().decode(dataView.buffer).trim();
    if (text.startsWith('{')) {
      const json = JSON.parse(text) as {
        left_g?: number;
        center_g?: number;
        right_g?: number;
        weight_g?: number;
      };
      const left = Math.max(0, Math.round(json.left_g ?? 0));
      const center = Math.max(0, Math.round(json.center_g ?? 0));
      const right = Math.max(0, Math.round(json.right_g ?? 0));
      const active = Math.max(0, Math.round(json.weight_g ?? Math.max(left, center, right)));
      return { leftGrams: left, centerGrams: center, rightGrams: right, activeGrams: active };
    }
    const numeric = Number(text.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(numeric) && text.length > 0) {
      const g = Math.round(numeric);
      return { leftGrams: 0, centerGrams: g, rightGrams: 0, activeGrams: g };
    }
  } catch {
    // Fallback to raw little-endian 16-bit integer payload if ESP32 sends binary grams
  }

  if (dataView.byteLength >= 2) {
    const grams = dataView.getUint16(0, true);
    return { leftGrams: 0, centerGrams: grams, rightGrams: 0, activeGrams: grams };
  }
  return null;
}

export interface BleScaleSession {
  deviceName: string;
  disconnect: () => void;
}

export async function connectEsp32BleScale(callbacks: {
  onStatus: (status: BleConnectionStatus, message: string) => void;
  onWeight: (weights: BleChannelWeights) => void;
}): Promise<BleScaleSession | null> {
  if (!isWebBluetoothSupported()) {
    callbacks.onStatus(
      'UNSUPPORTED',
      'Web Bluetooth tidak didukung browser ini. Masukkan berat timbangan secara manual.',
    );
    return null;
  }

  const bt = (navigator as NavigatorWithBluetooth).bluetooth;
  if (!bt) return null;

  callbacks.onStatus('CONNECTING', 'Memindai perangkat ESP32 Load Cell HX711...');

  try {
    const device = await bt.requestDevice({
      filters: [
        { services: [SORTA_BLE_SERVICE_UUID] },
        { services: [STANDARD_WEIGHT_SCALE_SERVICE] },
        { namePrefix: 'SORTA' },
        { namePrefix: 'ESP32' },
      ],
      optionalServices: [SORTA_BLE_SERVICE_UUID, STANDARD_WEIGHT_SCALE_SERVICE],
    });

    if (!device.gatt) {
      throw new Error('GATT server tidak tersedia pada perangkat.');
    }

    const server = await device.gatt.connect();
    let characteristic: BluetoothGattCharacteristicLike | null = null;

    try {
      const service = await server.getPrimaryService(SORTA_BLE_SERVICE_UUID);
      characteristic = await service.getCharacteristic(SORTA_BLE_WEIGHT_CHAR_UUID);
    } catch {
      const stdService = await server.getPrimaryService(STANDARD_WEIGHT_SCALE_SERVICE);
      characteristic = await stdService.getCharacteristic(0x2a9d);
    }

    const handleValue = (event: Event) => {
      const target = event.target as BluetoothGattCharacteristicLike;
      if (!target.value) return;
      const parsed = parseBleWeightPayload(target.value);
      if (parsed) {
        callbacks.onWeight(parsed);
      }
    };

    characteristic.addEventListener('characteristicvaluechanged', handleValue);
    await characteristic.startNotifications();

    const onDisconnect = () => {
      callbacks.onStatus('DISCONNECTED', 'Koneksi timbangan BLE terputus. Beralih ke input timbangan manual.');
    };
    device.addEventListener('gattserverdisconnected', onDisconnect);

    const deviceName = device.name || 'SORTA-ESP32-HX711';
    callbacks.onStatus('CONNECTED', `Terhubung ke ${deviceName}`);

    return {
      deviceName,
      disconnect: () => {
        device.removeEventListener('gattserverdisconnected', onDisconnect);
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
        callbacks.onStatus('DISCONNECTED', 'Timbangan BLE diputuskan secara manual.');
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pairing dibatalkan';
    callbacks.onStatus('ERROR', `Gagal pairing BLE (${msg}). Input timbangan manual tetap aktif.`);
    return null;
  }
}
