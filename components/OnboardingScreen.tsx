import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface OnboardingScreenProps {
  session: Session;
  onComplete: () => void;
}

export default function OnboardingScreen({ session, onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [saving, setSaving] = useState(false);

  // Step 1: Fecha de nacimiento
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');

  // Step 2: Sexo
  const [sexo, setSexo] = useState('');

  // Step 3: Peso y Estatura
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');

  // Step 4: Objetivo
  const [objetivo, setObjetivo] = useState('');

  const progressPercent = (step / totalSteps) * 100;

  function validateStep(): boolean {
    switch (step) {
      case 1: {
        if (!dia || !mes || !anio) {
          Alert.alert('Atención', 'Completa tu fecha de nacimiento.');
          return false;
        }
        const d = parseInt(dia, 10);
        const m = parseInt(mes, 10);
        const y = parseInt(anio, 10);
        if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
          Alert.alert('Fecha inválida', 'Ingresa una fecha de nacimiento válida.');
          return false;
        }
        return true;
      }
      case 2:
        if (!sexo) {
          Alert.alert('Atención', 'Selecciona tu sexo biológico.');
          return false;
        }
        return true;
      case 3:
        if (!peso || !estatura) {
          Alert.alert('Atención', 'Ingresa tu peso y estatura.');
          return false;
        }
        if (parseFloat(peso) <= 0 || parseInt(estatura, 10) <= 0) {
          Alert.alert('Datos inválidos', 'El peso y la estatura deben ser mayores a cero.');
          return false;
        }
        return true;
      case 4:
        if (!objetivo) {
          Alert.alert('Atención', 'Selecciona tu objetivo nutricional.');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const d = parseInt(dia, 10);
      const m = parseInt(mes, 10);
      const y = parseInt(anio, 10);
      const fecha = `${y}-${pad(m)}-${pad(d)}`;

      // 1. Guardar perfil biométrico
      const { error: profileError } = await supabase
        .from('perfiles_biometricos')
        .upsert({
          user_id: session.user.id,
          fecha_nacimiento: fecha,
          sexo,
          peso: parseFloat(peso),
          estatura: parseInt(estatura, 10),
          objetivo,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // 2. Calcular y guardar metas nutricionales (Mifflin-St Jeor)
      const age = new Date().getFullYear() - y;
      const w = parseFloat(peso);
      const h = parseInt(estatura, 10);

      let bmr = 10 * w + 6.25 * h - 5 * age;
      bmr += sexo === 'Masculino' ? 5 : -161;

      let tdee = bmr * 1.55;
      let calObjetivo = tdee;
      let pPct = 0.3, cPct = 0.4, fPct = 0.3;

      if (objetivo === 'Bajar de peso') {
        calObjetivo = tdee - 500;
        pPct = 0.4; cPct = 0.3; fPct = 0.3;
      } else if (objetivo === 'Ganar masa muscular') {
        calObjetivo = tdee + 500;
        pPct = 0.3; cPct = 0.45; fPct = 0.25;
      }

      const now = new Date();
      const todayISO = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      const { error: metasError } = await supabase
        .from('metas_nutricionales')
        .insert({
          user_id: session.user.id,
          fecha_inicio: todayISO,
          calorias_objetivo: Math.round(calObjetivo),
          proteinas_objetivo_g: Math.round((calObjetivo * pPct) / 4),
          carbohidratos_objetivo_g: Math.round((calObjetivo * cPct) / 4),
          grasas_objetivo_g: Math.round((calObjetivo * fPct) / 9),
        });

      if (metasError) console.error('Error guardando metas:', metasError);

      onComplete();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo guardar tu perfil.');
    } finally {
      setSaving(false);
    }
  }

  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepQuestion}>¿Cuál es tu fecha de nacimiento?</Text>
            <Text style={styles.stepDescription}>
              Fecha para cálculo dinámico de edad.
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Día</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD"
                  value={dia}
                  onChangeText={setDia}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Mes</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="MM"
                  value={mes}
                  onChangeText={setMes}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Año</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="AAAA"
                  value={anio}
                  onChangeText={setAnio}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#00B894" />
              <Text style={styles.infoText}>
                Utilizamos esta información para personalizar tus recomendaciones nutricionales basadas en parámetros biométricos precisos.
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepQuestion}>¿Cuál es tu sexo biológico?</Text>
            <Text style={styles.stepDescription}>
              Lo usamos para calcular tu metabolismo basal con mayor precisión.
            </Text>
            <View style={styles.optionsContainer}>
              {['Masculino', 'Femenino'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionCard, sexo === option && styles.optionCardActive]}
                  onPress={() => setSexo(option)}
                >
                  <View style={[styles.optionIconCircle, sexo === option && styles.optionIconCircleActive]}>
                    <Ionicons
                      name={option === 'Masculino' ? 'male' : 'female'}
                      size={32}
                      color={sexo === option ? '#FFFFFF' : '#00B894'}
                    />
                  </View>
                  <Text style={[styles.optionText, sexo === option && styles.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepQuestion}>¿Cuál es tu peso y estatura?</Text>
            <Text style={styles.stepDescription}>
              Utilizamos tu peso para calcular tu metabolismo basal y personalizar tus recomendaciones nutricionales.
            </Text>

            <View style={styles.measureCard}>
              <Text style={styles.measureLabel}>Peso actual</Text>
              <View style={styles.measureInputRow}>
                <TextInput
                  style={styles.measureInput}
                  value={peso}
                  onChangeText={setPeso}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  placeholder="0"
                />
                <Text style={styles.measureUnit}>kg</Text>
              </View>
              <Text style={styles.measureHint}>Peso en kg. CHECK ({'>'} 0)</Text>
            </View>

            <View style={styles.measureCard}>
              <Text style={styles.measureLabel}>Estatura</Text>
              <View style={styles.measureInputRow}>
                <TextInput
                  style={styles.measureInput}
                  value={estatura}
                  onChangeText={setEstatura}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="0"
                />
                <Text style={styles.measureUnit}>cm</Text>
              </View>
              <Text style={styles.measureHint}>Estatura en cm. CHECK ({'>'} 0)</Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepQuestion}>¿Cuál es tu objetivo?</Text>
            <Text style={styles.stepDescription}>
              Selecciona el objetivo principal para que la IA personalice tus recomendaciones nutricionales y rutinas.
            </Text>
            <View style={styles.goalOptions}>
              {[
                { value: 'Bajar de peso', icon: 'trending-down-outline' as const, desc: 'Déficit calórico calculado para reducir grasa corporal preservando la salud.' },
                { value: 'Mantener peso', icon: 'swap-horizontal-outline' as const, desc: 'Equilibrio calórico perfecto para estabilizar tu composición corporal actual.' },
                { value: 'Ganar masa muscular', icon: 'trending-up-outline' as const, desc: 'Superávit calórico controlado y alto en proteínas para maximizar el crecimiento muscular.' },
              ].map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[styles.goalCard, objetivo === goal.value && styles.goalCardActive]}
                  onPress={() => setObjetivo(goal.value)}
                >
                  <View style={[styles.goalIconCircle, objetivo === goal.value && styles.goalIconCircleActive]}>
                    <Ionicons
                      name={goal.icon}
                      size={28}
                      color={objetivo === goal.value ? '#FFFFFF' : '#00B894'}
                    />
                  </View>
                  <Text style={[styles.goalTitle, objetivo === goal.value && styles.goalTitleActive]}>
                    {goal.value}
                  </Text>
                  <Text style={styles.goalDesc}>{goal.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#2D3436" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>Alimétrica IA</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>PASO {step} DE {totalSteps}</Text>
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backFooterButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={18} color="#636E72" />
            <Text style={styles.backFooterText}>Anterior</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          style={[styles.nextButton, saving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === totalSteps ? 'Finalizar' : 'Continuar'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B894',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
    textAlign: 'right',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  stepContent: {
    flex: 1,
    paddingTop: 20,
  },
  stepQuestion: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
    lineHeight: 34,
  },
  stepDescription: {
    fontSize: 15,
    color: '#636E72',
    lineHeight: 22,
    marginBottom: 30,
  },

  // Step 1: Date
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E6F8F3',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2D3436',
    lineHeight: 20,
  },

  // Step 2: Sexo
  optionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  optionCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#E6F8F3',
  },
  optionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F8F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconCircleActive: {
    backgroundColor: '#00B894',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  optionTextActive: {
    color: '#00B894',
  },

  // Step 3: Peso y Estatura
  measureCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  measureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
  },
  measureInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  measureInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00B894',
    textAlign: 'center',
    minWidth: 100,
  },
  measureUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#636E72',
    marginLeft: 4,
  },
  measureHint: {
    fontSize: 12,
    color: '#B2BEC3',
    backgroundColor: '#E6F8F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // Step 4: Objetivo
  goalOptions: {
    gap: 12,
  },
  goalCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  goalCardActive: {
    borderColor: '#00B894',
    backgroundColor: '#E6F8F3',
  },
  goalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F8F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconCircleActive: {
    backgroundColor: '#00B894',
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 6,
  },
  goalTitleActive: {
    color: '#00B894',
  },
  goalDesc: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 18,
    textAlign: 'center',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  backFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flex: 1,
  },
  backFooterText: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
    marginLeft: 4,
  },
  nextButton: {
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
