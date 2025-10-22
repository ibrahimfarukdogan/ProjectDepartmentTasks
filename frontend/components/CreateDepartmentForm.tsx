import { DepartmentWithType } from "@/types/departments";
import { UserList } from "@/types/user";
import { Picker } from "@react-native-picker/picker";
import { View, Text, TouchableOpacity, TextInput } from "react-native";

type Props = {
  departments: DepartmentWithType[];
  selectedParentId: number;
  onSelectParent: (id: number) => void;
  newDeptName: string;
  onChangeDeptName: (name: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  visibleUsers: UserList[];
  selectedManagerId: number;
  onSelectManager: (id: number) => void;
  canSelectManager: boolean;
};

export function CreateDepartmentForm({
  departments,
  selectedParentId,
  onSelectParent,
  newDeptName,
  onChangeDeptName,
  onSubmit,
  isLoading,
  visibleUsers,
  selectedManagerId,
  onSelectManager,
  canSelectManager,
}: Props) {
  return (
    <View style={{ padding: 16 }}>
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 16,
          marginBottom: 8,
          color: "#ddd",
        }}
      >
        Yeni Departman Oluştur
      </Text>

      <TextInput
        placeholder="Departman adı"
        value={newDeptName}
        onChangeText={onChangeDeptName}
        placeholderTextColor={"#ddd"}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          color: "#ddd",
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      <Text style={{ marginBottom: 6, color: "#ddd" }}>
        Üst Departman (İsteğe Bağlı)
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 5,
          marginBottom: 16,
        }}
      >
        <Picker
          selectedValue={selectedParentId}
          onValueChange={(val) => onSelectParent(Number(val))}
        >
          {departments.map((dept) => (
            <Picker.Item
              key={dept.id}
              label={`${dept.dept_name}${dept.isOwn ? " (Sizin)" : ""}`}
              value={dept.id}
            />
          ))}
        </Picker>
      </View>

      <Text style={{ marginBottom: 6, color: "#ddd" }}>Yönetici</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 5,
          marginBottom: 16,
        }}
      >
        <Picker
          selectedValue={selectedManagerId}
          onValueChange={(val) => onSelectManager(Number(val))}
          enabled={canSelectManager}
        >
          {visibleUsers.map((user) => (
            <Picker.Item
              key={user.id}
              label={`${user.name ?? "Bilinmeyen"} - ${user.role.role_name}`}
              value={user.id}
            />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: isLoading ? "#aaa" : "#007BFF",
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
        onPress={onSubmit}
        disabled={isLoading || selectedParentId === 0}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {isLoading ? "Oluşturuluyor..." : "Oluştur"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
