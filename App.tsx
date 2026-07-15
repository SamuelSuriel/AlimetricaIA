import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";

import { supabase } from "./services/supabase";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";
import ProfileScreen from "./components/ProfileScreen";
import DiaryScreen from "./components/diary/DiaryScreen";
import DashboardScreen from "./components/dashboard/DashboardScreen";
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
          <PlaceholderScreen
            icon="sparkles-outline"
            title="Análisis IA"
            description="Recibe recomendaciones personalizadas basadas en tus patrones alimenticios."
          />
        )}
        {activeTab === "perfil" && (
          <ProfileScreen session={session!} onLogout={handleLogout} />
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
  },
  profileContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 15,
    marginHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  logoutText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  // Placeholder styles
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
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
