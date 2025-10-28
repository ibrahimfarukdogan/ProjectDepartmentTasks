// components/UserStatsView.tsx
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { UserTaskStatsResponse } from "@/types/user";

type Props = {
  stats: UserTaskStatsResponse | "loading" | null;
  hasPermission: boolean;
};

export const UserStatsView = ({ stats, hasPermission }: Props) => {
  if (!hasPermission) return <Text style={styles.empty}> </Text>;

  if (stats === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (stats == null) {
    return <Text style={styles.noTasks}>Görev yok</Text>;
  }

  const s = stats.stats;

  return (
    <Text style={styles.statsText}>
      <MaterialIcons name="crisis-alert" size={15} color="#FF5B5B" />:{s.late},{" "}
      <MaterialIcons name="calendar-month" size={15} color="#007bff" />:{s.not_started},{" "}
      <MaterialCommunityIcons name="circle-outline" size={15} color="#00A8FF" />:{s.open},{" "}
      <MaterialCommunityIcons name="circle-slice-5" size={15} color="#FF8800" />:{s.inprogress},{" "}
      <Ionicons name="checkmark-circle-sharp" size={15} color="#A0DF85" />:{s.done},{" "}
      <Ionicons name="checkmark-done-circle" size={15} color="#36B700" />:{s.approved},{" "}
      <MaterialIcons name="cancel" size={15} color="#FF0000" />:{s.cancelled}
    </Text>
  );
};

const styles = StyleSheet.create({
  statsText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  noTasks: {
    fontSize: 12,
    color: "#888",
  },
  empty: {
    fontSize: 12,
    color: "transparent",
  },
  centered: {
    flexDirection: "row",
    alignItems: "center",
  },
});
