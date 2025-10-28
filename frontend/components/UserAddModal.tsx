// components/AddUserModal.tsx
import React from "react";
import { View, Text, TouchableOpacity, Platform, Modal } from "react-native";
import { Picker } from "@react-native-picker/picker";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { UserList } from "@/types/user";

export const AddUserModal = ({
  visible,
  onClose,
  onAdd,
  users,
  selectedUserId,
  setSelectedUserId,
  bottomSheetRef,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: () => Promise<void>;
  users: UserList[];
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  bottomSheetRef?: React.RefObject<any>;
}) => {
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000000AA",
          }}
        >
          <View
            style={{
              backgroundColor: "#222",
              padding: 20,
              borderRadius: 10,
              width: 300,
            }}
          >
            <Text style={{ color: "#fff", marginBottom: 10 }}>
              Kullanıcı Seç
            </Text>
            <Picker
              selectedValue={selectedUserId}
              onValueChange={(val) => setSelectedUserId(val as number | null)}
            >
              <Picker.Item label="Kullanıcı seçin" value={null} />
              {users.map((user) => (
                <Picker.Item
                  key={user.id}
                  label={`${user.name} - ${user.role}`}
                  value={user.id}
                />
              ))}
            </Picker>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <TouchableOpacity onPress={onAdd}>
                <Text style={{ color: "#0af" }}>Ekle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: "#aaa" }}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["40%"]}
      enablePanDownToClose
      onClose={onClose}
      onChange={(index) => {
        if (index === -1) onClose(); // ensures consistency
      }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "#fff", marginBottom: 10 }}>Kullanıcı Seç</Text>
        <Picker
          selectedValue={selectedUserId}
          onValueChange={(val) => setSelectedUserId(val as number | null)}
        >
          <Picker.Item label="Kullanıcı seçin" value={null} />
          {users.map((user) => (
            <Picker.Item
              key={user.id}
              label={`${user.name} - ${user.role}`}
              value={user.id}
            />
          ))}
        </Picker>

        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: "#007BFF",
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
          onPress={onAdd}
        >
          <Text style={{ color: "#fff" }}>Ekle</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};
