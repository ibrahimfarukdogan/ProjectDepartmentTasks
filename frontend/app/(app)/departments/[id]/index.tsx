import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../context/authcontext";
import {
  getDepartment,
  fetchUserStats,
  getUsersForDepartment,
  removeUserFromDepartment,
  deleteUser,
  updateUser,
  createUser,
  getAllUsers,
  addUserInDepartment,
  getUserDepartments,
  updateDepartment,
  deleteDepartment,
  getRoles,
} from "../../../../services/api";
import {
  User,
  UserFormData,
  UserList,
  UserTaskStatsResponse,
} from "@/types/user";
import { Department, DepartmentWithType } from "@/types/departments";
import { RoleWithPermissions } from "@/types/roles";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { UserDetailForm } from "@/utils/UserDetailForm";
import { NoPermission } from "@/components/NoPermission";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import { normalize, showToast } from "@/utils/utils";
import { UserDetailModal } from "@/components/UserDetailModal";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { UserStatsView } from "@/components/DepartmentUserItem";
import { DepartmentEditModal } from "@/components/DepartmentEditModal";
import { AddUserModal } from "@/components/UserAddModal";

export default function DepartmentDetail() {
  const { id } = useLocalSearchParams();
  const deptId = parseInt(id as string, 10);
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [department, setDepartment] = useState<Department | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  // Map userId -> stats or “loading”
  const [userStatsMap, setUserStatsMap] = useState<
    Record<number, UserTaskStatsResponse | "loading" | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isWeb = Platform.OS === "web";
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const userBottomSheetRef = useRef<BottomSheetMethods>(null);
  const deptBottomSheetRef = useRef<BottomSheetMethods>(null);
  const addUserBottomSheetRef = useRef<BottomSheetMethods>(null);
  const [formMode, setFormMode] = useState<"view" | "edit" | "create">("view");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddUserVisible, setIsAddUserVisible] = useState(false);
  const [allUsers, setAllUsers] = useState<UserList[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<number | null>(
    null
  );
  const [subDepartmentCount, setSubDepartmentCount] = useState<number | null>(
    null
  );
  const [isEditDeptVisible, setIsEditDeptVisible] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: "",
    parentId: null as number | null,
    managerId: null as number | null,
  });
  const [allDepartments, setAllDepartments] = useState<DepartmentWithType[]>(
    []
  );
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const query = normalize(searchQuery);
    return users.filter((user) => normalize(user.name).includes(query));
  }, [users, searchQuery]);

  const fetchDetail = async () => {
    if (isNaN(deptId)) {
      setError("Invalid department ID");
      setLoading(false);
      return;
    }
    if (!hasPermission("Departments", 1)) {
      setError("Departman görüntüleme yetkiniz yoktur.");
      setLoading(false);
      return;
    }

    try {
      const dept = await getDepartment(deptId);
      if (!dept) throw new Error("Departman verisi bulunamadı.");
      if (!dept.department) throw new Error("Departman içeriği bulunamadı.");
      setDepartment(dept.department);
      setSubDepartmentCount(dept.subDepartmentCount ?? null);

      if (hasPermission("Users", 1)) {
        const userList = await getUsersForDepartment(deptId); // ✅ Replaces: dept.members
        // Sort so manager appears at top
        const sortedUsers = userList.sort((a, b) => {
          if (a.id === dept.department.manager_id) return -1;
          if (b.id === dept.department.manager_id) return 1;
          return 0;
        });
        setUsers(sortedUsers);
        if (hasPermission("Tasks", 3)) {
          const loadingMap: Record<number, "loading"> = {};
          userList.forEach((user) => {
            loadingMap[user.id] = "loading";
          });
          setUserStatsMap(loadingMap);

          for (const user of userList) {
            const rawStats = await fetchUserStats(user.id);

            const stats: UserTaskStatsResponse = {
              userId: user.id,
              stats: rawStats?.stats ?? {
                open: 0,
                inprogress: 0,
                done: 0,
                approved: 0,
                cancelled: 0,
                late: 0,
                not_started: 0,
              },
            };

            setUserStatsMap((prev) => ({
              ...prev,
              [user.id]: stats,
            }));
          }
        }
      }
      if (hasPermission("Departments", 4)) {
        const allUsersList = await getAllUsers(deptId);
        setAllUsers(allUsersList);
      }
    } catch (err) {
      setError((err as any)?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getRoles(); // 👈 returns roles with permissions
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [deptId]);

  useEffect(() => {
    if (hasPermission("Roles", 1)) fetchRoles();
  }, []);

  const handleEditDepartment = async () => {
    setDeptForm({
      name: department?.dept_name || "",
      parentId: department?.parent?.id || null,
      managerId: department?.manager_id || null,
    });

    const data = await getUserDepartments();
    const own = (data.ownDepartments || []).map((d: any) => ({
      ...d,
      isOwn: true,
    }));
    const sub = (data.subDepartments || []).map((d: any) => ({
      ...d,
      isOwn: false,
    }));
    const combined = [...own, ...sub];

    setAllDepartments(combined);
    setIsEditDeptVisible(true);
  };

  const handleUpdateDepartment = async () => {
    try {
      await updateDepartment(
        deptId,
        deptForm.name,
        deptForm.parentId,
        deptForm.managerId
      );
      setIsEditDeptVisible(false);
      fetchDetail(); // Refresh data

      showToast(
        "success",
        "Güncelleme Başarılı",
        "Departman bilgileri güncellendi."
      );
    } catch (error) {
      console.error("Update failed:", error);
      showToast("error", "Güncelleme Hatası", "Departman güncellenemedi.");
    }
  };
  const handleDeleteDepartment = async () => {
    if (!department?.id) return;

    const hasSubDepartments = (subDepartmentCount ?? 0) > 0;

    // Subdepartment warning
    if (hasSubDepartments) {
      if (Platform.OS === "web") {
        window.alert(
          "This department has subdepartments. Please delete or reassign them before deleting."
        );
      } else {
        Alert.alert(
          "Cannot Delete Department",
          "This department has subdepartments. Please delete or reassign them before deleting.",
          [{ text: "OK", style: "cancel" }]
        );
      }
      return;
    }

    // Confirm delete
    const confirmDelete = async () => {
      try {
        await deleteDepartment(department.id);
        console.log("Department deleted");
        showToast(
          "success",
          "Departman Silindi",
          "Departman Başarıyla silindi."
        );

        router.push("/");
        router.push("/");
      } catch (error) {
        console.error("Delete failed:", error);
        showToast(
          "error",
          "Departman Silinemedi",
          "Departman Silme işlemi Başarısız oldu"
        );
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Departmanınızı kesin olarak silmek istediğinize eminmisiniz?"
      );
      if (confirmed) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        "Silme Doğrulama",
        "Departmanınızı kesin olarak silmek istediğinize eminmisiniz?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Evet",
            style: "destructive",
            onPress: confirmDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleUserRemove = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await removeUserFromDepartment(deptId, selectedUser.id);

      const newUsers = await getUsersForDepartment(deptId);
      setUsers(newUsers);

      if (Platform.OS === "web") setModalVisible(false);
      else {
        userBottomSheetRef.current?.close();
        setModalVisible(false);
      }
      showToast(
        "success",
        "Kullanıcı Kaldırıldı",
        "Kullanıcı departmandan çıkarıldı"
      );
    } catch (err) {
      console.error("Remove failed:", err);
      showToast("error", "Hata!", "Kullanıcı kaldırılma işlemi başarısız oldu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserDelete = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await deleteUser(deptId, selectedUser.id);

      const newUsers = await getUsersForDepartment(deptId);
      setUsers(newUsers);

      if (Platform.OS === "web") setModalVisible(false);
      else {
        userBottomSheetRef.current?.close();
        setModalVisible(false);
      }
      showToast(
        "success",
        "Kullanıcı Silindi",
        "Kullanıcı silme işlemi başarılı"
      );
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(
        "error",
        "Silme Hatası",
        "Kullanıcı silme işlemi başarısız oldu"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = async (updatedUser: UserFormData) => {
    if (!updatedUser) return;

    setIsLoading(true);
    try {
      if (formMode === "edit" && selectedUser) {
        await updateUser(deptId, selectedUser.id, updatedUser);
        showToast(
          "success",
          "Kullanıcı Güncellendi",
          "Kullanıcı bilgileri başarıyla güncellendi"
        );
      } else if (formMode === "create") {
        await createUser(deptId, updatedUser);
        showToast(
          "success",
          "Kullanıcı Oluşturuldu",
          "Yeni kullanıcı başarıyla eklendi"
        );
      }

      const newUsers = await getUsersForDepartment(deptId);
      setUsers(newUsers);

      if (Platform.OS === "web") setModalVisible(false);
      else {
        userBottomSheetRef.current?.close();
        setModalVisible(false);
      }
    } catch (err) {
      console.error("User submit failed:", err);
      showToast("error", "Hata!", "Kullanıcı kaydedilemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const stats = userStatsMap[item.id];
    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => {
          setSelectedUser(item);

          if (hasPermission("Users", 3)) setFormMode("edit");
          else if (hasPermission("Users", 2)) setFormMode("view");
          else return; // no permission

          if (isWeb) setModalVisible(true);
          else {
            userBottomSheetRef.current?.expand();
            setModalVisible(true);
          }
        }}
      >
        <View style={styles.userInfo}>
          {item.role && (
            <Text style={styles.userRole}>
              {item.id === department?.manager_id ? "Yönetici • " : ""}
              {item.role}
            </Text>
          )}
          <Text style={styles.userName}>{item.name}</Text>
        </View>

        <View style={styles.statsView}>
          <UserStatsView
            stats={stats}
            hasPermission={hasPermission("Tasks", 3)}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Departman" }} />
      {!hasPermission("Departments", 2) ? (
        <NoPermission message="Departman görüntüleme yetkiniz yoktur." />
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <NoPermission message={error} />
      ) : !department ? (
        <Text style={styles.errorText}>Department not found</Text>
      ) : (
        <>
          <View style={styles.topBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı ara..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(u) => u.id.toString()}
            renderItem={renderUser}
            ListHeaderComponent={
              <>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{department.dept_name}</Text>
                  {department.parent && (
                    <Text style={styles.parentText}>
                      Üst: {department.parent.dept_name}
                    </Text>
                  )}
                  {hasPermission("Departments", 4) && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={() => {
                          handleEditDepartment();
                          if (!isWeb) {
                            deptBottomSheetRef.current?.expand();
                            setModalVisible(true);
                          }
                        }}
                      >
                        <MaterialIcons name="edit" size={20} color="#007bff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleDeleteDepartment}>
                        <MaterialIcons
                          name="delete"
                          size={20}
                          color="#dc3545"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />
                <Text style={styles.subheader}>Üyeler</Text>
                {hasPermission("Users", 4) && (
                  <TouchableOpacity
                    style={styles.addUserButton}
                    onPress={() => {
                      setSelectedUserToAdd(null);
                      setIsAddUserVisible(true);

                      if (Platform.OS === "web") return; // modal opens via visible state
                      addUserBottomSheetRef.current?.expand();
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.addUserButtonText}>
                      + Kullanıcı Ekle
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            }
            ListEmptyComponent={() => (
              <Text style={styles.noUsersText}>
                No users in this department.
              </Text>
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            nestedScrollEnabled={true}
          />
          <UserDetailModal
            visible={modalVisible}
            mode={formMode}
            user={selectedUser}
            onClose={() => setModalVisible(false)}
            onSubmit={handleUserSubmit}
            onRemove={handleUserRemove}
            onDelete={handleUserDelete}
            isLoading={isLoading}
            isManager={selectedUser?.id === department.manager_id}
            roles={roles}
            bottomSheetRef={userBottomSheetRef}
          />
          <DepartmentEditModal
            visible={isEditDeptVisible}
            onClose={() => setIsEditDeptVisible(false)}
            onSubmit={handleUpdateDepartment}
            deptForm={deptForm}
            setDeptForm={setDeptForm}
            allDepartments={allDepartments}
            users={users}
            bottomSheetRef={deptBottomSheetRef}
          />
          <AddUserModal
            visible={isAddUserVisible}
            onClose={() => {
              setIsAddUserVisible(false);
              addUserBottomSheetRef.current?.close(); // close on mobile too
              setModalVisible(false);
            }}
            onAdd={async () => {
              if (!selectedUserToAdd) return;
              await addUserInDepartment(deptId, selectedUserToAdd);
              setSelectedUserToAdd(null);
              setIsAddUserVisible(false);
              addUserBottomSheetRef.current?.close();
              setModalVisible(false);
              const updated = await getUsersForDepartment(deptId);
              setUsers(updated);
              showToast(
                "success",
                "Kullanıcı eklendi",
                "Kullanıcı departmana eklendi."
              );
            }}
            users={allUsers}
            selectedUserId={selectedUserToAdd}
            setSelectedUserId={setSelectedUserToAdd}
            bottomSheetRef={addUserBottomSheetRef}
          />
          <TouchableOpacity
            onPress={() => {
              setSelectedUser(null);
              setFormMode("create");
              setModalVisible(true);
            }}
          ></TouchableOpacity>

          {hasPermission("Users", 3) && !modalVisible && (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                setSelectedUser(null);
                setFormMode("create");

                if (isWeb) setModalVisible(true);
                else {
                  userBottomSheetRef.current?.expand();
                  setModalVisible(true);
                }
              }}
            >
              <MaterialIcons name="person-add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#121212",
    position: "relative",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  addUserButton: {
    backgroundColor: "#444",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  addUserButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  header: {
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#FFFFFF",
  },
  parentText: {
    marginTop: 4,
    fontSize: 14,
    color: "#BBBBBB",
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 16,
  },
  subheader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#FFFFFF",
  },
  userRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 5,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userRole: {
    fontSize: 12,
    fontWeight: "800",
    color: "#AAAAAA",
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  statsView: {
    flex: 1,
    justifyContent: "center",
  },
  statsText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  noUsersText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#BBBBBB",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 16,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    justifyContent: "center",
  },
  topBar: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
  },
  searchInput: {
    width: "80%",
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 6,
    height: 36,
    fontSize: 14,
    color: "#FFF",
  },
});
