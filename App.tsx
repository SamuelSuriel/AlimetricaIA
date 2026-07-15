import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { Session } from "@supabase/supabase-js";

import { supabase } from "./services/supabase";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";
import ProfileScreen from "./components/ProfileScreen";
import DiaryScreen from "./components/diary/DiaryScreen";
import DashboardScreen from "./components/dashboard/DashboardScreen";
import AIScreen from "./components/ia/AIScreen";
import BottomNavigation, { TabName } from "./components/BottomNavigation";

// Pantallas del flujo de la app
type Screen =
  | "splash"
  | "welcome"
  | "login"
  | "register"
  | "dashboard"
  | "diario"
  | "ia"
  | "perfil";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");
  const [isAppReady, setIsAppReady] = useState(false);

  // Manejo de Sesión Global de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setCurrentScreen("dashboard");
      }
      setIsAppReady(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setCurrentScreen("dashboard");
      } else {
        // Si el usuario cierra sesión, devolverlo al login
        setCurrentScreen("login");
      }
    });
  }, []);

  const handleSplashFinish = () => {
    // Si ya cargó la sesión y hay usuario, ir a dashboard. Si no, a welcome.
    if (session) {
      setCurrentScreen("dashboard");
    } else {
      setCurrentScreen("welcome");
    }
  };

  const handleGetStarted = () => {
    setCurrentScreen("login");
  };

  const handleGoToRegister = () => {
    setCurrentScreen("register");
  };

  const handleGoToLogin = () => {
    setCurrentScreen("login");
  };

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setCurrentScreen(tab);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Renderizado por pantalla ---

  if (currentScreen === "splash" || !isAppReady) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (currentScreen === "welcome") {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === "login") {
    return <LoginScreen onGoToRegister={handleGoToRegister} />;
  }

  if (currentScreen === "register") {
    return <RegisterScreen onGoToLogin={handleGoToLogin} />;
  }

  // --- Pantallas principales con navegación inferior (Protegidas) ---
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
          <DashboardScreen session={session!} />
        )}
        {activeTab === "diario" && (
          <DiaryScreen session={session!} />
        )}
        {activeTab === "ia" && (
          <AIScreen session={session!} />
        )}
        {activeTab === "perfil" && (
          <ProfileScreen session={session!} onLogout={handleLogout} />
        )}
      </View>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
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
  },
});
