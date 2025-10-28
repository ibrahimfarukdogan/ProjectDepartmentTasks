import React, { useEffect, useMemo, useState } from "react";
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
import { NoPermission } from "@/components/NoPermission";
import { normalize } from "@/utils/utils";
import { DepartmentDetailItem } from "@/components/DepartmentDetailItem";

export default function DepartmentDetails() {
  const [departments, setDepartments] = useState<DepartmentWithType[]>([]);
  const [statsMap, setStatsMap] = useState<
    Record<number, DetailedDepartmentStatsResponse | "loading" | null>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = useAuth();
  const Separator = () => <View style={{ height: 16 }} />;

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

        setStatsMap(Object.fromEntries(combined.map((d) => [d.id, "loading"])));

        try {
          const results = await Promise.all(
            combined.map(async (dept) => {
              const stats = await fetchDepartmentStats(dept.id);
              return [dept.id, stats]; // pair for easy conversion later
            })
          );

          // Convert array of [id, stats] into an object map
          const statsMap = Object.fromEntries(results);

          setStatsMap(statsMap);
        } catch (err) {
          console.error("Error fetching task stats:", err);
        }
      } catch (err) {
        setError(`Departmanlar alınamadı: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!departments) return [];
    const query = normalize(searchQuery);
    return departments.filter((dept) =>
      normalize(dept.dept_name).includes(query)
    );
  }, [departments, searchQuery]);

  const StatRow = React.memo(
    ({
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
    )
  );

  const renderDepartment = ({ item }: { item: DepartmentWithType }) => {
    const stats = statsMap[item.id];

    return (
      <View
        style={[
          item.isOwn
            ? styles.owndepartmentContainer
            : styles.departmentContainer,
        ]}
      >
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
                  color="#ddd"
                />
              }
              label="Toplam Bitmemiş İşler"
              value={stats.taskStats.total}
              color="#ddd"
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
              color="#ddd"
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
              color="#ddd"
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
              color="#ddd"
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
              color="#ddd"
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
              color="#ddd"
            />
            <StatRow
              icon={
                <MaterialIcons name="crisis-alert" size={18} color="#FF5B5B" />
              }
              label="Süresi Geçen İşler"
              value={stats.taskStats.late}
              color="#ddd"
            />
            <StatRow
              icon={<MaterialIcons name="cancel" size={18} color="#FF0000" />}
              label="İptal Edilen İşler"
              value={stats.taskStats.cancelled}
              color="#ddd"
            />
            <StatRow
              icon={
                <FontAwesome name="question-circle" size={18} color="#FF00F7" />
              }
              label="Atanmamış İşler"
              value={stats.taskStats.not_assigned}
              color="#ddd"
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="attachment"
                  size={18}
                  color="#00A8FF"
                />
              }
              label="Benim Oluşturduğum İşler"
              value={stats.taskStats.created_by_me}
              color="#ddd"
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="attachment"
                  size={18}
                  color="#FF5B5B"
                />
              }
              label="Benim Yönettiğim İşler"
              value={stats.taskStats.authorized_by_me}
              color="#ddd"
            />
            <StatRow
              icon={
                <MaterialCommunityIcons
                  name="attachment"
                  size={18}
                  color="#A0DF85"
                />
              }
              label="Bana Atanan İşler"
              value={stats.taskStats.assigned_to_me}
              color="#ddd"
            />
            <StatRow
              icon={<FontAwesome5 name="users" size={16} color="#ddd" />}
              label="Toplam Kişi Sayısı"
              value={stats.userStats.totalUsers}
              color="#ddd"
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
              color="#ddd"
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
              color="#ddd"
            />
            <StatRow
              icon={<Entypo name="flow-branch" size={18} color="#666" />}
              label="Alt Departman Sayısı"
              value={stats.userStats.numberOfChildDepartments}
              color="#ddd"
            />
            <StatRow
              icon={
                <MaterialIcons name="apartment" size={18} color="#007BFF" />
              }
              label="Kaymakamlıktan Gelen"
              value={stats.taskStats.requester_kaymakamlik}
              color="#ddd"
            />
            <StatRow
              icon={<Ionicons name="people" size={18} color="#8A2BE2" />}
              label="Milletvekillerinden Gelen"
              value={stats.taskStats.requester_milletvekili}
              color="#ddd"
            />
            <StatRow
              icon={<FontAwesome5 name="home" size={16} color="#228B22" />}
              label="Muhtarlıktan Gelen"
              value={stats.taskStats.requester_muhtarlik}
              color="#ddd"
            />
            <StatRow
              icon={<FontAwesome5 name="folder" size={16} color="#ddd" />}
              label="Diğer İşler"
              value={stats.taskStats.requester_diger}
              color="#ddd"
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
        <NoPermission message="Departmanları görüntüleme yetkiniz yoktur." />
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
            renderItem={({ item }) => (
              <DepartmentDetailItem item={item} stats={statsMap[item.id]} />
            )}
            contentContainerStyle={styles.container}
            ItemSeparatorComponent={Separator}
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
    backgroundColor: "#121212", // Dark background
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "#FF6B6B",
    textAlign: "center",
    marginTop: 20,
  },
  owndepartmentContainer: {
    backgroundColor: "#1E2A38",
    borderRadius: 12,
    padding: 16,
    borderColor: "#2C3E50",
    borderWidth: 1,
  },
  departmentContainer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    borderColor: "#2C2C2C",
    borderWidth: 1,
  },
  owndeptTitle: {
    borderRadius: 12,
    padding: 16,
    color: "#4FC3F7",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    borderColor: "#2C3E50",
    borderWidth: 1,
    backgroundColor: "#263545",
  },
  subdeptTitle: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: "#DDDDDD",
    borderColor: "#2C2C2C",
    borderWidth: 1,
    backgroundColor: "#1E1E1E",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2C",
    alignItems: "center",
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
  iconLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 8,
    color: "#CCCCCC",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});
