import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
  FontAwesome,
  Entypo,
} from "@expo/vector-icons";
import {
  DepartmentWithType,
  DetailedDepartmentStatsResponse,
} from "@/types/departments";

const icons = {
  total: <MaterialCommunityIcons name="playlist-edit" size={18} color="#ddd" />,
  calendar: <MaterialIcons name="calendar-month" size={18} color="#007bff" />,
  circleOutline: (
    <MaterialCommunityIcons name="circle-outline" size={18} color="#00A8FF" />
  ),
  circleSlice5: (
    <MaterialCommunityIcons name="circle-slice-5" size={18} color="#FFA500" />
  ),
  checkmarkCircle: (
    <Ionicons name="checkmark-circle-sharp" size={18} color="#A0DF85" />
  ),
  checkmarkDoneCircle: (
    <Ionicons name="checkmark-done-circle" size={18} color="#36B700" />
  ),
  crisisAlert: <MaterialIcons name="crisis-alert" size={18} color="#FF5B5B" />,
  cancel: <MaterialIcons name="cancel" size={18} color="#FF0000" />,
  questionCircle: (
    <FontAwesome name="question-circle" size={18} color="#FF00F7" />
  ),
  attachmentBlue: (
    <MaterialCommunityIcons name="attachment" size={18} color="#00A8FF" />
  ),
  attachmentRed: (
    <MaterialCommunityIcons name="attachment" size={18} color="#FF5B5B" />
  ),
  attachmentGreen: (
    <MaterialCommunityIcons name="attachment" size={18} color="#A0DF85" />
  ),
  users: <FontAwesome5 name="users" size={16} color="#ddd" />,
  hardHat: (
    <MaterialCommunityIcons name="account-hard-hat" size={18} color="#888" />
  ),
  accountOff: (
    <MaterialCommunityIcons name="account-off" size={18} color="#999" />
  ),
  flowBranch: <Entypo name="flow-branch" size={18} color="#666" />,
  apartment: <MaterialIcons name="apartment" size={18} color="#007BFF" />,
  people: <Ionicons name="people" size={18} color="#8A2BE2" />,
  home: <FontAwesome5 name="home" size={16} color="#228B22" />,
  folder: <FontAwesome5 name="folder" size={16} color="#ddd" />,
};

const StatRow = React.memo(
  ({
    icon,
    label,
    value,
    color = "#ddd",
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

interface DepartmentDetailItemProps {
  item: DepartmentWithType;
  stats: DetailedDepartmentStatsResponse | "loading" | null;
}

export function DepartmentDetailItem({
  item,
  stats,
}: DepartmentDetailItemProps) {
  return (
    <View
      style={[
        item.isOwn ? styles.owndepartmentContainer : styles.departmentContainer,
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
            icon={icons.total}
            label="Toplam Bitmemiş İşler"
            value={stats.taskStats.total}
          />
          <StatRow
            icon={icons.calendar}
            label="Başlamasına Daha Var"
            value={stats.taskStats.not_started}
          />
          <StatRow
            icon={icons.circleOutline}
            label="Açık İşler"
            value={stats.taskStats.open}
          />
          <StatRow
            icon={icons.circleSlice5}
            label="Devam Eden İşler"
            value={stats.taskStats.inprogress}
          />
          <StatRow
            icon={icons.checkmarkCircle}
            label="Tamamlanan İşler"
            value={stats.taskStats.done}
          />
          <StatRow
            icon={icons.checkmarkDoneCircle}
            label="Onaylanan İşler"
            value={stats.taskStats.approved}
          />
          <StatRow
            icon={icons.crisisAlert}
            label="Süresi Geçen İşler"
            value={stats.taskStats.late}
          />
          <StatRow
            icon={icons.cancel}
            label="İptal Edilen İşler"
            value={stats.taskStats.cancelled}
          />
          <StatRow
            icon={icons.questionCircle}
            label="Atanmamış İşler"
            value={stats.taskStats.not_assigned}
          />
          <StatRow
            icon={icons.attachmentBlue}
            label="Benim Oluşturduğum İşler"
            value={stats.taskStats.created_by_me}
          />
          <StatRow
            icon={icons.attachmentRed}
            label="Benim Yönettiğim İşler"
            value={stats.taskStats.authorized_by_me}
          />
          <StatRow
            icon={icons.attachmentGreen}
            label="Bana Atanan İşler"
            value={stats.taskStats.assigned_to_me}
          />
          <StatRow
            icon={icons.users}
            label="Toplam Kişi Sayısı"
            value={stats.userStats.totalUsers}
          />
          <StatRow
            icon={icons.hardHat}
            label="Meşgul Kişi Sayısı"
            value={stats.userStats.usersWithTasks}
          />
          <StatRow
            icon={icons.accountOff}
            label="Boşta Kişi Sayısı"
            value={stats.userStats.usersWithoutTasks}
          />
          <StatRow
            icon={icons.flowBranch}
            label="Alt Departman Sayısı"
            value={stats.userStats.numberOfChildDepartments}
          />
          <StatRow
            icon={icons.apartment}
            label="Kaymakamlıktan Gelen"
            value={stats.taskStats.requester_kaymakamlik}
          />
          <StatRow
            icon={icons.people}
            label="Milletvekillerinden Gelen"
            value={stats.taskStats.requester_milletvekili}
          />
          <StatRow
            icon={icons.home}
            label="Muhtarlıktan Gelen"
            value={stats.taskStats.requester_muhtarlik}
          />
          <StatRow
            icon={icons.folder}
            label="Diğer İşler"
            value={stats.taskStats.requester_diger}
          />
        </>
      ) : (
        <Text style={styles.error}>İstatistik alınamadı.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  error: {
    color: "#FF6B6B",
    textAlign: "center",
    marginTop: 20,
  },
});
