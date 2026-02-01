import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme-context';
import { useIsOffline } from '../context/NetworkContext';
import { useAuth } from '../context/AuthContext';
import AssetAllocation, { AssetAllocationItem } from '../components/AssetAllocation';
import PositionCard, { Position } from '../components/PositionCard';
import PnLChart, { PnLDataPoint } from '../components/PnLChart';
import { portfolioApi, marketApi } from '../api';
import { cachePortfolio, getCachedPortfolio } from '../utils/offlineCache';
import type { ApiPortfolio, ApiPortfolioAsset, ApiError, ApiTicker } from '../api/types';
import type { RootStackParamList } from '../navigation/types';

// Coin item for picker
interface CoinItem {
  symbol: string;
  name: string;
  price: number;
}

// Map API portfolio asset to Position format
function mapAssetToPosition(asset: ApiPortfolioAsset): Position {
  const value = asset.currentValue ?? asset.amount * (asset.currentPrice ?? asset.avgBuyPrice);
  const costBasis = asset.amount * asset.avgBuyPrice;
  const profitLoss = asset.pnlAbsolute ?? (value - costBasis);
  const profitLossPercent = asset.pnl ?? (costBasis > 0 ? (profitLoss / costBasis) * 100 : 0);

  return {
    id: asset.id,
    symbol: asset.symbol.replace('USDT', ''),
    name: asset.symbol,
    quantity: asset.amount,
    entryPrice: asset.avgBuyPrice,
    currentPrice: asset.currentPrice ?? asset.avgBuyPrice,
    value,
    profitLoss,
    profitLossPercent,
  };
}

// Generate PnL history (would come from API in a full implementation)
const generatePnLHistory = (totalValue: number): PnLDataPoint[] => {
  const now = Date.now();
  const points: PnLDataPoint[] = [];
  const baseValue = totalValue * 0.85; // Start from 85% of current value

  // Generate 60 days of data
  for (let i = 60; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const randomChange = (Math.random() - 0.45) * (totalValue * 0.03);
    const trendFactor = ((60 - i) / 60) * (totalValue * 0.15);
    const value = baseValue + trendFactor + randomChange;
    points.push({ timestamp, value: Math.max(value, baseValue * 0.7) });
  }

  return points;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PortfolioScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, styles: globalStyles } = useTheme();
  const isOffline = useIsOffline();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [portfolio, setPortfolio] = useState<ApiPortfolio | null>(null);
  const [isStaleData, setIsStaleData] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  // Modal state for adding/editing positions
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formSymbol, setFormSymbol] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formEntryPrice, setFormEntryPrice] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Coin picker state
  const [coinPickerVisible, setCoinPickerVisible] = useState(false);
  const [coinSearch, setCoinSearch] = useState('');
  const [availableCoins, setAvailableCoins] = useState<CoinItem[]>([]);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [selectedCoinPrice, setSelectedCoinPrice] = useState<number | null>(null);

  const fetchPortfolio = useCallback(async () => {
    // If offline, try to use cached data
    if (isOffline) {
      const cached = await getCachedPortfolio();
      if (cached) {
        setPortfolio(cached.data);
        setIsStaleData(true);
        setCachedAt(cached.cachedAt);
        setError(null);
        setIsAuthError(false);
        return;
      }
      setError('Нет подключения к интернету. Кэшированные данные недоступны.');
      setIsAuthError(false);
      return;
    }

    try {
      setError(null);
      setIsAuthError(false);
      const data = await portfolioApi.getPortfolio();
      setPortfolio(data);
      setIsStaleData(false);
      setCachedAt(null);
      // Cache the fresh data
      await cachePortfolio(data);
    } catch (err) {
      const apiError = err as ApiError;
      // Check if it's an auth error
      if (apiError.isAuthError || apiError.statusCode === 401) {
        setIsAuthError(true);
        setError(null);
        return;
      }
      // On error, try to fall back to cached data
      const cached = await getCachedPortfolio();
      if (cached) {
        setPortfolio(cached.data);
        setIsStaleData(true);
        setCachedAt(cached.cachedAt);
        setError(null);
      } else {
        setError(apiError.message || 'Не удалось загрузить портфель');
      }
    }
  }, [isOffline]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPortfolio();
      setLoading(false);
    };
    loadData();
  }, [fetchPortfolio]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  };

  const positions = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.assets.map(mapAssetToPosition);
  }, [portfolio]);

  const totalValue = portfolio?.totalValue ?? 0;
  const totalPnL = portfolio?.totalPnlAbsolute ?? 0;
  const totalPnLPercent = portfolio?.totalPnl ?? 0;

  const pnlHistory = useMemo(() => generatePnLHistory(totalValue), [totalValue]);

  const assetAllocation: AssetAllocationItem[] = useMemo(() => {
    return positions.map(pos => ({
      symbol: pos.symbol,
      name: pos.name,
      value: pos.value,
      percentage: totalValue > 0 ? (pos.value / totalValue) * 100 : 0,
    }));
  }, [positions, totalValue]);

  const isPnLPositive = totalPnL >= 0;

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPnL = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(Math.abs(value))}`;
  };

  const formatPnLPercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  // Load available coins from API
  const loadCoins = useCallback(async () => {
    if (availableCoins.length > 0) return; // Already loaded

    setCoinsLoading(true);
    try {
      const tickers = await marketApi.getTickers();
      const coins: CoinItem[] = tickers
        .filter(t => t.symbol.endsWith('USDT'))
        .map(t => ({
          symbol: t.symbol.replace('USDT', ''),
          name: t.symbol,
          price: t.price,
        }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      setAvailableCoins(coins);
    } catch (err) {
      console.error('Failed to load coins:', err);
      // Fallback to common coins if API fails
      const fallbackCoins: CoinItem[] = [
        { symbol: 'BTC', name: 'BTCUSDT', price: 0 },
        { symbol: 'ETH', name: 'ETHUSDT', price: 0 },
        { symbol: 'SOL', name: 'SOLUSDT', price: 0 },
        { symbol: 'BNB', name: 'BNBUSDT', price: 0 },
        { symbol: 'XRP', name: 'XRPUSDT', price: 0 },
        { symbol: 'ADA', name: 'ADAUSDT', price: 0 },
        { symbol: 'DOGE', name: 'DOGEUSDT', price: 0 },
        { symbol: 'AVAX', name: 'AVAXUSDT', price: 0 },
        { symbol: 'DOT', name: 'DOTUSDT', price: 0 },
        { symbol: 'MATIC', name: 'MATICUSDT', price: 0 },
      ];
      setAvailableCoins(fallbackCoins);
    } finally {
      setCoinsLoading(false);
    }
  }, [availableCoins.length]);

  // Filter coins based on search
  const filteredCoins = useMemo(() => {
    if (!coinSearch.trim()) return availableCoins;
    const search = coinSearch.trim().toUpperCase();
    return availableCoins.filter(
      coin => coin.symbol.includes(search) || coin.name.includes(search)
    );
  }, [availableCoins, coinSearch]);

  const openCoinPicker = useCallback(() => {
    setCoinSearch('');
    setCoinPickerVisible(true);
    loadCoins();
  }, [loadCoins]);

  const selectCoin = useCallback((coin: CoinItem) => {
    setFormSymbol(coin.symbol);
    setSelectedCoinPrice(coin.price);
    // Auto-fill current price as entry price if empty
    if (!formEntryPrice && coin.price > 0) {
      setFormEntryPrice(coin.price.toString());
    }
    setCoinPickerVisible(false);
  }, [formEntryPrice]);

  const openAddModal = useCallback(() => {
    if (isOffline) {
      Alert.alert('Офлайн', 'Для добавления позиций требуется подключение к интернету.');
      return;
    }
    setEditingPosition(null);
    setFormSymbol('');
    setFormQuantity('');
    setFormEntryPrice('');
    setSelectedCoinPrice(null);
    setModalVisible(true);
  }, [isOffline]);

  const openEditModal = useCallback((position: Position) => {
    if (isOffline) {
      Alert.alert('Офлайн', 'Для редактирования позиций требуется подключение к интернету.');
      return;
    }
    setEditingPosition(position);
    setFormSymbol(position.symbol);
    setFormQuantity(position.quantity.toString());
    setFormEntryPrice(position.entryPrice.toString());
    setModalVisible(true);
  }, [isOffline]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingPosition(null);
    setFormSymbol('');
    setFormQuantity('');
    setFormEntryPrice('');
  }, []);

  const handleSubmitPosition = useCallback(async () => {
    // Validate form
    const symbol = formSymbol.trim().toUpperCase();
    const quantity = parseFloat(formQuantity);
    const entryPrice = parseFloat(formEntryPrice);

    if (!symbol) {
      Alert.alert('Ошибка', 'Выберите монету из списка');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Ошибка', 'Введите корректное количество');
      return;
    }

    if (isNaN(entryPrice) || entryPrice <= 0) {
      Alert.alert('Ошибка', 'Введите корректную цену входа');
      return;
    }

    setFormSubmitting(true);

    try {
      const symbolWithUsdt = symbol.includes('USDT') ? symbol : `${symbol}USDT`;

      if (editingPosition) {
        // Update existing position
        await portfolioApi.updateAsset(editingPosition.id, {
          amount: quantity,
          avgBuyPrice: entryPrice,
        });
      } else {
        // Add new position
        await portfolioApi.addAsset({
          symbol: symbolWithUsdt,
          amount: quantity,
          avgBuyPrice: entryPrice,
        });
      }

      closeModal();
      await fetchPortfolio();
    } catch (err) {
      const apiError = err as ApiError;
      Alert.alert('Ошибка', apiError.message || 'Не удалось сохранить позицию');
    } finally {
      setFormSubmitting(false);
    }
  }, [formSymbol, formQuantity, formEntryPrice, editingPosition, closeModal, fetchPortfolio]);

  const handleDeletePosition = useCallback(async (position: Position) => {
    if (isOffline) {
      Alert.alert('Офлайн', 'Для удаления позиций требуется подключение к интернету.');
      return;
    }

    Alert.alert(
      'Удалить позицию',
      `Вы уверены, что хотите удалить ${position.symbol}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await portfolioApi.deleteAsset(position.id);
              await fetchPortfolio();
            } catch (err) {
              const apiError = err as ApiError;
              Alert.alert('Ошибка', apiError.message || 'Не удалось удалить позицию');
            }
          },
        },
      ]
    );
  }, [isOffline, fetchPortfolio]);

  const handleViewChart = useCallback((position: Position) => {
    navigation.navigate('ChartFullscreen', {
      symbol: `${position.symbol}USDT`,
      exchange: 'binance',
      timeframe: '1h',
    });
  }, [navigation]);

  const handleSyncExchanges = useCallback(() => {
    if (isOffline) {
      Alert.alert('Офлайн', 'Для синхронизации требуется подключение к интернету.');
      return;
    }
    Alert.alert(
      'Синхронизация бирж',
      'Подключение к биржам через API будет доступно в следующем обновлении.\n\nВ настоящее время вы можете добавлять позиции вручную.',
      [{ text: 'OK' }]
    );
  }, [isOffline]);

  const handleLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  const formatCacheTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн. назад`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Загрузка портфеля...
        </Text>
      </View>
    );
  }

  // Show login card if user is not authenticated or there's an auth error
  if (isAuthError || !isAuthenticated) {
    return (
      <View style={[styles.authContainer, { backgroundColor: 'transparent' }]}>
        <View style={[styles.authCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Ionicons name="wallet-outline" size={56} color={theme.colors.accent} />
          <Text style={[styles.authTitle, { color: theme.colors.textPrimary }]}>
            Войдите в аккаунт
          </Text>
          <Text style={[styles.authDescription, { color: theme.colors.textSecondary }]}>
            Авторизуйтесь для доступа к портфелю и отслеживания ваших позиций
          </Text>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: theme.colors.accent }]}
            onPress={handleLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.authButtonText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: 'transparent' }]}>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={fetchPortfolio}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.buttonText }]}>
            Повторить
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={globalStyles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Портфель
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Обзор портфеля
        </Text>
      </View>

      {/* Stale Data Indicator */}
      {isStaleData && (
        <View style={[styles.staleBanner, { backgroundColor: theme.colors.warning }]}>
          <Text style={[styles.staleBannerText, { color: '#000' }]}>
            Кэшированные данные ({formatCacheTime(cachedAt)})
          </Text>
        </View>
      )}

      {/* Total Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>
          Общий баланс
        </Text>
        <Text style={[styles.balanceValue, { color: theme.colors.textPrimary }]}>
          {formatCurrency(totalValue)}
        </Text>
        <View style={styles.balanceChangeRow}>
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: isPnLPositive ? theme.colors.changeUp : theme.colors.changeDown },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
              ]}
            >
              {isPnLPositive ? '\u2191' : '\u2193'} {formatPnLPercent(totalPnLPercent)}
            </Text>
          </View>
          <Text
            style={[
              styles.changeAmount,
              { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
            ]}
          >
            {formatPnL(totalPnL)}
          </Text>
        </View>
      </View>

      {/* PnL Chart */}
      {totalValue > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Доходность
            </Text>
          </View>
          <PnLChart data={pnlHistory} currentValue={totalValue} />
        </>
      )}

      {/* Asset Allocation */}
      {positions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Распределение активов
            </Text>
          </View>
          <AssetAllocation assets={assetAllocation} totalValue={totalValue} />
        </>
      )}

      {/* PnL Summary Card */}
      {positions.length > 0 && (
        <View style={[styles.pnlSummaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.pnlSummaryTitle, { color: theme.colors.textPrimary }]}>
            Сводка P&L
          </Text>
          <View style={styles.pnlSummaryRow}>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Всего вложено
              </Text>
              <Text style={[styles.pnlSummaryValue, { color: theme.colors.textPrimary }]}>
                {formatCurrency(totalValue - totalPnL)}
              </Text>
            </View>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Нереализованный P&L
              </Text>
              <Text
                style={[
                  styles.pnlSummaryValue,
                  { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
                ]}
              >
                {formatPnL(totalPnL)}
              </Text>
            </View>
          </View>
          <View style={styles.pnlSummaryRow}>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                Прибыльных позиций
              </Text>
              <Text style={[styles.pnlSummaryValue, { color: theme.colors.changeUpText }]}>
                {positions.filter(p => p.profitLoss >= 0).length} / {positions.length}
              </Text>
            </View>
            <View style={styles.pnlSummaryItem}>
              <Text style={[styles.pnlSummaryLabel, { color: theme.colors.textMuted }]}>
                ROI
              </Text>
              <Text
                style={[
                  styles.pnlSummaryValue,
                  { color: isPnLPositive ? theme.colors.changeUpText : theme.colors.changeDownText },
                ]}
              >
                {formatPnLPercent(totalPnLPercent)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isOffline ? theme.colors.accentMuted : theme.colors.accent }
          ]}
          activeOpacity={0.8}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={18} color={theme.colors.buttonText} style={{ marginRight: 4 }} />
          <Text style={[styles.actionButtonText, { color: theme.colors.buttonText }]}>
            Добавить
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.syncButton,
            { backgroundColor: theme.colors.metaBadge, opacity: isOffline ? 0.5 : 1 }
          ]}
          activeOpacity={0.8}
          onPress={handleSyncExchanges}
          disabled={isOffline}
        >
          <Ionicons name="sync" size={18} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>
            Синхронизация
          </Text>
        </TouchableOpacity>
      </View>

      {/* Positions List */}
      {positions.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Позиции
            </Text>
            <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
              {positions.length} активов
            </Text>
          </View>

          {positions.map(position => (
            <PositionCard
              key={position.id}
              position={position}
              onPress={(pos) => {
                const isProfitable = pos.profitLoss >= 0;
                Alert.alert(
                  `${pos.symbol}`,
                  `Количество: ${pos.quantity.toLocaleString()}\n` +
                  `Цена входа: $${pos.entryPrice.toFixed(2)}\n` +
                  `Текущая цена: $${pos.currentPrice.toFixed(2)}\n` +
                  `Стоимость: $${pos.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
                  `P/L: ${isProfitable ? '+' : ''}$${pos.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${isProfitable ? '+' : ''}${pos.profitLossPercent.toFixed(2)}%)`,
                  [
                    { text: 'Закрыть', style: 'cancel' },
                    {
                      text: 'График',
                      onPress: () => handleViewChart(pos),
                    },
                    {
                      text: 'Изменить',
                      onPress: () => openEditModal(pos),
                    },
                    {
                      text: 'Удалить',
                      style: 'destructive',
                      onPress: () => handleDeletePosition(pos),
                    },
                  ]
                );
              }}
            />
          ))}
        </>
      )}

      {/* Empty State */}
      {positions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={48} color={theme.colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Портфель пуст
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Добавьте вашу первую позицию, чтобы начать отслеживать портфель.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]}
            onPress={openAddModal}
          >
            <Text style={[styles.emptyButtonText, { color: theme.colors.buttonText }]}>
              Добавить позицию
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add/Edit Position Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: theme.colors.appBackground }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.divider }]}>
            <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
              <Text style={[styles.modalCloseText, { color: theme.colors.accent }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingPosition ? 'Редактировать' : 'Добавить позицию'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmitPosition}
              style={styles.modalSaveButton}
              disabled={formSubmitting}
            >
              {formSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.modalSaveText, { color: theme.colors.accent }]}>
                  {editingPosition ? 'Сохранить' : 'Добавить'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                Монета
              </Text>
              <TouchableOpacity
                style={[
                  styles.formInput,
                  styles.coinSelector,
                  {
                    backgroundColor: theme.colors.input,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                onPress={openCoinPicker}
                disabled={!!editingPosition}
              >
                {formSymbol ? (
                  <View style={styles.selectedCoin}>
                    <Text style={[styles.selectedCoinSymbol, { color: theme.colors.textPrimary }]}>
                      {formSymbol}
                    </Text>
                    {selectedCoinPrice !== null && selectedCoinPrice > 0 && (
                      <Text style={[styles.selectedCoinPrice, { color: theme.colors.textMuted }]}>
                        ${selectedCoinPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.coinPlaceholder, { color: theme.colors.textMuted }]}>
                    Выберите монету...
                  </Text>
                )}
                {!editingPosition && (
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
                )}
              </TouchableOpacity>
              {editingPosition && (
                <Text style={[styles.formHint, { color: theme.colors.textMuted }]}>
                  Монету нельзя изменить при редактировании
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                Количество
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.input,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                value={formQuantity}
                onChangeText={setFormQuantity}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                Средняя цена входа ($)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.colors.input,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
                value={formEntryPrice}
                onChangeText={setFormEntryPrice}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.formInfo, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
              <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
              <Text style={[styles.formInfoText, { color: theme.colors.textSecondary }]}>
                Текущая цена будет получена автоматически с бирж для расчета P/L.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Coin Picker Modal */}
      <Modal
        visible={coinPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCoinPickerVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.appBackground }]}>
          {/* Picker Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.divider }]}>
            <TouchableOpacity
              onPress={() => setCoinPickerVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.accent }]}>Отмена</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Выберите монету
            </Text>
            <View style={styles.modalSaveButton} />
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              value={coinSearch}
              onChangeText={setCoinSearch}
              placeholder="Поиск монеты..."
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            {coinSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCoinSearch('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Coins List */}
          {coinsLoading ? (
            <View style={styles.coinsLoading}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={[styles.coinsLoadingText, { color: theme.colors.textSecondary }]}>
                Загрузка монет...
              </Text>
            </View>
          ) : filteredCoins.length === 0 ? (
            <View style={styles.noCoinsContainer}>
              <Text style={[styles.noCoinsText, { color: theme.colors.textMuted }]}>
                {coinSearch ? 'Монета не найдена' : 'Нет доступных монет'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCoins}
              keyExtractor={(item) => item.symbol}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: coin }) => (
                <TouchableOpacity
                  style={[
                    styles.coinItem,
                    { borderBottomColor: theme.colors.divider }
                  ]}
                  onPress={() => selectCoin(coin)}
                >
                  <View style={styles.coinItemLeft}>
                    <Text style={[styles.coinItemSymbol, { color: theme.colors.textPrimary }]}>
                      {coin.symbol}
                    </Text>
                    <Text style={[styles.coinItemName, { color: theme.colors.textMuted }]}>
                      {coin.name}
                    </Text>
                  </View>
                  {coin.price > 0 && (
                    <Text style={[styles.coinItemPrice, { color: theme.colors.textSecondary }]}>
                      ${coin.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  balanceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCount: {
    fontSize: 13,
  },
  pnlSummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  pnlSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pnlSummaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  pnlSummaryItem: {
    flex: 1,
  },
  pnlSummaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  pnlSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButton: {
    // Additional styles for sync button if needed
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authCard: {
    width: '100%',
    maxWidth: 340,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  authDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  authButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    minWidth: 70,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSaveButton: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  formHint: {
    fontSize: 12,
    marginTop: 6,
  },
  formInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  formInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Coin selector styles
  coinSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCoin: {
    flex: 1,
  },
  selectedCoinSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCoinPrice: {
    fontSize: 13,
    marginTop: 2,
  },
  coinPlaceholder: {
    fontSize: 16,
  },
  // Coin picker modal styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  coinsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsLoadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  coinsList: {
    flex: 1,
  },
  noCoinsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noCoinsText: {
    fontSize: 14,
  },
  coinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  coinItemLeft: {
    flex: 1,
  },
  coinItemSymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
  coinItemName: {
    fontSize: 12,
    marginTop: 2,
  },
  coinItemPrice: {
    fontSize: 14,
  },
  staleBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
