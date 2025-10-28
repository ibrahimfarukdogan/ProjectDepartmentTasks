// components/DepartmentEditModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Department } from "@/types/departments";
import { User } from "@/types/user";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  deptForm: {
    name: string;
    parentId: number | null;
    managerId: number | null;
  };
  setDeptForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      parentId: number | null;
      managerId: number | null;
    }>
  >;
  allDepartments: (Department & { isOwn?: boolean })[];
  users: User[];
  bottomSheetRef?: React.RefObject<BottomSheetMethods | null>;
};

export const DepartmentEditModal = ({
  visible,
  onClose,
  onSubmit,
  deptForm,
  setDeptForm,
  allDepartments,
  users,
  bottomSheetRef,
}: Props) => {
  const content = (
    <View style={{ padding: 16 }}>
      <Text style={styles.label}>Departman Adı</Text>
      <TextInput
        value={deptForm.name}
        onChangeText={(val) => setDeptForm((prev) => ({ ...prev, name: val }))}
        style={styles.input}
      />

      <Text style={styles.label}>Üst Departman</Text>
      <Picker
        selectedValue={deptForm.parentId}
        onValueChange={(val) =>
          setDeptForm((prev) => ({ ...prev, parentId: val }))
        }
        style={styles.pickerstyle}
      >
        <Picker.Item label="Üst departman seçin" value={null} />
        {allDepartments.map((dept) => (
          <Picker.Item
            key={dept.id}
            label={`${dept.dept_name}${dept.isOwn ? " (Sizin)" : ""}`}
            value={dept.id}
          />
        ))}
      </Picker>

      <Text style={styles.label}>Yönetici</Text>
      <Picker
        selectedValue={deptForm.managerId}
        onValueChange={(val) =>
          setDeptForm((prev) => ({ ...prev, managerId: val }))
        }
        style={styles.pickerstyle}
      >
        <Picker.Item label="Yönetici seçin" value={null} />
        {users.map((user) => (
          <Picker.Item
            key={user.id}
            label={`${user.name || ""} - ${user.role || ""}`}
            value={user.id}
          />
        ))}
      </Picker>

      <TouchableOpacity
        style={[styles.button, { marginTop: 10 }]}
        onPress={onSubmit}
      >
        <Text style={styles.buttonText}>Güncelle</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#777", marginTop: 8 }]}
        onPress={() => {
          if (Platform.OS === "web") onClose();
          else bottomSheetRef?.current?.close();
        }}
      >
        <Text style={styles.buttonText}>İptal</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>{content}</View>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={["55%"]}
      enablePanDownToClose
      onClose={onClose}
      onChange={(index) => {
        if (index === -1) onClose(); // ensures consistency
      }}
      backgroundStyle={{
        backgroundColor: "#242424",
      }}
    >
      <BottomSheetScrollView>{content}</BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 8,
    width: "80%",
  },
  label: {
    color: "#ccc",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#2b2b2b",
    color: "#fff",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  pickerstyle: {
    color: "#fff",
    backgroundColor: "#2b2b2b",
    borderRadius: 6,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
