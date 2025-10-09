import { DepartmentWithType } from "@/types/departments";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";

type Props = {
  departments: DepartmentWithType[];
  selectedParentId: number;
  onSelectParent: (id: number) => void;
  newDeptName: string;
  onChangeDeptName: (name: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function CreateDepartmentForm({
  departments,
  selectedParentId,
  onSelectParent,
  newDeptName,
  onChangeDeptName,
  onSubmit,
  isLoading,
}: Props) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
        Yeni Departman Oluştur
      </Text>

      <TextInput
        placeholder="Departman adı"
        value={newDeptName}
        onChangeText={onChangeDeptName}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 12 }}
      />

      <Text style={{ marginBottom: 6 }}>Üst Departman (İsteğe Bağlı)</Text>
      <View style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 16 }}>
        <Picker selectedValue={selectedParentId} onValueChange={(val) => onSelectParent(Number(val))}>
          {departments.map((dept) => (
            <Picker.Item
              key={dept.id}
              label={`${dept.dept_name}${dept.isOwn ? " (Sizin)" : ""}`}
              value={dept.id}
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
