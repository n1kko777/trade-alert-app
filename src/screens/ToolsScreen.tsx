import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../theme-context';
import RiskCalculator from '../components/calculators/RiskCalculator';
import LeverageCalculator from '../components/calculators/LeverageCalculator';
import ROICalculator from '../components/calculators/ROICalculator';

type ToolCategory = 'risk' | 'profit' | 'converters';

type Tool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  component: React.ComponentType<{ onClose?: () => void }>;
};

const TOOLS: Tool[] = [
  {
    id: 'risk-calculator',
    name: 'Риск и размер позиции',
    description: 'Расчет размера позиции на основе риска',
    icon: 'shield',
    category: 'risk',
    component: RiskCalculator,
  },
  {
    id: 'leverage-calculator',
    name: 'Калькулятор плеча',
    description: 'Маржа, ликвидация, плечо',
    icon: 'trending-up',
    category: 'risk',
    component: LeverageCalculator,
  },
  {
    id: 'roi-calculator',
    name: 'Калькулятор ROI',
    description: 'Прибыль, убыток, рентабельность',
    icon: 'percent',
    category: 'profit',
    component: ROICalculator,
  },
];

const CATEGORIES: { id: ToolCategory; name: string }[] = [
  { id: 'risk', name: 'Управление риском' },
  { id: 'profit', name: 'Расчет прибыли' },
  { id: 'converters', name: 'Конвертеры' },
];

const ToolIcon = ({ icon, color }: { icon: string; color: string }) => {
  // Simple icon representations using text symbols
  const iconMap: Record<string, string> = {
    shield: '\u{1F6E1}',
    'trending-up': '\u{1F4C8}',
    percent: '%',
    calculator: '\u{1F5A9}',
    exchange: '\u{21C4}',
  };

  return (
    <Text style={{ fontSize: 24, color }}>
      {iconMap[icon] || '\u{1F4CA}'}
    </Text>
  );
};

export default function ToolsScreen() {
  const { theme } = useTheme();
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.appBackground,
        },
        scroll: {
          padding: 20,
          paddingBottom: 140,
        },
        header: {
          marginBottom: 24,
        },
        title: {
          fontFamily: 'SpaceGrotesk_700Bold',
          fontSize: 28,
          color: theme.colors.textPrimary,
        },
        subtitle: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 14,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
        categorySection: {
          marginBottom: 24,
        },
        categoryTitle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 16,
          color: theme.colors.textSecondary,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        toolsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        },
        toolCard: {
          width: '100%',
          backgroundColor: theme.colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        },
        toolCardHalf: {
          width: '48%',
        },
        toolCardExpanded: {
          borderColor: theme.colors.accent,
          borderWidth: 2,
        },
        toolHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        toolIconContainer: {
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: theme.colors.metricCard,
          alignItems: 'center',
          justifyContent: 'center',
        },
        toolInfo: {
          flex: 1,
        },
        toolName: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 15,
          color: theme.colors.textPrimary,
        },
        toolDescription: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 12,
          color: theme.colors.textMuted,
          marginTop: 2,
        },
        toolArrow: {
          fontFamily: 'SpaceGrotesk_500Medium',
          fontSize: 18,
          color: theme.colors.accent,
        },
        expandedContent: {
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        modalContent: {
          flex: 1,
          backgroundColor: theme.colors.appBackground,
          marginTop: 60,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.2,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        modalHandle: {
          width: 40,
          height: 4,
          backgroundColor: theme.colors.divider,
          borderRadius: 2,
          alignSelf: 'center',
          marginBottom: 20,
        },
        emptyCategory: {
          backgroundColor: theme.colors.metricCard,
          borderRadius: 12,
          padding: 20,
          alignItems: 'center',
        },
        emptyText: {
          fontFamily: 'SpaceGrotesk_400Regular',
          fontSize: 14,
          color: theme.colors.textMuted,
        },
        quickActions: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 24,
        },
        quickAction: {
          flex: 1,
          backgroundColor: theme.colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        },
        quickActionSecondary: {
          backgroundColor: theme.colors.metricCard,
        },
        quickActionText: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 13,
          color: theme.colors.buttonText,
        },
        quickActionTextSecondary: {
          color: theme.colors.textPrimary,
        },
      }),
    [theme]
  );

  const handleToolPress = (tool: Tool) => {
    // Open as modal on full press
    setActiveTool(tool);
  };

  const handleExpandToggle = (toolId: string) => {
    setExpandedTool(expandedTool === toolId ? null : toolId);
  };

  const renderToolCard = (tool: Tool, isHalf: boolean = false) => {
    const isExpanded = expandedTool === tool.id;
    const ToolComponent = tool.component;

    return (
      <View
        key={tool.id}
        style={[
          styles.toolCard,
          isHalf && styles.toolCardHalf,
          isExpanded && styles.toolCardExpanded,
        ]}
      >
        <TouchableOpacity
          style={styles.toolHeader}
          onPress={() => handleToolPress(tool)}
          onLongPress={() => handleExpandToggle(tool.id)}
        >
          <View style={styles.toolIconContainer}>
            <ToolIcon icon={tool.icon} color={theme.colors.accent} />
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDescription}>{tool.description}</Text>
          </View>
          <Text style={styles.toolArrow}>{isExpanded ? '\u2212' : '\u2192'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <ToolComponent onClose={() => setExpandedTool(null)} />
          </View>
        )}
      </View>
    );
  };

  const getToolsByCategory = (categoryId: ToolCategory) => {
    return TOOLS.filter((tool) => tool.category === categoryId);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Инструменты</Text>
          <Text style={styles.subtitle}>
            Калькуляторы для трейдинга
          </Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setActiveTool(TOOLS[0])}
          >
            <Text style={styles.quickActionText}>Расчет риска</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionSecondary]}
            onPress={() => setActiveTool(TOOLS[2])}
          >
            <Text style={[styles.quickActionText, styles.quickActionTextSecondary]}>
              Расчет ROI
            </Text>
          </TouchableOpacity>
        </View>

        {CATEGORIES.map((category) => {
          const categoryTools = getToolsByCategory(category.id);

          return (
            <View key={category.id} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              {categoryTools.length > 0 ? (
                <View style={styles.toolsGrid}>
                  {categoryTools.map((tool) => renderToolCard(tool, false))}
                </View>
              ) : (
                <View style={styles.emptyCategory}>
                  <Text style={styles.emptyText}>Скоро появятся новые инструменты</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={activeTool !== null}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent
        onRequestClose={() => setActiveTool(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveTool(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            {activeTool && (
              <activeTool.component onClose={() => setActiveTool(null)} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
