import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { Stack } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  FontAwesome,
  Entypo,
} from "@expo/vector-icons";
import { useAuth } from "../../../context/authcontext";
import {
  fetchDepartmentStats,
  getUserDepartments,
} from "../../../services/api";
import {
  DepartmentWithType,
  DetailedDepartmentStatsResponse,
} from "@/types/departments";

export default function DepartmentDetails() {
  const [departments, setDepartments] = useState<DepartmentWithType[]>([]);
  const [statsMap, setStatsMap] = useState<
    Record<number, DetailedDepartmentStatsResponse | "loading" | null>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      if (!hasPermission("Departments", 2)) {
        setLoading(false);
        return;
      }

      try {
        const data = await getUserDepartments();
        const combined = [
          ...(data.ownDepartments || []).map((d: any) => ({
            ...d,
            isOwn: true,
          })),
          ...(data.subDepartments || []).map((d: any) => ({
            ...d,
            isOwn: false,
          })),
        ];
        setDepartments(combined);

        const loadingMap: Record<number, "loading"> = {};
        combined.forEach((d) => (loadingMap[d.id] = "loading"));
        setStatsMap(loadingMap);

        for (const dept of combined) {
          const stat = await fetchDepartmentStats(dept.id);
          setStatsMap((prev) => ({ ...prev, [dept.id]: stat }));
        }
      } catch (err) {
        setError(`Departmanlar alınamadı: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredDepartments = departments.filter((dept) =>
    dept.dept_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatRow = ({
    icon,
    label,
    value,
    color = "#333",
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color?: string;
  }) => (
    <View style={styles.statRow}>
      <View style={styles.iconLabel}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const renderDepartment = ({ item }: { item: DepartmentWithType }) => {
    const stats = statsMap[item.id];

    return (
      <View style={[item.isOwn ? styles.owndepartmentContainer : styles.departmentContainer]}>
        <Text style={[item.isOwn ? styles.owndeptTitle : styles.subdeptTitle]}>
          {item.dept_name}
        </Text>
        {stats === "loading" ? (
          <ActivityIndicator size="small" />
        ) : stats ? (
          <>
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="playlist-edit"
                  size={18}
                  color="#000"
                />
              }
              label="Toplam Bitmemiş İşler"
              value={stats.taskStats.total}
            />
            <StatRow
              icon={
                <MaterialIcons
                  name="calendar-month"
                  size={18}
                  color="#007bff"
                />
              }
              label="Başlamasına Daha Var"
              value={stats.taskStats.not_started}
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="circle-outline"
                  size={18}
                  color="#00A8FF"
                />
              }
              label="Açık İşler"
              value={stats.taskStats.open}
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="circle-slice-5"
                  size={18}
                  color="#FFA500"
                />
              }
              label="Devam Eden İşler"
              value={stats.taskStats.inprogress}
            />
            <StatRow
              icon={
                <Ionicons
                  name="checkmark-circle-sharp"
                  size={18}
                  color="#A0DF85"
                />
              }
              label="Tamamlanan İşler"
              value={stats.taskStats.done}
            />
            <StatRow
              icon={
                <Ionicons
                  name="checkmark-done-circle"
                  size={18}
                  color="#36B700"
                />
              }
              label="Onaylanan İşler"
              value={stats.taskStats.approved}
            />
            <StatRow
              icon={
                <MaterialIcons name="crisis-alert" size={18} color="#FF5B5B" />
              }
              label="Süresi Geçen İşler"
              value={stats.taskStats.late}
            />
            <StatRow
              icon={<MaterialIcons name="cancel" size={18} color="#FF0000" />}
              label="İptal Edilen İşler"
              value={stats.taskStats.cancelled}
            />
            <StatRow
              icon={
                <FontAwesome name="question-circle" size={18} color="#FF00F7" />
              }
              label="Atanmamış İşler"
              value={stats.taskStats.created_by_me}
            />
            <StatRow
              icon={<FontAwesome5 name="users" size={16} color="#333" />}
              label="Toplam Kişi Sayısı"
              value={stats.userStats.totalUsers}
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="account-hard-hat"
                  size={18}
                  color="#888"
                />
              }
              label="Meşgul Kişi Sayısı"
              value={stats.userStats.usersWithTasks}
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="account-off"
                  size={18}
                  color="#999"
                />
              }
              label="Boşta Kişi Sayısı"
              value={stats.userStats.usersWithoutTasks}
            />
            <StatRow
              icon={<Entypo name="flow-branch" size={18} color="#666" />}
              label="Alt Departman Sayısı"
              value={stats.userStats.numberOfChildDepartments}
            />
            <StatRow
              icon={
                <MaterialIcons name="apartment" size={18} color="#007BFF" />
              }
              label="Kaymakamlıktan Gelen"
              value={stats.taskStats.requester_kaymakamlik}
            />
            <StatRow
              icon={<Ionicons name="people" size={18} color="#8A2BE2" />}
              label="Milletvekillerinden Gelen"
              value={stats.taskStats.requester_milletvekili}
            />
            <StatRow
              icon={<FontAwesome5 name="home" size={16} color="#228B22" />}
              label="Muhtarlıktan Gelen"
              value={stats.taskStats.requester_muhtarlik}
            />
            <StatRow
              icon={<FontAwesome5 name="folder" size={16} color="#444" />}
              label="Diğer İşler"
              value={stats.taskStats.requester_diger}
            />
          </>
        ) : (
          <Text style={styles.error}>İstatistik alınamadı.</Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Detaylar" }} />

      {!hasPermission("Departments", 2) ? (
        <View style={styles.container}>
          <Text style={styles.error}>
            Departmanları görüntüleme yetkiniz yoktur.
          </Text>
        </View>
      ) : loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : error ? (
        <View style={styles.container}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.topBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Departman ara..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredDepartments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDepartment}
            contentContainerStyle={styles.container}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  owndepartmentContainer: {
    backgroundColor: "#e3f9fcff",
    borderRadius: 12,
    padding: 16,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  departmentContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  owndeptTitle: {
    borderRadius: 12,
    padding: 16,
    color: "#005abbff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    borderColor: "#ddd",
    borderWidth: 1,
  },
  subdeptTitle: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: "#333",
    borderColor: "#ddd",
    borderWidth: 1,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#000000ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    width: "80%",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    height: 36,
    fontSize: 14,
  },
  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 8,
    color: "#444",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
