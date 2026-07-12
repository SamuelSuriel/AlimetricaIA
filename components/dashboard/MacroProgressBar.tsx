import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MacroProgressBarProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}

export default function MacroProgressBar({ label, consumed, goal, color }: MacroProgressBarProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const progressPercent = Math.min((consumed / safeGoal) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          {Math.round(consumed)} / {Math.round(goal)}g
        </Text>
      </View>
      <View style={styles.track}>
        <View 
          style={[
            styles.fill, 
            { width: `${progressPercent}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  values: {
    fontSize: 13,
    color: '#636E72',
  },
  track: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
