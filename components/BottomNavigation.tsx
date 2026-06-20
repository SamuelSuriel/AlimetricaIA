import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type TabName = "dashboard" | "diario" | "ia" | "perfil";

interface BottomNavigationProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

interface TabConfig {
  key: TabName;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const tabs: TabConfig[] = [
  {
    key: "dashboard",
    label: "Inicio",
    iconActive: "home",
    iconInactive: "home-outline",
  },
  {
    key: "diario",
    label: "Diario",
    iconActive: "restaurant",
    iconInactive: "restaurant-outline",
  },
  {
    key: "ia",
    label: "IA",
    iconActive: "sparkles",
    iconInactive: "sparkles-outline",
  },
  {
    key: "perfil",
    label: "Perfil",
    iconActive: "person",
    iconInactive: "person-outline",
  },
];

export default function BottomNavigation({
  activeTab,
  onTabChange,
}: BottomNavigationProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.iconInactive}
              size={24}
              color={isActive ? "#00B894" : "#B2BEC3"}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingBottom: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    color: "#B2BEC3",
    fontWeight: "500",
    marginTop: 4,
  },
  activeLabel: {
    color: "#00B894",
    fontWeight: "600",
  },
});
