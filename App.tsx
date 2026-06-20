import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "./services/supabase";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import BottomNavigation, { TabName } from "./components/BottomNavigation";

// Pantallas del flujo de la app
type Screen =
  | "splash"
  | "welcome"
  | "dashboard"
  | "diario"
  | "ia"
  | "perfil";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");

  // Verificar conexión con Supabase al iniciar
  useEffect(() => {
    verificarConexion();
  }, []);

  async function verificarConexion() {
    console.log("Verificando conexión con Supabase...");
    const { data, error } = await supabase
      .from("catalogo_alimentos")
      .select("count");

    if (error) {
      console.log("Error de conexión:", error.message);
    } else {
      console.log("✅ Conexión exitosa con Supabase");
    }
  }

  const handleSplashFinish = () => {
    setCurrentScreen("welcome");
  };

  const handleGetStarted = () => {
    // TODO: En el futuro, navegar a Login/Registro
    setCurrentScreen("dashboard");
    setActiveTab("dashboard");
  };

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setCurrentScreen(tab);
  };

  // --- Renderizado por pantalla ---

  if (currentScreen === "splash") {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (currentScreen === "welcome") {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // --- Pantallas principales con navegación inferior ---
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>
          {activeTab === "dashboard" && "Resumen Diario"}
          {activeTab === "diario" && "Diario de Comidas"}
          {activeTab === "ia" && "Análisis IA"}
          {activeTab === "perfil" && "Mi Perfil"}
        </Text>
      </View>

      <View style={styles.content}>
        {activeTab === "dashboard" && (
          <PlaceholderScreen
            icon="bar-chart-outline"
            title="Dashboard"
            description="Aquí verás tu resumen nutricional diario, progreso contra metas y alertas de la IA."
          />
        )}
        {activeTab === "diario" && (
          <PlaceholderScreen
            icon="restaurant-outline"
            title="Diario de Comidas"
            description="Registra tus comidas del día: Desayuno, Almuerzo, Cena y Merienda."
          />
        )}
        {activeTab === "ia" && (
          <PlaceholderScreen
            icon="sparkles-outline"
            title="Análisis IA"
            description="Recibe recomendaciones personalizadas basadas en tus patrones alimenticios."
          />
        )}
        {activeTab === "perfil" && (
          <PlaceholderScreen
            icon="person-outline"
            title="Mi Perfil"
            description="Gestiona tu perfil biométrico: peso, estatura, edad y objetivos."
          />
        )}
      </View>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

// Componente placeholder temporal para las pantallas en desarrollo
interface PlaceholderScreenProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function PlaceholderScreen({ icon, title, description }: PlaceholderScreenProps) {
  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderIconCircle}>
        <Ionicons name={icon} size={48} color="#00B894" />
      </View>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderDescription}>{description}</Text>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonText}>En desarrollo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D3436",
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  // Placeholder styles
  placeholderContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  placeholderIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0FFF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 12,
  },
  placeholderDescription: {
    fontSize: 15,
    color: "#636E72",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  comingSoonBadge: {
    backgroundColor: "#00B894",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comingSoonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
