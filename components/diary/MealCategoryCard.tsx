import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FoodItem {
  id: string;
  nombre: string;
  porcion_g: number;
  calorias: number;
  detalle_id: string;
}

interface MealCategoryCardProps {
  categoria: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: FoodItem[];
  totalCalorias: number;
  onAddFood: () => void;
  onDeleteItem: (detalleId: string) => void;
}

export default function MealCategoryCard({
  categoria,
  icon,
  items,
  totalCalorias,
  onAddFood,
  onDeleteItem,
}: MealCategoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={20} color="#00B894" />
          </View>
          <Text style={styles.categoryName}>{categoria}</Text>
        </View>
        <Text style={styles.totalKcal}>{Math.round(totalCalorias)} kcal</Text>
      </View>

      {items.length > 0 && (
        <View style={styles.itemsList}>
          {items.map((item) => (
            <View key={item.detalle_id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemDetail}>
                  {item.porcion_g}g · {Math.round(item.calorias)} kcal
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDeleteItem(item.detalle_id)}
              >
                <Ionicons name="close-circle" size={22} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={onAddFood}>
        <Ionicons name="add-circle-outline" size={20} color="#00B894" />
        <Text style={styles.addButtonText}>Agregar alimento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F8F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3436',
  },
  totalKcal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00B894',
  },
  itemsList: {
    marginTop: 8,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#2D3436',
    fontWeight: '500',
  },
  itemDetail: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addButtonText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
    marginLeft: 6,
  },
});
