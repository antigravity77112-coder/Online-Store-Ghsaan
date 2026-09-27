import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import i18n from '../i18n';
import { applyDocumentDirection, normalizeLocale, persistLocale } from '../i18n/localeUtils';

const AuthContext = createContext(null);

function applyLanguageFromAuth(preferredLanguage) {
  const lng = normalizeLocale(preferredLanguage || i18n.language);
  i18n.changeLanguage(lng);
  applyDocumentDirection(lng);
  persistLocale(lng);
}

function mapUser(profile) {
  return {
    id: profile.id,
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber,
    email: profile.email,
    city: profile.city,
    address: profile.address,
    locationUrl: profile.locationUrl,
    role: profile.role,
    preferredLanguage: profile.preferredLanguage || 'ar',
  };
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      const mapped = mapUser(profile);
      setUser(mapped);
      applyLanguageFromAuth(mapped.preferredLanguage);
    } catch (err) {
      // Only log the user out on explicit authentication failures (401/403).
      // Network errors, 500s, or Prisma errors must NOT clear a valid session.
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
      }
      // For any other error, keep existing user state intact.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback(async (phoneNumber, password) => {
    const result = await api.login(phoneNumber, password);
    const mapped = {
      id: result.userId,
      fullName: result.fullName,
      email: result.email,
      role: result.role,
      city: result.city,
      address: result.address,
      locationUrl: result.locationUrl,
      preferredLanguage: result.preferredLanguage || 'ar',
    };
    setUser(mapped);
    applyLanguageFromAuth(mapped.preferredLanguage);
    localStorage.setItem('user_name', result.fullName);
    localStorage.setItem('user_id', result.userId);
    return result;
  }, []);

  const register = useCallback(async (data) => {
    const result = await api.register(data);
    const mapped = {
      id: result.userId,
      fullName: result.fullName,
      email: result.email,
      role: result.role,
      city: result.city,
      address: result.address,
      locationUrl: result.locationUrl,
      preferredLanguage: result.preferredLanguage || data.preferredLanguage || 'ar',
    };
    setUser(mapped);
    applyLanguageFromAuth(mapped.preferredLanguage);
    localStorage.setItem('user_name', result.fullName);
    localStorage.setItem('user_id', result.userId);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout failed on server', e);
    }
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async (password, confirmation) => {
    await api.deleteAccount(password, confirmation);
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    setUser(null);
  }, []);

  const isAuthenticated = !!user;
  const isBuyer = user?.role === 'Buyer' || user?.role === 'Admin';
  const isAdmin = user?.role === 'Admin';

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      deleteAccount,
      isAuthenticated,
      isBuyer,
      isAdmin,
      checkAuthStatus,
    }),
    [user, loading, login, register, logout, deleteAccount, isAuthenticated, isBuyer, isAdmin, checkAuthStatus],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
