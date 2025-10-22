import { Stack, useNavigation } from "expo-router";
import ProtectedRoute from "@/utils/ProtectedRoute";
import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserDropdownMenu from "@/components/UserDropdownMenu"; // 👈 import the new component

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerShown: true,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 22,
            color: "#ddd",
          },
          contentStyle: {
            backgroundColor: "#000", // background behind your screens
          },
          headerStyle: {
            backgroundColor: "#000", // ← dark background
          },
          headerTintColor: "#fff",      
          headerLeft: () => {
            const navigation = useNavigation();
            if (!navigation.canGoBack()) return null;
            return (
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  styles.iconWrapper,
                  pressed && styles.iconPressed,
                ]}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={32} color="#d4d4d4" />
              </Pressable>
            );
          },
          headerRight: () => <UserDropdownMenu />, // 👈 use it here
        }}
      />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    marginLeft: 8,
    height: 36,
    width: 36,
    paddingEnd: 2,
    borderRadius: 30,
    backgroundColor: "#1f1f1f", // darker background
    borderColor: "#333", // subtle dark border
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressed: {
    backgroundColor: "#333333",
    transform: [{ scale: 0.9 }],
  },
});
