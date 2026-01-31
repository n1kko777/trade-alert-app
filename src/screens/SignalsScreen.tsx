import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '../theme-context';
import { signalService, type Signal, type SignalStats, type SignalFilter } from '../services/signals';
import SignalCard from '../components/SignalCard';

type TabType = 'active' | 'history';

interface SignalsScreenProps {
  isPro?: boolean;
  onUpgrade?: () => void;
}

export default function SignalsScreen({ isPro = false, onUpgrade }: SignalsScreenProps) {
  const { theme } = useTheme();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [filter, setFilter] = useState<SignalFilter>({});
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(() => {
    const allSignals = signalService.getAllSignals();
    if (allSignals.length === 0) {
      signalService.initializeDemo();
    }
    setSignals(signalService.getAllSignals());
    setStats(signalService.getStats());
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribe = signalService.subscribe((updatedSignals) => {
      setSignals(updatedSignals);
      setStats(signalService.getStats());
    });

    return () => unsubscribe();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadData();
      setRefreshing(false);
    }, 500);
  }, [loadData]);

  const filteredSignals = useMemo(() => {
    let result = signals;

    // Filter by tab
    if (activeTab === 'active') {
      result = result.filter(s => s.status === 'active' || s.status === 'pending');
    } else {
      result = result.filter(s => s.status === 'closed');
    }

    // Apply search/symbol filter
    if (searchText) {
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        s.exchange.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply other filters
    if (filter.exchange) {
      result = result.filter(s => s.exchange === filter.exchange);
    }
    if (filter.direction) {
      result = result.filter(s => s.direction === filter.direction);
    }

    return result;
  }, [signals, activeTab, searchText, filter]);

  // Limit signals for free users
  const displayedSignals = useMemo(() => {
    if (isPro) return filteredSignals;
    return filteredSignals.slice(0, 3);
  }, [filteredSignals, isPro]);

  const handleSignalPress = useCallback((signal: Signal) => {
    // TODO: Navigate to signal details
    console.log('Signal pressed:', signal.id);
  }, []);

  const renderSignal = useCallback(({ item }: { item: Signal }) => (
    <SignalCard signal={item} onPress={handleSignalPress} />
  ), [handleSignalPress]);

  const keyExtractor = useCallback((item: Signal) => item.id, []);

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={[styles.statsCard, { backgroundColor: theme.colors.panel }]}>
        <Text style={[styles.statsTitle, { color: theme.colors.textPrimary }]}>
          Statistica
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Win Rate</Text>
            <Text style={[
              styles.statValue,
              { color: stats.winRate >= 50 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.winRate.toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Total Signals</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {stats.totalSignals}
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Avg Profit</Text>
            <Text style={[
              styles.statValue,
              { color: stats.avgProfit >= 0 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.avgProfit >= 0 ? '+' : ''}{stats.avgProfit.toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: theme.colors.metricCard }]}>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Total Profit</Text>
            <Text style={[
              styles.statValue,
              { color: stats.totalProfit >= 0 ? theme.colors.changeUpText : theme.colors.changeDownText }
            ]}>
              {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProGate = () => {
    if (isPro) return null;

    return (
      <View style={[styles.proGate, { backgroundColor: theme.colors.panel }]}>
        <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
        <Text style={[styles.proTitle, { color: theme.colors.textPrimary }]}>
          Unlock All Signals
        </Text>
        <Text style={[styles.proDescription, { color: theme.colors.textSecondary }]}>
          Get unlimited access to all trading signals, advanced filters, and real-time notifications.
        </Text>
        <TouchableOpacity
          style={[styles.upgradeButton, { backgroundColor: theme.colors.accent }]}
          onPress={onUpgrade}
        >
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
        </TouchableOpacity>
        <Text style={[styles.limitText, { color: theme.colors.textMuted }]}>
          Showing {displayedSignals.length} of {filteredSignals.length} signals
        </Text>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabContainer, { backgroundColor: theme.colors.input }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'active' && { backgroundColor: theme.colors.accent }
        ]}
        onPress={() => setActiveTab('active')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'active' ? theme.colors.buttonText : theme.colors.textMuted }
        ]}>
          Aktivnyye ({signals.filter(s => s.status !== 'closed').length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'history' && { backgroundColor: theme.colors.accent }
        ]}
        onPress={() => setActiveTab('history')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'history' ? theme.colors.buttonText : theme.colors.textMuted }
        ]}>
          Istoriya ({signals.filter(s => s.status === 'closed').length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {renderStatsCard()}
      {renderTabs()}
      <View style={styles.filterRow}>
        <TextInput
          style={[styles.searchInput, {
            backgroundColor: theme.colors.input,
            color: theme.colors.textPrimary,
          }]}
          placeholder="Search symbol or exchange..."
          placeholderTextColor={theme.colors.textPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {activeTab === 'active'
          ? 'No active signals. New signals coming soon...'
          : 'No signal history yet.'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (isPro || displayedSignals.length === filteredSignals.length) return null;
    return renderProGate();
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        Signaly
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        AI-powered trading signals with 6 trigger confirmation
      </Text>

      <FlatList
        data={displayedSignals}
        renderItem={renderSignal}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        initialNumToRender={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  proGate: {
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  proTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  proDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  limitText: {
    fontSize: 12,
  },
});
