import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api';
import { SOCKET_URL } from '../config/env';

const SettingsContext = createContext(null);
const socketOptions = {
  transports: ['websocket'],
  reconnectionAttempts: 5,
  timeout: 10000,
};

const defaultSettings = {
  maintenanceMode: false,
  platformFee: 500,
  platformFeePercentage: 5,
  commissionPercent: 0,
  allowNewSignups: true,
  supportEmail: 'support@roomradar.in',
  verificationRequired: true,
  autoPublishVerifiedLandlords: false,
  bookingRequestExpiryHours: 24,
  payoutHoldHoursAfterCheckIn: 24,
  disputeWindowHoursAfterCheckIn: 72,
  escrowEnabled: true,
  offlinePaymentAllowed: true,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings({ ...defaultSettings, ...(data || {}) });
      return data;
    } catch (error) {
      setSettings(defaultSettings);
      return defaultSettings;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, socketOptions);

    socket.on('platform_settings_updated', (nextSettings) => {
      setSettings({ ...defaultSettings, ...(nextSettings || {}) });
      if (nextSettings?.maintenanceMode) {
        toast('RoomRadar is now in maintenance mode.', { icon: '!' });
      } else {
        toast.success('RoomRadar is back online.');
      }
    });

    return () => socket.disconnect();
  }, []);

  const updateSettings = async (patch) => {
    const previous = settings;
    const optimistic = { ...settings, ...patch };
    setSettings(optimistic);

    try {
      const { data } = await api.patch('/admin/settings', patch);
      setSettings({ ...defaultSettings, ...(data || {}) });
      return data;
    } catch (error) {
      setSettings(previous);
      throw error;
    }
  };

  const value = useMemo(() => ({
    settings,
    loading,
    setSettings,
    refreshSettings,
    updateSettings,
  }), [settings, loading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
