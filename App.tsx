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
import OnboardingScreen from "./components/OnboardingScreen";
import BottomNavigation, { TabName } from "./components/BottomNavigation";

// Pantallas del flujo de la app
type Screen =
  | "splash"
  | "welcome"
  | "login"
  | "register"
  | "onboarding"
  | "dashboard"
  | "diario"
  | "ia"
  | "perfil";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");
  const [isAppReady, setIsAppReady] = useState(false);

  // Verificar si el usuario tiene perfil biométrico completo
  async function checkBiometricProfile(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('perfiles_biometricos')
      .select('id')
      .eq('user_id', userId)
      .single();
    return !error && !!data;
  }

  // Manejo de Sesión Global de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const hasProfile = await checkBiometricProfile(session.user.id);
        setCurrentScreen(hasProfile ? "dashboard" : "onboarding");
      }
      setIsAppReady(true);
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const hasProfile = await checkBiometricProfile(session.user.id);
        setCurrentScreen(hasProfile ? "dashboard" : "onboarding");
      } else {
        setCurrentScreen("login");
      }
    });
  }, []);

  const handleSplashFinish = () => {
    if (session) {
      checkBiometricProfile(session.user.id).then((hasProfile) => {
        setCurrentScreen(hasProfile ? "dashboard" : "onboarding");
      });
    } else {
      setCurrentScreen("welcome");
    }
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen("dashboard");
    setActiveTab("dashboard");
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

  if (currentScreen === "onboarding" && session) {
    return <OnboardingScreen session={session} onComplete={handleOnboardingComplete} />;
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
