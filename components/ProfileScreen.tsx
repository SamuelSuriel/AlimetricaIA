import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

interface ProfileScreenProps {
  session: Session;
  onLogout: () => void;
}

export default function ProfileScreen({ session, onLogout }: ProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino' | ''>('');
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');
  const [objetivo, setObjetivo] = useState<'Bajar de peso' | 'Mantener peso' | 'Ganar masa muscular' | ''>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('perfiles_biometricos')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // PGRST116 means zero rows returned from single(), which is normal if they haven't created a profile yet.
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        if (data.fecha_nacimiento) {
          const parts = data.fecha_nacimiento.split('-');
          if (parts.length === 3) {
            setAnio(parts[0]);
            setMes(parts[1]);
            setDia(parts[2]);
          }
        }
        setSexo(data.sexo);
        setPeso(data.peso.toString());
        setEstatura(data.estatura.toString());
        setObjetivo(data.objetivo);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!dia || !mes || !anio || !sexo || !peso || !estatura || !objetivo) {
      Alert.alert('Atención', 'Por favor completa todos los campos.');
      return;
    }

    const d = parseInt(dia, 10);
    const m = parseInt(mes, 10);
    const y = parseInt(anio, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > new Date().getFullYear()) {
      Alert.alert('Fecha inválida', 'Por favor ingresa una fecha de nacimiento válida.');
      return;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fecha = `${y}-${pad(m)}-${pad(d)}`;

    setSaving(true);
    try {
      const { error } = await supabase
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

      if (error) throw error;
      Alert.alert('¡Listo!', 'Tu perfil ha sido guardado correctamente.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B894" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Sección Fecha de Nacimiento */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fecha de Nacimiento</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
            value={dia}
            onChangeText={setDia}
          />
          <Text style={styles.dateSeparator}>/</Text>
          <TextInput
            style={[styles.input, styles.dateInput]}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            value={mes}
            onChangeText={setMes}
          />
          <Text style={styles.dateSeparator}>/</Text>
          <TextInput
            style={[styles.input, styles.yearInput]}
            placeholder="AAAA"
            keyboardType="number-pad"
            maxLength={4}
            value={anio}
            onChangeText={setAnio}
          />
        </View>
      </View>

      {/* Sección Sexo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sexo</Text>
        <View style={styles.pillsRow}>
          <TouchableOpacity 
            style={[styles.pill, sexo === 'Masculino' && styles.pillActive]}
            onPress={() => setSexo('Masculino')}
          >
            <Text style={[styles.pillText, sexo === 'Masculino' && styles.pillTextActive]}>Masculino</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.pill, sexo === 'Femenino' && styles.pillActive]}
            onPress={() => setSexo('Femenino')}
          >
            <Text style={[styles.pillText, sexo === 'Femenino' && styles.pillTextActive]}>Femenino</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección Medidas */}
      <View style={styles.rowSection}>
        <View style={[styles.section, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.sectionTitle}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 70.5"
            keyboardType="decimal-pad"
            value={peso}
            onChangeText={setPeso}
          />
        </View>
        <View style={[styles.section, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.sectionTitle}>Estatura (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 175"
            keyboardType="number-pad"
            value={estatura}
            onChangeText={setEstatura}
          />
        </View>
      </View>

      {/* Sección Objetivo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Objetivo Nutricional</Text>
        <View style={styles.goalsContainer}>
          {['Bajar de peso', 'Mantener peso', 'Ganar masa muscular'].map((obj) => (
            <TouchableOpacity 
              key={obj}
              style={[styles.goalPill, objetivo === obj && styles.goalPillActive]}
              onPress={() => setObjetivo(obj as any)}
            >
              <Text style={[styles.goalPillText, objetivo === obj && styles.goalPillTextActive]}>{obj}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Botón Guardar */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        )}
      </TouchableOpacity>

      {/* Botón Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  rowSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#2D3436',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    textAlign: 'center',
  },
  yearInput: {
    flex: 1.5,
    textAlign: 'center',
  },
  dateSeparator: {
    fontSize: 20,
    color: '#B2BEC3',
    marginHorizontal: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 25,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  pillText: {
    fontSize: 15,
    color: '#636E72',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  goalsContainer: {
    gap: 10,
  },
  goalPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  goalPillActive: {
    backgroundColor: '#E6F8F3',
    borderColor: '#00B894',
  },
  goalPillText: {
    fontSize: 15,
    color: '#636E72',
    fontWeight: '500',
  },
  goalPillTextActive: {
    color: '#00B894',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#00B894',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    height: 56,
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
});
