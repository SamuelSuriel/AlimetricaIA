import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import MacroProgressBar from './MacroProgressBar';

interface DashboardScreenProps {
  session: Session;
}

interface Metas {
  calorias_objetivo: number;
  proteinas_objetivo_g: number;
  carbohidratos_objetivo_g: number;
  grasas_objetivo_g: number;
}

interface Consumo {
  calorias_consumidas: number;
  proteinas_consumidas: number;
  carbohidratos_consumidos: number;
  grasas_consumidas: number;
}

interface RecomendacionIA {
  sugerencia_text: string;
  alerta_detectada: string | null;
  fecha_generacion: string;
}

export default function DashboardScreen({ session }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metas, setMetas] = useState<Metas | null>(null);
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [recomendacion, setRecomendacion] = useState<RecomendacionIA | null>(null);

  const nombre = session.user.user_metadata?.nombre || 'Usuario';
  const todayISO = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      await checkAndCalculateGoals();
      await fetchConsumo();
      await fetchRecomendacion();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  async function checkAndCalculateGoals() {
    // 1. Verificar si ya tiene metas
    const { data: metasData, error: metasError } = await supabase
      .from('metas_nutricionales')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (metasData) {
      setMetas({
        calorias_objetivo: metasData.calorias_objetivo,
        proteinas_objetivo_g: metasData.proteinas_objetivo_g,
        carbohidratos_objetivo_g: metasData.carbohidratos_objetivo_g,
        grasas_objetivo_g: metasData.grasas_objetivo_g,
      });
      return;
    }

    // 2. Si no tiene, buscar su perfil biométrico para calcular
    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles_biometricos')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (perfilError || !perfilData) {
      // Si no tiene perfil, usar metas default temporales
      setMetas({
        calorias_objetivo: 2000,
        proteinas_objetivo_g: 150,
        carbohidratos_objetivo_g: 200,
        grasas_objetivo_g: 65,
      });
      return;
    }

    // Calcular Mifflin-St Jeor
    const birthYear = parseInt(perfilData.fecha_nacimiento.split('-')[0], 10);
    const age = new Date().getFullYear() - birthYear;
    const w = parseFloat(perfilData.peso);
    const h = parseInt(perfilData.estatura, 10);

    let bmr = 10 * w + 6.25 * h - 5 * age;
    bmr += perfilData.sexo === 'Masculino' ? 5 : -161;

    let tdee = bmr * 1.55; // Factor de actividad moderada

    let calObjetivo = tdee;
    let pPct = 0.3, cPct = 0.4, fPct = 0.3;

    if (perfilData.objetivo === 'Bajar de peso') {
      calObjetivo = tdee - 500;
      pPct = 0.4; cPct = 0.3; fPct = 0.3;
    } else if (perfilData.objetivo === 'Ganar masa muscular') {
      calObjetivo = tdee + 500;
      pPct = 0.3; cPct = 0.45; fPct = 0.25;
    }

    const calculatedMetas = {
      calorias_objetivo: Math.round(calObjetivo),
      proteinas_objetivo_g: Math.round((calObjetivo * pPct) / 4),
      carbohidratos_objetivo_g: Math.round((calObjetivo * cPct) / 4),
      grasas_objetivo_g: Math.round((calObjetivo * fPct) / 9),
    };

    // 3. Guardar las metas generadas en la DB
    const { error: insertError } = await supabase
      .from('metas_nutricionales')
      .insert({
        user_id: session.user.id,
        fecha_inicio: todayISO,
        ...calculatedMetas
      });

    if (insertError) {
      console.error('Error insertando metas calculadas:', insertError);
    }
    
    setMetas(calculatedMetas);
  }

  async function fetchConsumo() {
    const { data, error } = await supabase
      .from('vw_consumo_diario')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('fecha', todayISO)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching consumo:', error);
    }

    if (data) {
      setConsumo({
        calorias_consumidas: data.calorias_consumidas,
        proteinas_consumidas: data.proteinas_consumidas,
        carbohidratos_consumidos: data.carbohidratos_consumidos,
        grasas_consumidas: data.grasas_consumidas,
      });
    } else {
      setConsumo({
        calorias_consumidas: 0,
        proteinas_consumidas: 0,
        carbohidratos_consumidos: 0,
        grasas_consumidas: 0,
      });
    }
  }

  async function fetchRecomendacion() {
    const { data, error } = await supabase
      .from('recomendaciones_ia')
      .select('*')
      .eq('user_id', session.user.id)
      .order('fecha_generacion', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching recomendaciones:', error);
    }

    if (data) {
      setRecomendacion(data);
    }
  }

  function renderDate() {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatted = date.toLocaleDateString('es-ES', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  const calConsumidas = consumo?.calorias_consumidas || 0;
  const calObjetivo = metas?.calorias_objetivo || 2000;
  const calRestantes = Math.max(calObjetivo - calConsumidas, 0);
  const calSobrepasadas = calConsumidas > calObjetivo;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00B894']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {nombre} 👋</Text>
          <Text style={styles.dateText}>{renderDate()}</Text>
        </View>
        <View style={styles.avatarMini}>
          <Text style={styles.avatarMiniText}>{nombre.charAt(0)}</Text>
        </View>
      </View>

      {/* Main Calories Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de Hoy</Text>
        
        <View style={styles.calorieRow}>
          <View style={styles.calStat}>
            <Text style={styles.calValue}>{Math.round(calConsumidas)}</Text>
            <Text style={styles.calLabel}>Consumidas</Text>
          </View>

          <View style={[styles.mainCircle, calSobrepasadas && styles.mainCircleOver]}>
            <Text style={[styles.mainCircleValue, calSobrepasadas && { color: '#FF6B6B' }]}>
              {Math.round(calRestantes)}
            </Text>
            <Text style={styles.mainCircleLabel}>kcal restantes</Text>
          </View>

          <View style={styles.calStat}>
            <Text style={styles.calValue}>{Math.round(calObjetivo)}</Text>
            <Text style={styles.calLabel}>Objetivo</Text>
          </View>
        </View>

        {calSobrepasadas && (
          <View style={styles.overLimitBadge}>
            <Ionicons name="warning-outline" size={16} color="#FF6B6B" />
            <Text style={styles.overLimitText}>Has superado tu meta de hoy</Text>
          </View>
        )}
      </View>

      {/* Macros Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macronutrientes</Text>
        <View style={styles.macrosContainer}>
          <MacroProgressBar 
            label="Proteínas" 
            consumed={consumo?.proteinas_consumidas || 0} 
            goal={metas?.proteinas_objetivo_g || 0} 
            color="#00B894" 
          />
          <MacroProgressBar 
            label="Carbohidratos" 
            consumed={consumo?.carbohidratos_consumidos || 0} 
            goal={metas?.carbohidratos_objetivo_g || 0} 
            color="#FDCB6E" 
          />
          <MacroProgressBar 
            label="Grasas" 
            consumed={consumo?.grasas_consumidas || 0} 
            goal={metas?.grasas_objetivo_g || 0} 
            color="#E17055" 
          />
        </View>
      </View>

      {/* AI Recommendations Card */}
      <View style={[styles.card, styles.aiCard]}>
        <View style={styles.aiHeader}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={20} color="#6C5CE7" />
          </View>
          <Text style={styles.aiTitle}>Alimétrica IA</Text>
        </View>

        {recomendacion ? (
          <View>
            {recomendacion.alerta_detectada && (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={16} color="#D63031" />
                <Text style={styles.alertText}>{recomendacion.alerta_detectada}</Text>
              </View>
            )}
            <Text style={styles.aiSuggestion}>{recomendacion.sugerencia_text}</Text>
          </View>
        ) : (
          <View style={styles.aiEmpty}>
            <Text style={styles.aiSuggestion}>
              Aún no hay suficientes datos para generar un análisis. Registra tus comidas en el Diario y pronto te daré recomendaciones personalizadas.
            </Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  dateText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  avatarMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F8F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 20,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calStat: {
    alignItems: 'center',
    flex: 1,
  },
  calValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  calLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  mainCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  mainCircleOver: {
    borderColor: '#FF6B6B',
  },
  mainCircleValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00B894',
  },
  mainCircleLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  overLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 6,
  },
  overLimitText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
  },
  macrosContainer: {
    marginTop: 5,
  },
  aiCard: {
    borderColor: '#E1D9FE',
    backgroundColor: '#FBF9FF',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E1D9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FAD390',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#D63031',
    fontWeight: '600',
  },
  aiSuggestion: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2D3436',
  },
  aiEmpty: {
    opacity: 0.7,
  },
});
