// components/UserDetailForm.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { User, UserFormData } from "@/types/user";
import { Picker } from "@react-native-picker/picker";
import { RoleWithPermissions } from "@/types/roles";

const stringFields: (keyof UserFormData)[] = [
  "name",
  "mail",
  "role_id",
  "adress",
  "phone",
];
const userDisplayFields: (keyof User)[] = [
  "name",
  "mail",
  "role",
  "adress",
  "phone",
];

type Mode = "view" | "edit" | "create";

type Props = {
  mode: Mode;
  user?: User | null;
  onSubmit: (updatedUser: UserFormData) => void;
  onRemove?: () => void;
  onDelete?: () => void;
  isLoading: boolean;
  isManager?: boolean;
  roles?: RoleWithPermissions[]; // 🔥 New
};

export const UserDetailForm = ({
  mode,
  user,
  onSubmit,
  onRemove,
  onDelete,
  isLoading,
  isManager = false,
  roles,
}: Props) => {
  const isEditOrCreate = mode !== "view";

  const [form, setForm] = useState<UserFormData>({
    name: "",
    mail: "",
    role_id: null,
    adress: "",
    phone: "",
    password: "", // only for creation
  });

  useEffect(() => {
    if (user && mode !== "create") {
      setForm({
        name: user.name || "",
        mail: user.mail,
        role_id: user.role_id || null,
        adress: user.adress || "",
        phone: user.phone || "",
      });
    } else if (mode === "create") {
      setForm({
        name: "",
        mail: "",
        role_id: null,
        adress: "",
        phone: "",
        password: "",
      });
    }
  }, [user, mode]);

  const handleChange = <K extends keyof UserFormData>(
    key: K,
    value: UserFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container}>
      {isEditOrCreate
        ? stringFields.map((field) => (
            <View key={field} style={styles.field}>
              <Text style={styles.label}>
                {field === "name" && "İsim"}
                {field === "mail" && "Mail"}
                {field === "role_id" && "Roller"}
                {field === "adress" && "Adres"}
                {field === "phone" && "Telefon"}
              </Text>
              {field === "role_id" ? (
                <View style={styles.pickerWrapper}>
                  {roles && roles.length > 0 ? (
                    <Picker
                      selectedValue={form.role_id}
                      onValueChange={(val) =>
                        handleChange("role_id", Number(val))
                      }
                      style={styles.pickerStyle}
                      enabled={true}
                    >
                      {roles.map((role) => {
                        const label =
                          `${role.role_name}: ` +
                          role.permissions
                            .map(
                              (perm) =>
                                `${perm.category.slice(0, 1)}: ${perm.level}`
                            )
                            .join(", ");

                        return (
                          <Picker.Item
                            key={role.id}
                            label={label}
                            value={role.id}
                          />
                        );
                      })}
                    </Picker>
                  ) : (
                    <Picker
                      selectedValue={form.role_id ?? null}
                      enabled={false}
                      style={styles.pickerStyle}
                    >
                      <Picker.Item label="Roller yüklenemedi" value={null} />
                    </Picker>
                  )}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={form[field] ?? ""}
                  onChangeText={(val) => handleChange(field, val)}
                  editable
                />
              )}
            </View>
          ))
        : userDisplayFields.map((field) => (
            <View key={field} style={styles.field}>
              <Text style={styles.label}>{field.toUpperCase()}</Text>
              <Text style={styles.label}>
                {field === "name" && "İsim"}
                {field === "mail" && "Mail"}
                {field === "adress" && "Adres"}
                {field === "phone" && "Telefon"}
              </Text>
              <Text style={styles.value}>
                {typeof user?.[field] === "string" ||
                typeof user?.[field] === "number"
                  ? String(user?.[field])
                  : "-"}
              </Text>
            </View>
          ))}

      {mode === "create" && (
        <View style={styles.field}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={(val) => handleChange("password", val)}
            secureTextEntry
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabled]}
        disabled={isLoading}
        onPress={() => onSubmit(form)}
      >
        <Text style={styles.buttonText}>
          {isLoading
            ? "Kaydediliyor..."
            : mode === "create"
            ? "Oluştur"
            : "Kaydet"}
        </Text>
      </TouchableOpacity>

      {mode === "edit" && (
        <View style={styles.actionsRow}>
          {onRemove && (
            <TouchableOpacity onPress={onRemove} disabled={isManager}>
              <Text style={[styles.removeText, isManager && { opacity: 0.5 }]}>
                {isManager ? "Yönetici kaldırılamaz" : "Üyelikten çıkar"}
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} disabled={isManager}>
              <Text
                style={[
                  styles.deleteText,
                  isManager && { opacity: 0.5 }, // visually indicate it's disabled
                ]}
              >
                {isManager ? "Yönetici silinemez" : "Tamamen sil"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: "#ccc",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#2b2b2b",
    padding: 10,
    borderRadius: 6,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#444",
  },
  pickerWrapper: {
    backgroundColor: "#2b2b2b",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#444",
    overflow: "hidden",
  },
  pickerStyle: {
    color: "#000",
  },
  value: {
    color: "#fff",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  disabled: {
    opacity: 0.6,
  },
  actionsRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  removeText: {
    color: "#FFA500",
    fontWeight: "bold",
  },
  deleteText: {
    color: "#FF4D4D",
    fontWeight: "bold",
  },
});
