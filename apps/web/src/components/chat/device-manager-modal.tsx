"use client";

import * as React from "react";
import { Laptop, Smartphone, Globe, Shield, Trash2, Key, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";

interface DeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeviceItem {
  id: string;
  deviceName: string;
  deviceType: string;
  identityPublicKey: string;
  lastSeenAt: string;
  isRevoked: boolean;
  isCurrentDevice: boolean;
  createdAt: string;
}

export function DeviceManagerModal({ isOpen, onClose }: DeviceManagerModalProps) {
  const { device: currentDevice, demoMode } = useAuthStore();
  const [devices, setDevices] = React.useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const fetchDevices = React.useCallback(async () => {
    if (demoMode) {
      setDevices([
        {
          id: currentDevice?.id || "demo-device-alice-1",
          deviceName: currentDevice?.deviceName || "Current MacBook Pro",
          deviceType: "DESKTOP",
          identityPublicKey: currentDevice?.identityPublicKey || "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...",
          lastSeenAt: new Date().toISOString(),
          isRevoked: false,
          isCurrentDevice: true,
          createdAt: "2026-01-15T10:00:00.000Z",
        },
        {
          id: "demo-device-alice-phone",
          deviceName: "Alice iPhone 16",
          deviceType: "MOBILE",
          identityPublicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgBE...",
          lastSeenAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          isRevoked: false,
          isCurrentDevice: false,
          createdAt: "2026-02-01T14:20:00.000Z",
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch<{ devices: DeviceItem[] }>("/api/devices");
      setDevices(res.devices);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [demoMode, currentDevice]);

  React.useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen, fetchDevices]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this device? It will lose access to all future encrypted communications.")) {
      return;
    }

    setRevokingId(id);
    try {
      if (demoMode) {
        setDevices((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isRevoked: true } : d))
        );
        return;
      }

      await apiFetch(`/api/devices/${id}/revoke`, { method: "POST" });
      await fetchDevices();
    } finally {
      setRevokingId(null);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "MOBILE":
        return <Smartphone className="h-4 w-4" />;
      case "DESKTOP":
        return <Laptop className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Registered Devices & Key Management"
      description="Inspect active cryptographic endpoints and revoke untrusted devices."
    >
      <div className="space-y-4">
        {/* Device List */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {isLoading && (
            <p className="text-center py-4 text-xs text-muted-foreground">Loading registered devices...</p>
          )}

          {!isLoading && devices.length === 0 && (
            <p className="text-center py-4 text-xs text-muted-foreground">No devices registered.</p>
          )}

          {devices.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border p-3 transition-colors ${
                d.isRevoked
                  ? "border-destructive/30 bg-destructive/5 opacity-60"
                  : d.isCurrentDevice
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="rounded-lg bg-secondary p-2 text-foreground">
                    {getDeviceIcon(d.deviceType)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-foreground">{d.deviceName}</h4>
                      {d.isCurrentDevice && <Badge variant="default">This Device</Badge>}
                      {d.isRevoked && <Badge variant="destructive">Revoked</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Last seen: {formatDate(d.lastSeenAt)} • Registered: {formatDate(d.createdAt)}
                    </p>
                  </div>
                </div>

                {!d.isCurrentDevice && !d.isRevoked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(d.id)}
                    isLoading={revokingId === d.id}
                    className="text-destructive hover:bg-destructive/20 h-8 w-8"
                    title="Revoke device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Public Key Display */}
              <div className="mt-2.5 rounded-lg bg-navy-950 p-2 border border-border/40 font-mono text-[10px] text-muted-foreground break-all flex items-center justify-between">
                <span className="truncate max-w-[340px]">
                  ECDSA SPKI: {d.identityPublicKey.slice(0, 32)}...
                </span>
                <Key className="h-3 w-3 text-primary shrink-0 ml-1" />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-navy-900 border border-border/60 p-3 text-xs text-muted-foreground flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p>
            Revoking a device immediately invalidates its sessions and public keys on the server.
            The revoked device will be permanently excluded from receiving newly wrapped group keys.
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
