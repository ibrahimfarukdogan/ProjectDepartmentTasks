import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome,
} from "@expo/vector-icons";
import { DepartmentWithType, DepartmentTaskStatsResponse } from "@/types/departments";
import { useAuth } from "../context/authcontext";
import { NoPermission } from "@/components/NoPermission";

interface DepartmentItemProps {
  department: DepartmentWithType;
  taskStats: DepartmentTaskStatsResponse | "loading" | null;
  onPressDept: (id: number) => void;
  onPressStats: (id: number) => void;
}

export const DepartmentItem: React.FC<DepartmentItemProps> = ({
  department,
  taskStats,
  onPressDept,
  onPressStats,
}) => {
  const { hasPermission } = useAuth();

  return (
    <View style={styles.departmentContainer}>
      {hasPermission("Departments", 1) ? (
        <TouchableOpacity
          onPress={() => onPressDept(department.id)}
          style={[
            styles.deptButton,
            department.isOwn ? styles.ownDeptButton : styles.subDeptButton,
          ]}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={[
                styles.buttonTitle,
                department.isOwn ? styles.ownDeptText : styles.subDeptText,
              ]}
            >
              {department.isOwn ? "DEPARTMANINIZ" : "DEPARTMAN"}
            </Text>
            <Text
              style={[
                styles.deptButtonText,
                department.isOwn ? styles.ownDeptText : styles.subDeptText,
              ]}
            >
              {department.dept_name}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <NoPermission message="Departmanları görüntüleme yetkiniz yoktur." />
      )}

      {hasPermission("Tasks", 1) ? (
        <TouchableOpacity
          onPress={() => onPressStats(department.id)}
          style={styles.statsButton}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={styles.buttonTitle}>GÖREVLER</Text>
            {taskStats === "loading" ? (
              <Text style={styles.statsText}>Loading task stats...</Text>
            ) : (
<View style={styles.statsRow}>
    <View style={styles.statItem}>
      <MaterialIcons name="crisis-alert" size={15} color="#FF5B5B" />
      <Text style={styles.statsText}>:{taskStats?.stats.late || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <MaterialIcons name="calendar-month" size={15} color="#007bff" />
      <Text style={styles.statsText}>:{taskStats?.stats.not_started || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <MaterialCommunityIcons name="circle-outline" size={15} color="#00A8FF" />
      <Text style={styles.statsText}>:{taskStats?.stats.open || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <MaterialCommunityIcons name="circle-slice-5" size={15} color="#FFA500" />
      <Text style={styles.statsText}>:{taskStats?.stats.inprogress || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <Ionicons name="checkmark-circle-sharp" size={15} color="#A0DF85" />
      <Text style={styles.statsText}>:{taskStats?.stats.done || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <Ionicons name="checkmark-done-circle" size={15} color="#36B700" />
      <Text style={styles.statsText}>:{taskStats?.stats.approved || 0}</Text>
    </View>
    <View style={styles.statItem}>
      <MaterialIcons name="cancel" size={15} color="#FF0000" />
      <Text style={styles.statsText}>:{taskStats?.stats.cancelled || 0}</Text>
    </View>
    {taskStats?.stats.not_assigned ? (
      <View style={styles.statItem}>
        <FontAwesome name="question-circle" size={15} color="#FF00F7" />
        <Text style={styles.statsText}>:{taskStats?.stats.not_assigned}</Text>
      </View>
    ) : null}
  </View>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        <NoPermission message="Görevleri görünteleme yetkiniz yoktur." />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderColor: "#aaa",
  },
  subDeptButton: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#666",
  },
  buttonTitle: {
    fontSize: 12,
    fontWeight: "bold",
    opacity: 0.8,
    color: "#ffffff",
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
    borderColor: "#666",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 16,
    width: "100%",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8, // space between items
  },
  statsText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 3, // space between icon and number
  },
});
