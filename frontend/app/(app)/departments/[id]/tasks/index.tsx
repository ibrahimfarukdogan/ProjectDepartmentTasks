import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // import Picker
import { DepartmentTask, SecondaryTaskStatus, TaskStatus } from "@/types/tasks";
import { getTasks } from "@/services/api";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/authcontext";
import { NoPermission } from "@/components/NoPermission";
export default function DepartmentTasksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const deptId = parseInt(id as string, 10);
  const { hasPermission, user } = useAuth();

  const [tasks, setTasks] = useState<DepartmentTask[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type StatusFilter = TaskStatus | "all" | keyof SecondaryTaskStatus;
  const statusOptions: StatusFilter[] = [
    "all",
    "open",
    "inprogress",
    "done",
    "approved",
    "cancelled",
    "late",
    "not_started",
    "not_assigned",
    "created_by_me",
    "authorized_by_me",
    "assigned_to_me",
    "requester_milletvekili",
    "requester_kaymakamlik",
    "requester_muhtarlik",
    "requester_diger",
  ];

  const statusTranslations: Record<string, string> = {
    all: "Tüm Görevler",
    open: "Süreç Başlatılmaya Hazır",
    inprogress: "Süreç Devam Etmekte",
    done: "Süreç Tamamlanmış",
    approved: "Onaylanmış",
    cancelled: "İptal Edilmiş",
    late: "Geç Kalmış",
    not_started: "Başlamadı",
    not_assigned: "Atanmamış",
    created_by_me: "Benim Oluşturduğum",
    authorized_by_me: "Benim Yetkilendirildiğim",
    assigned_to_me: "Bana Atanan",
    requester_milletvekili: "Milletvekili Talebi",
    requester_kaymakamlik: "Kaymakamlık Talebi",
    requester_muhtarlik: "Muhtarlık Talebi",
    requester_diger: "Diğer Talep",
  };

  const handleTaskPress = (taskId: number) => {
    router.push(`/departments/${id}/tasks/${taskId}`);
  };

  useEffect(() => {
    if (!deptId) {
      setError("Invalid department ID");
      return;
    }
    setLoading(true);
    getTasks(deptId)
      .then((fetchedTasks) => {
        setTasks(fetchedTasks);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load tasks");
      })
      .finally(() => setLoading(false));
  }, [deptId]);

  // Filter tasks by search text and status
  const filteredTasksMemo = useMemo(() => {
    let filtered = tasks;

    if (selectedStatus !== "all") {
      if (statusOptions.includes(selectedStatus as TaskStatus)) {
        filtered = filtered.filter((t) => t.status === selectedStatus);
      } else {
        filtered = filtered.filter(
          (t) => t.secondaryStatus[selectedStatus as keyof SecondaryTaskStatus]
        );
      }
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(lower));
    }

    return filtered;
  }, [tasks, selectedStatus, searchText]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );
  }

  const truncateText = (text: string, maxLength: number) =>
    text.length > maxLength ? text.slice(0, maxLength) + "…" : text;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  };

  const renderItem = ({ item }: { item: DepartmentTask }) => {
    // Check if current user "owns" this task (you'll need to get currentUser from your auth context)
    // For demo, I'll assume you have a currentUser variable with username/email/id
    const currentUser = user?.name; // replace with real current user from context

    return (
      <TouchableOpacity
        style={styles.taskContainer}
        onPress={() => handleTaskPress(item.id)}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{truncateText(item.title, 29)}</Text>
          {item.creator === currentUser ? 
          <View style={styles.ownerBadgeCreator}>
              <Text style={styles.ownerBadgeTextCreator}>Kurucu</Text>
            </View>
          : item.authorizator === currentUser ? 
          <View style={styles.ownerBadgeAuthorizator}>
              <Text style={styles.ownerBadgeTextAuthorizator}>Yönetici</Text>
            </View>
          : item.assigned_user === currentUser ? 
          <View style={styles.ownerBadgeAssigned}>
              <Text style={styles.ownerBadgeTextAssigned}>Sizin</Text>
            </View>
          : "" }
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.description}>
            {truncateText(item.description, 100)}
          </Text>
        ) : null}

        {/* Bottom row: Dates and Status */}
        <View style={styles.bottomRow}>
          <Text style={styles.dateText}>
            {formatDate(item.start_date)} - {formatDate(item.finish_date)}
          </Text>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {statusTranslations[item.status] || item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Tasks" }} />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      ) : !hasPermission("Departments", 1) ? ( // <-- Permission check here
        <NoPermission message="Görevleri görüntüleme yetkiniz yoktur." />
      ) : (
        <View style={styles.container}>
          {/* Top bar with Picker & Search */}
          <View style={styles.topBar}>
            <Picker
              selectedValue={selectedStatus}
              onValueChange={(val) => setSelectedStatus(val as StatusFilter)}
              style={styles.pickerstyle}
              dropdownIconColor="#fff"
            >
              {statusOptions.map((status) => (
                <Picker.Item
                  key={status}
                  label={statusTranslations[status] ?? status}
                  value={status}
                />
              ))}
            </Picker>

            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Task List */}
          {filteredTasksMemo.length === 0 ? (
            <Text style={styles.noTasksText}>No tasks found.</Text>
          ) : (
            <FlatList
              data={filteredTasksMemo}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}

          {/* Floating Action Button */}
          {hasPermission("Departments", 3) && (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push(`/departments/${id}/tasks/create`)} // Example: navigate to create task page
            >
              <MaterialCommunityIcons
                name="folder-plus"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>
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
  topBar: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#666",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    backgroundColor: "#1E1E1E",
  },
  pickerstyle: {
    flex: 1,
    color: "#fff",
    backgroundColor: "#2b2b2b",
    borderRadius: 6,
    marginRight: 10,
  },
  searchInput: {
    flex: 2,
    backgroundColor: "#333",
    color: "#fff",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 6,
    height: 36,
    fontSize: 14,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  taskContainer: {
    padding: 12,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff",
    marginBottom: 4,
  },
  noTasksText: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ownerBadgeCreator: {
    borderWidth: 1,
    borderColor: "#4FCB00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
    ownerBadgeAuthorizator: {
    borderWidth: 1,
    borderColor: "#FF6B6B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgeAssigned: {
    borderWidth: 1,
    borderColor: "#007BFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgeTextCreator: {
    color: "#4FCB00",
    fontWeight: "600",
    fontSize: 12,
  },
    ownerBadgeTextAuthorizator: {
    color: "#FF6B6B",
    fontWeight: "600",
    fontSize: 12,
  },
    ownerBadgeTextAssigned: {
    color: "#007BFF",
    fontWeight: "600",
    fontSize: 12,
  },
  description: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    color: "#999",
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: "#4FCB00", // green box like your image for "Süreç Tamamlanmış"
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
