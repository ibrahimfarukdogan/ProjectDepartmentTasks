import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Text,
} from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/authcontext";

export default function UserDropdownMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const { logout } = useAuth();

  const toggleDropdown = () => {
    setIsVisible((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    setIsVisible(false);
    router.push(path);
  };

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  return (
    <View style={{ marginRight: 10 }}>
      <Pressable
        onPress={toggleDropdown}
        style={({ pressed }) => [
          styles.iconContainerWrapper,
          pressed && styles.iconPressed,
          isVisible && styles.iconToggled,
        ]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Open user menu"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={32} color="black" />
          <View style={styles.notificationIconWrapper}>
            <Ionicons name="notifications-outline" size={14} color="black" />
          </View>
        </View>
      </Pressable>

      {isVisible && (
        <Pressable
          onPress={() => setIsVisible(false)}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.dropdownWrapper}>
        <Animated.View
          style={[
            styles.dropdown,
            {
              transform: [{ scaleY: scaleAnim }],
              opacity: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Pressable
            style={styles.item}
            onPress={() => handleNavigate("/")}
            accessibilityRole="button"
            accessibilityLabel="Home"
          >
            <Ionicons name="home-outline" size={18} color="black" />
            <Text style={styles.label}>Ana Sayfa</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => handleNavigate("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Notification"
          >
            <Ionicons name="notifications-outline" size={18} color="black" />
            {/*<MaterialIcons name="notifications-active" size={14} color="red" />*/}
            <Text style={styles.label}>Bildirimler</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => handleNavigate("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Feather name="user" size={18} color="black" />
            <Text style={styles.label}>Profil</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => logout()}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <MaterialIcons name="logout" size={18} color="black" />
            <Text style={styles.label}>Çıkış yap</Text>
          </Pressable>

        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: "relative",
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationIconWrapper: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 2,
  },
  iconContainerWrapper: {
    borderRadius: 20,
    padding: 6,
  },
  iconToggled: {
    backgroundColor: "#e0e0e0",
  },
  iconPressed: {
    backgroundColor: "#ccccccff",
    transform: [{ scale: 0.8 }],
  },
  dropdownWrapper: {
    position: "absolute",
    top: 40,
    right: 0,
    overflow: "hidden",
    zIndex: 1000,
  },
  dropdown: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
});
