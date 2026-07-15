import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

interface CatalogoAlimento {
  id: string;
  nombre: string;
  categoria_alimento: string | null;
  kcal_100g: number;
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
}

interface AddFoodScreenProps {
  onSelectFood: (food: CatalogoAlimento) => void;
  onBack: () => void;
}

export default function AddFoodScreen({ onSelectFood, onBack }: AddFoodScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [foods, setFoods] = useState<CatalogoAlimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoods();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchFoods() {
    setLoading(true);
    let query = supabase
      .from('catalogo_alimentos')
      .select('*')
      .order('nombre');

    if (searchTerm.trim()) {
      query = query.ilike('nombre', `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching foods:', error);
    } else {
      setFoods(data || []);
    }
    setLoading(false);
  }

  function getCategoryIcon(category: string | null): keyof typeof Ionicons.glyphMap {
    switch (category) {
      case 'Proteina': return 'fish-outline';
      case 'Cereal': return 'leaf-outline';
      case 'Fruta': return 'nutrition-outline';
      case 'Lacteo': return 'water-outline';
      case 'Verdura': return 'flower-outline';
      case 'Legumbre': return 'grid-outline';
      case 'Grasa': return 'flame-outline';
      default: return 'ellipse-outline';
    }
  }

  function getCategoryColor(category: string | null): string {
    switch (category) {
      case 'Proteina': return '#E17055';
      case 'Cereal': return '#FDCB6E';
      case 'Fruta': return '#00B894';
      case 'Lacteo': return '#74B9FF';
      case 'Verdura': return '#00CEC9';
      case 'Legumbre': return '#A29BFE';
      case 'Grasa': return '#FD79A8';
      default: return '#636E72';
    }
  }

  function renderFoodItem({ item }: { item: CatalogoAlimento }) {
    return (
      <TouchableOpacity style={styles.foodItem} onPress={() => onSelectFood(item)}>
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.categoria_alimento) + '20' }]}>
          <Ionicons name={getCategoryIcon(item.categoria_alimento)} size={20} color={getCategoryColor(item.categoria_alimento)} />
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.nombre}</Text>
          <Text style={styles.foodCategory}>{item.categoria_alimento || 'General'}</Text>
        </View>
        <View style={styles.foodKcal}>
          <Text style={styles.kcalValue}>{item.kcal_100g}</Text>
          <Text style={styles.kcalUnit}>kcal/100g</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>
        <Text style={styles.title}>Buscar Alimento</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#636E72" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en el catálogo..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoFocus
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#B2BEC3" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00B894" />
        </View>
      ) : foods.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={48} color="#B2BEC3" />
          <Text style={styles.emptyText}>No se encontraron alimentos</Text>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => item.id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#636E72',
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  foodCategory: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  foodKcal: {
    alignItems: 'flex-end',
  },
  kcalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B894',
  },
  kcalUnit: {
    fontSize: 11,
    color: '#636E72',
  },
});
