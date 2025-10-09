import { Text, View } from "react-native";

export const NoPermission = ({ message = "Görüntülemek için yetkiniz yoktur" }) => (
  <View style={{ padding: 16 }}>
    <Text style={{ textAlign: "center", fontSize: 16 }}>{message}</Text>
  </View>
);
