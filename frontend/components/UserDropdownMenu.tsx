import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Modal,
  UIManager,
  findNodeHandle,
  Platform,
} from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/authcontext";

export default function UserDropdownMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const [dropdownTop, setDropdownTop] = useState(0);
  const buttonRef = useRef(null);
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const toggleDropdown = () => {
    if (isVisible) {
      setIsVisible(false);
    } else {
      if(Platform.OS === "web")
      setDropdownTop(buttonLayout.y + buttonLayout.height);
    else
      setDropdownTop(buttonLayout.y + buttonLayout.height+50);
      setIsVisible(true);
    }
  };

  const handleNavigate = (path: "/" | "/notifications" | "/profile") => {
    setIsVisible(false);
    router.push(path);
  };

  return (
    <View style={{ marginRight: 10 }}>
      <Pressable
        onLayout={(event) => {
          setButtonLayout(event.nativeEvent.layout);
        }}
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
          <Ionicons name="person-circle-outline" size={32} color="#ddd" />
          <View style={styles.notificationIconWrapper}>
            <Ionicons name="notifications-outline" size={14} color="#ddd" />
          </View>
        </View>
      </Pressable>

      {/* Modal Dropdown */}
      <Modal visible={isVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <View
            style={{
              position: "absolute",
              top: dropdownTop,
              right: 10,
            }}
          >
            <View style={styles.dropdown}>
              <Pressable
                style={styles.item}
                onPress={() => handleNavigate("/")}
              >
                <Ionicons name="home-outline" size={18} color="#ddd" />
                <Text style={styles.label}>Ana Sayfa</Text>
              </Pressable>

              <Pressable
                style={styles.item}
                onPress={() => handleNavigate("/notifications")}
              >
                <Ionicons name="notifications-outline" size={18} color="#ddd" />
                <Text style={styles.label}>Bildirimler</Text>
              </Pressable>

              <Pressable
                style={styles.item}
                onPress={() => handleNavigate("/profile")}
              >
                <Feather name="user" size={18} color="#ddd" />
                <Text style={styles.label}>Profil</Text>
              </Pressable>

              <Pressable style={styles.item} onPress={logout}>
                <MaterialIcons name="logout" size={18} color="#ddd" />
                <Text style={styles.label}>Çıkış yap</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
    backgroundColor: "#222",
    borderRadius: 10,
    padding: 2,
  },
  iconContainerWrapper: {
    borderRadius: 20,
    padding: 6,
  },
  iconPressed: {
    backgroundColor: "#444",
    transform: [{ scale: 0.9 }],
  },
  iconToggled: {
    backgroundColor: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent", // Keeps it fully clear
  },
  dropdown: {
    backgroundColor: "#1e1e1e",
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
    color: "#ddd",
  },
});
