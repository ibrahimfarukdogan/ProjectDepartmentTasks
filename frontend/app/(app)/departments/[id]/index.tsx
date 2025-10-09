import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../context/authcontext";
import {
  getDepartment,
  fetchUserStats,
  getUsersForDepartment,
} from "../../../../services/api";
import { User, UserTaskStatsResponse } from "@/types/user";
import { Department } from "@/types/departments";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";

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
  const bottomSheetRef = useRef<BottomSheet>(null);

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
      if (!dept) throw new Error("Departman bulunamadı.");
      setDepartment(dept);

      if (hasPermission("Users", 1)) {
        const userList = await getUsersForDepartment(deptId); // ✅ Replaces: dept.members
        setUsers(userList);

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
    } catch (err) {
      setError((err as any)?.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [deptId]);

  const openSheet = () => {};
  const closeSheet = () => {
    bottomSheetRef.current?.close();
  };

  const handleEditDepartment = () => {};
  const handleDeleteDepartment = () => {};
  const handleEditUser = (user: User) => {};
  const handleDeleteUser = (user: User) => {};

  const renderUser = ({ item }: { item: User }) => {
    const stats = userStatsMap[item.id];
    return (
<TouchableOpacity
  style={styles.userRow}
  onPress={() => {
    setSelectedUser(item);
    if(isWeb)
      setModalVisible(true)
    else
      openSheet();
  }}
>
  <View style={styles.userInfo}>
    {item.role && <Text style={styles.userRole}>{item.role}</Text>}
    <Text style={styles.userName}>{item.name}</Text>
  </View>

  <View style={styles.statsView}>
    {hasPermission("Tasks", 3) ? (
      stats === "loading" ? (
        <ActivityIndicator size="small" />
      ) : stats == null ? (
        <Text>Görev yok</Text>
      ) : (
        <Text style={styles.statsText}>
          <MaterialIcons name="crisis-alert" size={15} color="#FF5B5B" />:
          {stats?.stats.late || 0},{" "}
          <MaterialIcons name="calendar-month" size={15} color="#007bff" />:
          {stats?.stats.not_started || 0},{" "}
          <MaterialCommunityIcons
            name="circle-outline"
            size={15}
            color="#00A8FF"
          />
          :{stats?.stats.open || 0},{" "}
          <MaterialCommunityIcons
            name="circle-slice-5"
            size={15}
            color="#FF8800"
          />
          :{stats?.stats.inprogress || 0},{" "}
          <Ionicons
            name="checkmark-circle-sharp"
            size={15}
            color="#A0DF85"
          />
          :{stats?.stats.done || 0},{" "}
          <Ionicons
            name="checkmark-done-circle"
            size={15}
            color="#36B700"
          />
          :{stats?.stats.approved || 0},{" "}
          <MaterialIcons name="cancel" size={15} color="#FF0000" />:
          {stats?.stats.cancelled || 0}
        </Text>
      )
    ) : (
      <Text> </Text>
    )}
  </View>
</TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!department) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Department not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Departman" }} />

      <FlatList
        data={users}
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
                  <TouchableOpacity onPress={() => handleEditDepartment()}>
                    <MaterialIcons name="edit" size={20} color="#007bff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteDepartment()}>
                    <MaterialIcons name="delete" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.divider} />
            <Text style={styles.subheader}>Üyeler</Text>
          </>
        }
        ListEmptyComponent={() => (
          <Text style={styles.noUsersText}>No users in this department.</Text>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        nestedScrollEnabled={true}
      />

      {hasPermission("Users", 3) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={isWeb ? () => setModalVisible(true) : openSheet}
        >
          <MaterialIcons name="person-add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    position: "relative", // ensure relative positioning for fab
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
    zIndex: 999, // ensure it stays on top
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },
  parentText: {
    marginTop: 4,
    fontSize: 14,
    color: "#555",
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 16,
  },
  subheader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  userRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userRole: {
    fontSize: 12,
    fontWeight: "800",
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  userPhone: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  userAddress: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  statsView: {
    flex: 1,
    justifyContent: "center",
  },
  statsText: {
    fontSize: 12,
    color: "#333",
  },
  noStatsText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  noUsersText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    justifyContent: "center",
  },
  userActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
});
