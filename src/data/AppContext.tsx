import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { initializeDatabase, resetDatabase } from "../db/client";
import { getPreference, setPreference } from "../db/repository";

interface AppContextValue {
  ready: boolean;
  darkMode: boolean;
  privacyLock: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  setPrivacyLock: (value: boolean) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [darkMode, setDarkModeState] = useState(true);
  const [privacyLock, setPrivacyLockState] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    initializeDatabase()
      .then(async () => {
        const [theme, lock] = await Promise.all([getPreference("darkMode", "true"), getPreference("privacyLock", "false")]);
        if (!mounted) return;
        setDarkModeState(theme !== "false");
        setPrivacyLockState(lock === "true");
      })
      .catch((error) => Alert.alert("LifeOS could not open local storage", error.message))
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const setDarkMode = useCallback(async (value: boolean) => {
    setDarkModeState(value);
    await setPreference("darkMode", String(value));
  }, []);

  const setPrivacyLock = useCallback(async (value: boolean) => {
    setPrivacyLockState(value);
    await setPreference("privacyLock", String(value));
  }, []);

  const resetAllData = useCallback(async () => {
    await resetDatabase();
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith("lifeos:")));
    router.replace("/");
  }, [router]);

  const value = useMemo(
    () => ({ ready, darkMode, privacyLock, setDarkMode, setPrivacyLock, resetAllData }),
    [ready, darkMode, privacyLock, setDarkMode, setPrivacyLock, resetAllData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used inside AppProvider.");
  return context;
}
