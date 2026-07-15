import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { analizarDiaConIA, hayClaveIA, DatosAnalisis } from '../../services/ai';

interface AIScreenProps {
  session: Session;
}

interface Recomendacion {
  id: string;
  sugerencia_text: string;
  alerta_detectada: string | null;
  fecha_generacion: string;
}

export default function AIScreen({ session }: AIScreenProps) {
  const [analizando, setAnalizando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historial, setHistorial] = useState<Recomendacion[]>([]);

  const nombre = session.user.user_metadata?.nombre || 'Usuario';
  const claveConfigurada = hayClaveIA();

  function getLocalDateISO(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const cargarHistorial = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recomendaciones_ia')
        .select('*')
        .eq('user_id', session.user.id)
        .order('fecha_generacion', { ascending: false })
        .limit(15);

      if (error && error.code !== 'PGRST116') throw error;
      setHistorial(data || []);
    } catch (error) {
      console.error('Error cargando historial de IA:', error);
    } finally {
      setCargandoHistorial(false);
      setRefreshing(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarHistorial();
  };

  // Reúne todos los datos del día y llama a la IA.
  async function analizarDia() {
    setAnalizando(true);
    try {
      const todayISO = getLocalDateISO();

      // 1. Perfil biométrico (sexo, objetivo, edad)
      const { data: perfil } = await supabase
        .from('perfiles_biometricos')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      let edad: number | null = null;
      if (perfil?.fecha_nacimiento) {
        const birthYear = parseInt(perfil.fecha_nacimiento.split('-')[0], 10);
        if (!isNaN(birthYear)) edad = new Date().getFullYear() - birthYear;
      }

      // 2. Metas nutricionales (las más recientes)
      const { data: metas } = await supabase
        .from('metas_nutricionales')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!metas) {
        Alert.alert(
          'Falta información',
          'Aún no tienes metas nutricionales. Completa tu perfil biométrico para que la IA pueda analizar tu día.'
        );
        setAnalizando(false);
        return;
      }

      // 3. Consumo de hoy (vista agregada)
      const { data: consumo } = await supabase
        .from('vw_consumo_diario')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('fecha', todayISO)
        .single();

      // 4. Alimentos registrados hoy (para dar contexto a la IA)
      const { data: comidas } = await supabase
        .from('comidas')
        .select('detalle_comidas(catalogo_alimentos(nombre))')
        .eq('user_id', session.user.id)
        .eq('fecha', todayISO);

      const alimentos: string[] = [];
      (comidas || []).forEach((c: any) => {
        (c.detalle_comidas || []).forEach((d: any) => {
          const nombreAlimento = d?.catalogo_alimentos?.nombre;
          if (nombreAlimento) alimentos.push(nombreAlimento);
        });
      });

      const datos: DatosAnalisis = {
        nombre,
        sexo: perfil?.sexo ?? null,
        edad,
        objetivo: perfil?.objetivo ?? null,
        metas: {
          calorias_objetivo: metas.calorias_objetivo,
          proteinas_objetivo_g: metas.proteinas_objetivo_g,
          carbohidratos_objetivo_g: metas.carbohidratos_objetivo_g,
          grasas_objetivo_g: metas.grasas_objetivo_g,
        },
        consumo: {
          calorias_consumidas: consumo?.calorias_consumidas || 0,
          proteinas_consumidas: consumo?.proteinas_consumidas || 0,
          carbohidratos_consumidos: consumo?.carbohidratos_consumidos || 0,
          grasas_consumidas: consumo?.grasas_consumidas || 0,
        },
        alimentos,
      };

      // 5. Llamada a la IA
      const resultado = await analizarDiaConIA(datos);

      // 6. Guardar en la base de datos
      const { error: insertError } = await supabase.from('recomendaciones_ia').insert({
        user_id: session.user.id,
        sugerencia_text: resultado.sugerencia_text,
        alerta_detectada: resultado.alerta_detectada,
        fecha_generacion: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // 7. Refrescar historial (la nueva queda arriba)
      await cargarHistorial();
    } catch (error: any) {
      console.error('Error analizando el día:', error);
      const msg =
        error?.message === 'SIN_CLAVE'
          ? 'Falta configurar la clave de la IA en el archivo .env.'
          : error?.message || 'No se pudo completar el análisis. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setAnalizando(false);
    }
  }

  function formatearFecha(iso: string): string {
    const date = new Date(iso);
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    };
    const f = date.toLocaleDateString('es-ES', opciones);
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  const ultima = historial[0];
  const anteriores = historial.slice(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
      }
    >
      {/* Encabezado */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={26} color="#6C5CE7" />
        </View>
        <Text style={styles.heroTitle}>Análisis Nutricional IA</Text>
        <Text style={styles.heroSubtitle}>
          Recibe una recomendación personalizada según lo que registraste hoy y tus metas.
        </Text>

        <TouchableOpacity
          style={[styles.analyzeButton, analizando && styles.buttonDisabled]}
          onPress={analizarDia}
          disabled={analizando}
        >
          {analizando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analizar mi día</Text>
            </>
          )}
        </TouchableOpacity>

        {!claveConfigurada && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={16} color="#B7791F" />
            <Text style={styles.warningText}>
              Estás usando el análisis local. Para activar la IA de Groq, agrega tu clave
              EXPO_PUBLIC_GROQ_API_KEY en el archivo .env.
            </Text>
          </View>
        )}
      </View>

      {/* Último análisis destacado */}
      {cargandoHistorial ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : ultima ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="sparkles" size={18} color="#6C5CE7" />
            <Text style={styles.resultHeaderText}>Tu último análisis</Text>
          </View>

          {ultima.alerta_detectada && (
            <View style={styles.alertBox}>
              <Ionicons name="alert-circle" size={16} color="#D63031" />
              <Text style={styles.alertText}>{ultima.alerta_detectada}</Text>
            </View>
          )}

          <Text style={styles.resultText}>{ultima.sugerencia_text}</Text>
          <Text style={styles.resultDate}>{formatearFecha(ultima.fecha_generacion)}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="nutrition-outline" size={40} color="#B2BEC3" />
          <Text style={styles.emptyText}>
            Aún no has generado ningún análisis. Registra tus comidas en el Diario y pulsa
            "Analizar mi día".
          </Text>
        </View>
      )}

      {/* Historial */}
      {anteriores.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Historial de análisis</Text>
          {anteriores.map((rec) => (
            <View key={rec.id} style={styles.historyCard}>
              {rec.alerta_detectada && (
                <View style={styles.historyAlert}>
                  <Ionicons name="alert-circle-outline" size={14} color="#D63031" />
                  <Text style={styles.historyAlertText}>{rec.alerta_detectada}</Text>
                </View>
              )}
              <Text style={styles.historyText}>{rec.sugerencia_text}</Text>
              <Text style={styles.historyDate}>{formatearFecha(rec.fecha_generacion)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#FBF9FF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1D9FE',
    marginBottom: 20,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E1D9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C5CE7',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF5E7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#B7791F',
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E1D9FE',
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  resultHeaderText: {
    fontSize: 16,
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
  resultText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#2D3436',
  },
  resultDate: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 12,
  },
  historySection: {
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  historyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#D63031',
    fontWeight: '600',
  },
  historyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#2D3436',
  },
  historyDate: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 10,
  },
});
