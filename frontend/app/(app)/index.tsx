import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../context/authcontext";
import {
  fetchTaskStats,
  getUserDepartments,
  getVisibleUsers,
} from "../../services/api";
import {
  DepartmentTaskStatsResponse,
  DepartmentWithType,
} from "@/types/departments";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { createDepartment } from "../../services/api"; // or wherever you defined it
import { useRef } from "react";
import { CreateDepartmentForm } from "../../components/CreateDepartmentForm";
import { NoPermission } from "@/components/NoPermission";
import { showToast } from "@/utils/utils";
import { UserList } from "@/types/user";

export default function Home() {
  const [departments, setDepartments] = useState<DepartmentWithType[]>([]);
  const [taskStatsMap, setTaskStatsMap] = useState<
    Record<number, DepartmentTaskStatsResponse | "loading" | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ["50%"];

  const [newDeptName, setNewDeptName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number>(
    departments[0]?.id ?? 0
  );
  const [isCreating, setIsCreating] = useState(false);
  const isWeb = Platform.OS === "web";
  const [modalVisible, setModalVisible] = useState(false);

  const [visibleUsers, setVisibleUsers] = useState<UserList[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<number>(0);

  const fetchDepartments = async () => {
    if (!hasPermission("Departments", 1)) {
      setLoading(false);
      return;
    }

    try {
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

      setDepartments(combined);

      if (hasPermission("Tasks", 1)) {
        // Init loading map
        const loadingMap: Record<number, "loading"> = {};
        combined.forEach((dept) => {
          loadingMap[dept.id] = "loading";
        });
        setTaskStatsMap(loadingMap);

        // Fetch task stats
        for (const dept of combined) {
          fetchTaskStats(dept.id).then((stats) => {
            setTaskStatsMap((prev) => ({
              ...prev,
              [dept.id]: stats,
            }));
          });
        }
      } else {
        // If no Tasks permission, set stats to null
        const emptyMap: Record<number, null> = {};
        combined.forEach((dept) => {
          emptyMap[dept.id] = null;
        });
        setTaskStatsMap(emptyMap);
      }
    } catch (err) {
      setError(`Failed to load departments: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisibleUsers = async () => {
    try {
      if (hasPermission("Departments", 1)) {
        const users: UserList[] = await getVisibleUsers();
        if (users.length > 0) {
          setVisibleUsers(users);
          setSelectedManagerId(users[0].id);
        } else {
          // fallback to self
          if (user) {
            setVisibleUsers([
              {
                id: user.id,
                name: user.name,
                role: {
                  role_id: user.role_id,
                  role_name: user.role,
                },
              },
            ]);
            setSelectedManagerId(user.id);
          }
        }
      } else {
        // fallback to self
        if (user) {
          setVisibleUsers([
            {
              id: user.id,
              name: user.name,
              role: {
                role_id: user.role_id,
                role_name: user.role,
              },
            },
          ]);
          setSelectedManagerId(user.id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch visible users:", e);
      // fallback to self
      if (user) {
        setVisibleUsers([
          {
            id: user.id,
            name: user.name,
            role: {
              role_id: user.role_id,
              role_name: user.role,
            },
          },
        ]);
        setSelectedManagerId(user.id);
      }
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchVisibleUsers();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      setSelectedParentId(departments[0].id);
    }
  }, [departments]);

  const handleDeptPress = (id: number) => {
    router.push(`/departments/${id}`);
  };

  const handleTaskStatsPress = (id: number) => {
    router.push(`/departments/${id}/tasks`);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.dept_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDepartment = ({ item }: { item: DepartmentWithType }) => {
    const stats = taskStatsMap[item.id];

    return (
      <View style={styles.departmentContainer}>
        {/* Show department button only if user has Departments permission */}
        {hasPermission("Departments", 1) ? (
          <TouchableOpacity
            onPress={() => handleDeptPress(item.id)}
            style={[
              styles.deptButton,
              item.isOwn ? styles.ownDeptButton : styles.subDeptButton,
            ]}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.buttonTitle,
                  item.isOwn ? styles.ownDeptText : styles.subDeptText,
                ]}
              >
                {item.isOwn ? "DEPARTMANINIZ" : "DEPARTMAN"}
              </Text>
              <Text
                style={[
                  styles.deptButtonText,
                  item.isOwn ? styles.ownDeptText : styles.subDeptText,
                ]}
              >
                {item.dept_name}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <NoPermission message="Departmanları görüntüleme yetkiniz yoktur." />
        )}

        {/* Show task stats only if user has Tasks permission */}
        {hasPermission("Tasks", 1) ? (
          <TouchableOpacity
            onPress={() => handleTaskStatsPress(item.id)}
            style={styles.statsButton}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={styles.buttonTitle}>GÖREVLER</Text>
              {stats === "loading" ? (
                <Text style={styles.statsText}>Loading task stats...</Text>
              ) : (
                <Text style={styles.statsText}>
                  <MaterialIcons
                    name="crisis-alert"
                    size={15}
                    color={"#FF5B5B"}
                  />
                  :{stats?.stats.late || 0},{" "}
                  <MaterialIcons
                    name="calendar-month"
                    size={15}
                    color={"#007bff"}
                  />
                  :{stats?.stats.not_started || 0},{" "}
                  <MaterialCommunityIcons
                    name="circle-outline"
                    size={15}
                    color={"#00A8FF"}
                  />
                  :{stats?.stats.open || 0},{" "}
                  <MaterialCommunityIcons
                    name="circle-slice-5"
                    size={15}
                    color={"#FFA500"}
                  />
                  :{stats?.stats.inprogress || 0},{" "}
                  <Ionicons
                    name="checkmark-circle-sharp"
                    size={15}
                    color={"#A0DF85"}
                  />
                  :{stats?.stats.done || 0},{" "}
                  <Ionicons
                    name="checkmark-done-circle"
                    size={15}
                    color={"#36B700"}
                  />
                  :{stats?.stats.approved || 0},{" "}
                  <MaterialIcons name="cancel" size={15} color={"#FF0000"} />:
                  {stats?.stats.cancelled || 0}
                  {stats?.stats.not_assigned ? (
                    <>
                      ,{" "}
                      <FontAwesome
                        name="question-circle"
                        size={15}
                        color={"#FF00F7"}
                      />
                      :{stats?.stats.not_assigned}
                    </>
                  ) : null}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <NoPermission message="Görevleri görünteleme yetkiniz yoktur." />
        )}
      </View>
    );
  };

  const openSheet = () => {
    if (departments.length > 0) {
      setSelectedParentId(departments[0].id); // fallback parent
      bottomSheetRef.current?.expand();
    } else {
      showToast("error", "Hata!", "Departman oluşturulurken bir hata oluştu.");
    }
  };

  const closeSheet = () => {
    bottomSheetRef.current?.close();
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      showToast("info", "Bilgi", "Lütfen departman ismi girin.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createDepartment(
        newDeptName,
        selectedParentId || 0,
        selectedManagerId // <-- pass manager_id
      );

      setIsCreating(false);

      if (created) {
        showToast("success", "Başarılı!", "Departman başarıyla oluşturuldu");
        closeSheet();
        setModalVisible(false);
        await fetchDepartments();
        setNewDeptName("");
        setSelectedParentId(0);
        setSelectedManagerId(visibleUsers[0]?.id ?? 0);
      } else {
        showToast("error", "Hata!", "Departman oluşturulamadı");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Hata!", "Departman oluşturulurken bir hata oluştu");
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Departmanlar" }} />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : error ? (
        <View style={styles.container}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : !hasPermission("Departments", 1) ? ( // <-- Permission check here
        <NoPermission message="Departmanları görüntüleme yetkiniz yoktur." />
      ) : (
        <>
          {/* Sticky top button */}
          {hasPermission("Departments", 2) && (
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => router.push("/departments/details")}
              >
                <Text style={styles.topBarButtonText}>Detay</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Departman ara..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#888"
              />
            </View>
          )}
          <View style={styles.container}>
            {/* Scrollable list below */}
            <FlatList
              data={filteredDepartments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderDepartment}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />} // 👈 Adds vertical space between items
              ListFooterComponent={<View style={{ height: 100 }} />} // 👈 See below
            />
            {isWeb ? (
              <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <CreateDepartmentForm
                      departments={departments}
                      selectedParentId={selectedParentId}
                      onSelectParent={setSelectedParentId}
                      newDeptName={newDeptName}
                      onChangeDeptName={setNewDeptName}
                      onSubmit={handleCreateDepartment}
                      isLoading={isCreating}
                      visibleUsers={visibleUsers}
                      selectedManagerId={selectedManagerId}
                      onSelectManager={setSelectedManagerId}
                      canSelectManager={
                        hasPermission("Departments", 1) &&
                        visibleUsers.length > 1
                      }
                    />

                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.modalCancelButton}
                    >
                      <Text style={{ color: "#007BFF", fontWeight: "bold" }}>
                        İptal
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
              >
                <BottomSheetScrollView>
                  <CreateDepartmentForm
                    departments={departments}
                    selectedParentId={selectedParentId}
                    onSelectParent={setSelectedParentId}
                    newDeptName={newDeptName}
                    onChangeDeptName={setNewDeptName}
                    onSubmit={handleCreateDepartment}
                    isLoading={isCreating}
                    visibleUsers={visibleUsers}
                    selectedManagerId={selectedManagerId}
                    onSelectManager={setSelectedManagerId}
                    canSelectManager={
                      hasPermission("Departments", 1) && visibleUsers.length > 1
                    }
                  />
                </BottomSheetScrollView>
              </BottomSheet>
            )}

            {hasPermission("Departments", 3) && (
              <TouchableOpacity
                style={styles.fab}
                onPress={isWeb ? () => setModalVisible(true) : openSheet}
              >
                <MaterialCommunityIcons
                  name="office-building-plus"
                  size={28}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
          </View>
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
  },
  buttonTitle: {
    fontSize: 12,
    fontWeight: "bold",
    opacity: 0.8,
    color: "#ffffff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  departmentContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  deptButton: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    width: "100%",
    alignItems: "center",
  },
  ownDeptButton: {
    backgroundColor: "#1E2A38",
    borderWidth: 1,
    borderColor: "#444",
  },
  subDeptButton: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#444",
  },
  deptButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  ownDeptText: {
    color: "#4FC3F7",
  },
  subDeptText: {
    color: "#dddddd",
  },
  statsButton: {
    backgroundColor: "#2D4D46",
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  statsText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
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
  },
  topBar: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    backgroundColor: "#1E1E1E",
  },
  topBarButton: {
    backgroundColor: "#25994fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  topBarButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchInput: {
    marginLeft: 10,
    backgroundColor: "#333",
    color: "#fff",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 6,
    height: 36,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000ff",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxWidth: 500,
  },
  modalCancelButton: {
    marginTop: 10,
    alignItems: "center",
  },
});
