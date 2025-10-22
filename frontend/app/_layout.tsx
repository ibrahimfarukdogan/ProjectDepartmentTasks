import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Slot } from "expo-router";
import { AuthProvider } from "@/context/authcontext";
import { StatusBar } from "expo-status-bar";
import Toast, { BaseToast } from "react-native-toast-message";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{ backgroundColor: "#000" }} // 👈 black background
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ color: "#fff" }} // 👈 white title text
        text2Style={{ color: "#ddd" }} // 👈 gray subtitle text (optional)
      />
    ),
    error: (props: any) => (
      <BaseToast
        {...props}
        style={{ backgroundColor: "#000" }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ color: "#fff" }}
        text2Style={{ color: "#ddd" }}
      />
    ),
    // Add more types as needed...
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Slot />
          <StatusBar style="auto" />
        </ThemeProvider>
        <Toast position="top" config={toastConfig} />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
