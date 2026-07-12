import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import MealCategoryCard from './MealCategoryCard';
import AddFoodScreen from './AddFoodScreen';
import PortionSelector from './PortionSelector';

// Tipos
interface CatalogoAlimento {
  id: string;
  nombre: string;
  categoria_alimento: string | null;
  kcal_100g: number;
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

interface DetalleComida {
  id: string;
  comida_id: string;
  alimento_id: string;
  porcion_g: number;
  catalogo_alimentos: CatalogoAlimento;
}

interface Comida {
  id: string;
  user_id: string;
  categoria: string;
  fecha: string;
  detalle_comidas: DetalleComida[];
}

interface ConsumoResumen {
  calorias_consumidas: number;
  proteinas_consumidas: number;
  carbohidratos_consumidos: number;
  grasas_consumidas: number;
}

type DiaryView = 'main' | 'addFood' | 'selectPortion';

type MealCategoria = 'Desayuno' | 'Almuerzo' | 'Cena' | 'Merienda';

interface MealConfig {
  categoria: MealCategoria;
  icon: keyof typeof Ionicons.glyphMap;
}

const MEAL_CATEGORIES: MealConfig[] = [
  { categoria: 'Desayuno', icon: 'sunny-outline' },
  { categoria: 'Almuerzo', icon: 'restaurant-outline' },
  { categoria: 'Cena', icon: 'moon-outline' },
  { categoria: 'Merienda', icon: 'cafe-outline' },
];

interface DiaryScreenProps {
  session: Session;
}

export default function DiaryScreen({ session }: DiaryScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [resumen, setResumen] = useState<ConsumoResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sub-navigation state
  const [diaryView, setDiaryView] = useState<DiaryView>('main');
  const [activeCategoria, setActiveCategoria] = useState<MealCategoria>('Desayuno');
  const [selectedFood, setSelectedFood] = useState<CatalogoAlimento | null>(null);

  const dateString = formatDateISO(selectedDate);

  useEffect(() => {
    fetchMeals();
    fetchResumen();
  }, [dateString]);

  function formatDateISO(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateDisplay(date: Date): string {
    const today = new Date();
    const todayStr = formatDateISO(today);
    const dateStr = formatDateISO(date);

    if (dateStr === todayStr) return 'Hoy';

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === formatDateISO(yesterday)) return 'Ayer';

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function changeDate(direction: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  }

  async function fetchMeals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comidas')
        .select('*, detalle_comidas(*, catalogo_alimentos(*))')
        .eq('user_id', session.user.id)
        .eq('fecha', dateString);

      if (error) throw error;
      setComidas(data || []);
    } catch (error: any) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchResumen() {
    try {
      const { data, error } = await supabase
        .from('vw_consumo_diario')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('fecha', dateString)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setResumen(data || null);
    } catch (error: any) {
      console.error('Error fetching resumen:', error);
    }
  }

  function getMealItems(categoria: string) {
    const comida = comidas.find((c) => c.categoria === categoria);
    if (!comida || !comida.detalle_comidas) return [];

    return comida.detalle_comidas.map((d) => ({
      id: d.alimento_id,
      nombre: d.catalogo_alimentos.nombre,
      porcion_g: d.porcion_g,
      calorias: (d.catalogo_alimentos.kcal_100g * d.porcion_g) / 100,
      detalle_id: d.id,
    }));
  }

  function getMealTotalKcal(categoria: string) {
    const items = getMealItems(categoria);
    return items.reduce((sum, item) => sum + item.calorias, 0);
  }

  function handleAddFood(categoria: MealCategoria) {
    setActiveCategoria(categoria);
    setDiaryView('addFood');
  }

  function handleSelectFood(food: CatalogoAlimento) {
    setSelectedFood(food);
    setDiaryView('selectPortion');
  }

  async function handleConfirmPortion(porcionG: number) {
    if (!selectedFood) return;
    setSaving(true);

    try {
      // Step 1: Find or create the meal entry for this category + date
      let comidaId: string;

      const existingComida = comidas.find((c) => c.categoria === activeCategoria);

      if (existingComida) {
        comidaId = existingComida.id;
      } else {
        const { data: newComida, error: comidaError } = await supabase
          .from('comidas')
          .insert({
            user_id: session.user.id,
            categoria: activeCategoria,
            fecha: dateString,
          })
          .select()
          .single();

        if (comidaError) throw comidaError;
        comidaId = newComida.id;
      }

      // Step 2: Insert the food detail
      const { error: detalleError } = await supabase
        .from('detalle_comidas')
        .insert({
          comida_id: comidaId,
          alimento_id: selectedFood.id,
          porcion_g: porcionG,
        });

      if (detalleError) throw detalleError;

      // Refresh data
      await fetchMeals();
      await fetchResumen();

      // Navigate back
      setDiaryView('main');
      setSelectedFood(null);
    } catch (error: any) {
      console.error('Error saving food:', error);
      Alert.alert('Error', 'No se pudo guardar el alimento. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(detalleId: string) {
    Alert.alert(
      'Eliminar alimento',
      '¿Estás seguro de que quieres eliminar este alimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('detalle_comidas')
                .delete()
                .eq('id', detalleId);

              if (error) throw error;
              await fetchMeals();
              await fetchResumen();
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar el alimento.');
            }
          },
        },
      ]
    );
  }

  // --- Sub-screen rendering ---

  if (diaryView === 'addFood') {
    return (
      <AddFoodScreen
        onSelectFood={handleSelectFood}
        onBack={() => setDiaryView('main')}
      />
    );
  }

  if (diaryView === 'selectPortion' && selectedFood) {
    return (
      <PortionSelector
        food={selectedFood}
        onConfirm={handleConfirmPortion}
        onBack={() => setDiaryView('addFood')}
        saving={saving}
      />
    );
  }

  // --- Main diary view ---

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={22} color="#2D3436" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.dateCenter}>
          <Ionicons name="calendar-outline" size={18} color="#00B894" />
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={22} color="#2D3436" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00B894" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen del Día</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#E17055' }]}>
                  {resumen ? Math.round(resumen.calorias_consumidas) : 0}
                </Text>
                <Text style={styles.summaryLabel}>Calorías</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#00B894' }]}>
                  {resumen ? Math.round(resumen.proteinas_consumidas) : 0}g
                </Text>
                <Text style={styles.summaryLabel}>Proteínas</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#FDCB6E' }]}>
                  {resumen ? Math.round(resumen.carbohidratos_consumidos) : 0}g
                </Text>
                <Text style={styles.summaryLabel}>Carbs</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
                  {resumen ? Math.round(resumen.grasas_consumidas) : 0}g
                </Text>
                <Text style={styles.summaryLabel}>Grasas</Text>
              </View>
            </View>
          </View>

          {/* Meal Category Cards */}
          {MEAL_CATEGORIES.map((meal) => (
            <MealCategoryCard
              key={meal.categoria}
              categoria={meal.categoria}
              icon={meal.icon}
              items={getMealItems(meal.categoria)}
              totalCalorias={getMealTotalKcal(meal.categoria)}
              onAddFood={() => handleAddFood(meal.categoria)}
              onDeleteItem={handleDeleteItem}
            />
          ))}
        </ScrollView>
      )}
    </View>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E6F8F3',
    borderRadius: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
});
