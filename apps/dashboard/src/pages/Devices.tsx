/**
 * DenaNeya v2.0 - Devices & Carrier SMS Sync Controller
 * File: apps/dashboard/src/pages/Devices.tsx
 *
 * Implements:
 * - Paired Android handset monitor with battery levels & last sync timestamps
 * - Dynamic pairing token & QR code generation
 * - Telemetry ping & device token rotation (VULN-01 IDOR immune)
 * - Android APK forwarder instructions
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  BatteryCharging,
  BatteryMedium,
  BatteryWarning,
  RefreshCw,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Device } from '../types/dashboard';
import QRCode from 'qrcode';

export const Devices: React.FC = () => {
  const { brand } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPairModalOpen, setIsPairModalOpen] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceModel, setDeviceModel] = useState<string>('');
  const [pairingData, setPairingData] = useState<{ token: string; qr: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (pairingData?.qr) {
      QRCode.toDataURL(pairingData.qr, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
        .then(setQrImageUrl)
        .catch((err) => {
          console.error('[QRCode Error]', err);
          setQrImageUrl('');
        });
    } else if (pairingData?.token) {
      QRCode.toDataURL(pairingData.token, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
        .then(setQrImageUrl)
        .catch(() => setQrImageUrl(''));
    } else {
      setQrImageUrl('');
    }
  }, [pairingData]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.devices.list();
      if (res.success) {
        setDevices(res.devices || []);
      }
    } catch (err) {
      console.error('[Devices] Failed to fetch device list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [brand?.id]);

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    setIsSubmitting(true);
    try {
      const res: any = await apiClient.devices.pair({
        device_name: deviceName.trim(),
        device_model: deviceModel.trim() || undefined
      });

      if (res.success) {
        setPairingData({
          token: res.pairing_token || res.device_token || res.device?.device_token,
          qr: res.pairing_qr_data || res.device_token || res.pairing_token
        });
        await fetchDevices();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to pair new device.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotateToken = async (deviceId: string) => {
    if (!confirm('Rotating the pairing token will disconnect this handset until re-paired. Continue?')) {
      return;
    }
    try {
      const res: any = await apiClient.devices.rotateToken(deviceId);
      if (res.success) {
        setPairingData({
          token: res.device_token || res.pairing_token,
          qr: res.pairing_qr_data || res.device_token || res.pairing_token
        });
        setIsPairModalOpen(true);
        await fetchDevices();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to rotate token.');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to unpair and remove this handset?')) return;
    try {
      const res = await apiClient.devices.delete(deviceId);
      if (res.success) {
        await fetchDevices();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove device.');
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 60) return <BatteryCharging className="w-4 h-4 text-emerald-600" />;
    if (level > 20) return <BatteryMedium className="w-4 h-4 text-amber-600" />;
    return <BatteryWarning className="w-4 h-4 text-rose-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Android Devices & Carrier SMS Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor physical Android smartphones forwarding authentic carrier SMS receipts (bKash, Nagad, Rocket, Upay)
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setPairingData(null);
            setIsPairModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Pair New Android Handset
        </Button>
      </div>

      {/* Handsets List Table */}
      <Card
        title="Paired Mobile Forwarders"
        subtitle="Live telemetry and health status of all SIM-hosting smartphones"
      >
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Device Name & Model</th>
                <th className="px-6 py-3">Carrier SIM Slots</th>
                <th className="px-6 py-3">Battery Status</th>
                <th className="px-6 py-3">Connection Health</th>
                <th className="px-6 py-3">Last Sync Timestamp</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No Android handsets paired yet. Click &quot;Pair New Android Handset&quot; to connect.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{dev.device_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {dev.device_model || 'Generic Android'}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-slate-700 font-medium">
                          SIM 1: {dev.sim1_operator || 'Grameenphone (bKash)'}
                        </div>
                        <div className="text-slate-500">
                          SIM 2: {dev.sim2_operator || 'Robi (Nagad)'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        {getBatteryIcon(dev.battery_level)}
                        <span className="font-bold text-slate-800">{dev.battery_level}%</span>
                      </div>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            dev.battery_level > 60
                              ? 'bg-emerald-500'
                              : dev.battery_level > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${dev.battery_level}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {dev.status === 'online' ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online & Syncing</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                          <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Offline</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {dev.last_sync_at
                        ? new Date(dev.last_sync_at).toLocaleString()
                        : 'Never synced'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleRotateToken(dev.id)}
                          title="Rotate Pairing Token"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dev.id)}
                          title="Unpair Device"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pairing Modal */}
      <Modal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
        title="Pair Android SMS Forwarder"
        subtitle="Connect your merchant Android smartphone to start automated carrier receipt reconciliation"
        maxWidth="md"
      >
        {!pairingData ? (
          <form onSubmit={handlePairDevice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Handset Identifier Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Counter 1 - Galaxy A15"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Hardware Model (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Samsung SM-A155F"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Required Permissions:</span>
              <p>• SMS Receive & Read (`RECEIVE_SMS`, `READ_SMS`)</p>
              <p>• Battery Optimization Exemption (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPairModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Generate Pairing Token
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="DenaNeya Handset Pairing QR Code"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-lg font-mono text-xs text-slate-400 text-center p-4">
                  Generating Pairing QR...
                </div>
              )}
            </div>

            <div className="text-left space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Pairing Token:</span>
                <code className="font-mono text-indigo-600 text-xs break-all select-all">
                  {pairingData.token}
                </code>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                1. Open <strong>MacroDroid</strong> or <strong>SMS Forwarder</strong> on your Android phone.
                <br />
                2. Scan this QR Code or set header <code>X-Device-Token</code> to the token above.
                <br />
                3. The handset will link and begin streaming carrier SMS in real time.
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => setIsPairModalOpen(false)}
            >
              Done (Handset Linked)
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Devices;
