import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CatalogoAlimento {
  id: string;
  nombre: string;
  categoria_alimento: string | null;
  kcal_100g: number;
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

interface PortionSelectorProps {
  food: CatalogoAlimento;
  onConfirm: (porcionG: number) => void;
  onBack: () => void;
  saving: boolean;
}

export default function PortionSelector({ food, onConfirm, onBack, saving }: PortionSelectorProps) {
  const [porcion, setPorcion] = useState('100');

  const porcionNum = parseFloat(porcion) || 0;
  const factor = porcionNum / 100;

  const calCalculadas = Math.round(food.kcal_100g * factor);
  const protCalculadas = (food.proteinas_g * factor).toFixed(1);
  const carbCalculadas = (food.carbohidratos_g * factor).toFixed(1);
  const grasCalculadas = (food.grasas_g * factor).toFixed(1);

  function handleConfirm() {
    const g = parseInt(porcion, 10);
    if (!g || g <= 0) {
      Alert.alert('Error', 'Ingresa una porción válida en gramos.');
      return;
    }
    onConfirm(g);
  }

  const quickPortions = [50, 100, 150, 200, 250];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>
        <Text style={styles.title}>Seleccionar Porción</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Food Info Card */}
        <View style={styles.foodCard}>
          <Text style={styles.foodName}>{food.nombre}</Text>
          <Text style={styles.foodBase}>Valores por 100g</Text>
          <View style={styles.baseNutrients}>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{food.kcal_100g}</Text>
              <Text style={styles.nutrientLabel}>kcal</Text>
            </View>
            <View style={styles.nutrientDivider} />
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{food.proteinas_g}g</Text>
              <Text style={styles.nutrientLabel}>Prot.</Text>
            </View>
            <View style={styles.nutrientDivider} />
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{food.carbohidratos_g}g</Text>
              <Text style={styles.nutrientLabel}>Carbs</Text>
            </View>
            <View style={styles.nutrientDivider} />
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientValue}>{food.grasas_g}g</Text>
              <Text style={styles.nutrientLabel}>Grasas</Text>
            </View>
          </View>
        </View>

        {/* Portion Input */}
        <View style={styles.portionSection}>
          <Text style={styles.sectionTitle}>Porción (gramos)</Text>
          <View style={styles.portionInputRow}>
            <TextInput
              style={styles.portionInput}
              value={porcion}
              onChangeText={setPorcion}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.gramsLabel}>g</Text>
          </View>

          <View style={styles.quickPortions}>
            {quickPortions.map((qp) => (
              <TouchableOpacity
                key={qp}
                style={[styles.quickButton, porcion === qp.toString() && styles.quickButtonActive]}
                onPress={() => setPorcion(qp.toString())}
              >
                <Text style={[styles.quickButtonText, porcion === qp.toString() && styles.quickButtonTextActive]}>
                  {qp}g
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calculated Nutrients */}
        <View style={styles.calculatedSection}>
          <Text style={styles.sectionTitle}>Tu porción aporta</Text>
          <View style={styles.calculatedGrid}>
            <View style={[styles.calcCard, { backgroundColor: '#FFF3E6' }]}>
              <Text style={[styles.calcValue, { color: '#E17055' }]}>{calCalculadas}</Text>
              <Text style={styles.calcLabel}>Calorías</Text>
            </View>
            <View style={[styles.calcCard, { backgroundColor: '#E6F8F3' }]}>
              <Text style={[styles.calcValue, { color: '#00B894' }]}>{protCalculadas}g</Text>
              <Text style={styles.calcLabel}>Proteínas</Text>
            </View>
            <View style={[styles.calcCard, { backgroundColor: '#FFF8E1' }]}>
              <Text style={[styles.calcValue, { color: '#FDCB6E' }]}>{carbCalculadas}g</Text>
              <Text style={styles.calcLabel}>Carbs</Text>
            </View>
            <View style={[styles.calcCard, { backgroundColor: '#FEECEC' }]}>
              <Text style={[styles.calcValue, { color: '#FF6B6B' }]}>{grasCalculadas}g</Text>
              <Text style={styles.calcLabel}>Grasas</Text>
            </View>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.confirmButtonText}>
            {saving ? 'Guardando...' : 'Agregar al Diario'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  foodBase: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 16,
  },
  baseNutrients: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutrientItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  nutrientLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  nutrientDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E9ECEF',
  },
  portionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 10,
  },
  portionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 12,
  },
  portionInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
    textAlign: 'center',
  },
  gramsLabel: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: '500',
  },
  quickPortions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  quickButtonTextActive: {
    color: '#FFFFFF',
  },
  calculatedSection: {
    marginBottom: 24,
  },
  calculatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  calcCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  calcValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  calcLabel: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#00B894',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
