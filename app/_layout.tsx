import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "../src/data/AppContext";
import { colors } from "../src/components/theme";

function RootStack() {
  const { ready } = useAppContext();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "LifeOS" }} />
        <Stack.Screen name="assistant" options={{ title: "Assistant" }} />
        <Stack.Screen name="camera" options={{ title: "Camera" }} />
        <Stack.Screen name="today" options={{ title: "Today" }} />
        <Stack.Screen name="planner" options={{ title: "Planner" }} />
        <Stack.Screen name="timeline" options={{ title: "Timeline" }} />
        <Stack.Screen name="focus" options={{ title: "Focus" }} />
        <Stack.Screen name="reports" options={{ title: "Reports" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
