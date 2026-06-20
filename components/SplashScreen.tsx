import { View, Text, StyleSheet } from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={48} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.appName}>Alimétrica</Text>
        <Text style={styles.appSubName}>IA</Text>
        <Text style={styles.tagline}>Tu nutrición inteligente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00B894",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00B894",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#2D3436",
    letterSpacing: -1,
  },
  appSubName: {
    fontSize: 28,
    fontWeight: "300",
    color: "#00B894",
    marginTop: -4,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#636E72",
    marginTop: 16,
    letterSpacing: 0.5,
  },
});
