// components/UserDetailModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { UserDetailForm } from "../utils/UserDetailForm";
import { User, UserFormData } from "@/types/user";
import { RoleWithPermissions } from "@/types/roles";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";

type Mode = "view" | "edit" | "create";

type Props = {
  visible: boolean;
  mode: Mode;
  user?: User | null;
  onClose: () => void;
  onSubmit: (form: UserFormData) => void;
  onRemove?: () => void;
  onDelete?: () => void;
  isLoading: boolean;
  isManager?: boolean;
  roles?: RoleWithPermissions[];
  bottomSheetRef?: React.RefObject<BottomSheetMethods | null>; // Optional for controlling BottomSheet externally
};

export const UserDetailModal = ({
  visible,
  mode,
  user,
  onClose,
  onSubmit,
  onRemove,
  onDelete,
  isLoading,
  isManager = false,
  roles,
  bottomSheetRef,
}: Props) => {
  const isWeb = Platform.OS === "web";

  // For BottomSheet, control visibility by snapping index
  // We'll handle this outside in the parent using bottomSheetRef if passed

  if (isWeb) {
    // Modal for web
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.webOverlay}>
          <View style={styles.webContent}>
            <UserDetailForm
              mode={mode}
              user={user}
              onSubmit={onSubmit}
              onRemove={onRemove}
              onDelete={onDelete}
              isLoading={isLoading}
              isManager={isManager}
              roles={roles}
            />
            <TouchableOpacity onPress={onClose} style={styles.webCloseButton}>
              <Text style={styles.webCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // BottomSheet for mobile
  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={["70%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{
        backgroundColor: "#242424",
      }}
      onChange={(index) => {
        if (index === -1) onClose(); // ensures consistency
      }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        <UserDetailForm
          mode={mode}
          user={user}
          onSubmit={onSubmit}
          onRemove={onRemove}
          onDelete={onDelete}
          isLoading={isLoading}
          isManager={isManager}
          roles={roles}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  webContent: {
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    padding: 16,
  },
  webCloseButton: {
    marginTop: 10,
  },
  webCloseText: {
    color: "#ccc",
    textAlign: "center",
  },
});
