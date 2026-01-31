import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme-context';
import ChatRoom, { ChatRoomData, ChatMessage } from '../components/ChatRoom';
import TraderCard, { Trader } from '../components/TraderCard';

// Demo Messages
const demoMessages: Record<string, ChatMessage[]> = {
  btc: [
    {
      id: '1',
      userId: 'u1',
      username: 'CryptoKing',
      message: 'Всем привет! Кто-нибудь следит за уровнем 95к?',
      timestamp: Date.now() - 3600000,
      isPro: true,
    },
    {
      id: '2',
      userId: 'u2',
      username: 'TraderMax',
      message: 'Да, жду пробоя. Объемы растут!',
      timestamp: Date.now() - 3500000,
    },
    {
      id: '3',
      userId: 'u3',
      username: 'BitcoinFan',
      message: 'Осторожнее, может быть ложный пробой как в прошлый раз',
      timestamp: Date.now() - 3000000,
    },
    {
      id: '4',
      userId: 'u1',
      username: 'CryptoKing',
      message: 'Согласен, нужно дождаться подтверждения на часовике',
      timestamp: Date.now() - 2500000,
      isPro: true,
    },
    {
      id: '5',
      userId: 'u4',
      username: 'WhaleWatcher',
      message: 'Киты накапливают. Видел большие переводы на биржи',
      timestamp: Date.now() - 1800000,
      isPro: true,
    },
    {
      id: '6',
      userId: 'u2',
      username: 'TraderMax',
      message: 'Интересно! Можешь скинуть ссылку на данные?',
      timestamp: Date.now() - 1200000,
    },
  ],
  newbie: [
    {
      id: '1',
      userId: 'u5',
      username: 'NewTrader2024',
      message: 'Привет всем! Только начинаю изучать трейдинг',
      timestamp: Date.now() - 7200000,
    },
    {
      id: '2',
      userId: 'u6',
      username: 'Mentor_Pro',
      message: 'Добро пожаловать! Начни с основ технического анализа',
      timestamp: Date.now() - 7000000,
      isPro: true,
    },
    {
      id: '3',
      userId: 'u5',
      username: 'NewTrader2024',
      message: 'Спасибо! А где лучше изучать?',
      timestamp: Date.now() - 6800000,
    },
    {
      id: '4',
      userId: 'u7',
      username: 'HelpfulHelper',
      message: 'В приложении есть раздел Обучение, там хорошие курсы',
      timestamp: Date.now() - 6500000,
    },
    {
      id: '5',
      userId: 'u6',
      username: 'Mentor_Pro',
      message: 'И не торгуй на реальные деньги пока не поймешь риск-менеджмент!',
      timestamp: Date.now() - 6000000,
      isPro: true,
    },
  ],
  vip: [
    {
      id: '1',
      userId: 'u8',
      username: 'VIPTrader',
      message: 'Сигнал на ETH: лонг от 3200, тейк 3400, стоп 3100',
      timestamp: Date.now() - 1800000,
      isPro: true,
    },
    {
      id: '2',
      userId: 'u9',
      username: 'ProAnalyst',
      message: 'Подтверждаю, дивергенция на RSI + уровень поддержки',
      timestamp: Date.now() - 1500000,
      isPro: true,
    },
    {
      id: '3',
      userId: 'u10',
      username: 'EliteTrader',
      message: 'Вошел на 3210. Спасибо за сигнал!',
      timestamp: Date.now() - 1200000,
      isPro: true,
    },
    {
      id: '4',
      userId: 'u8',
      username: 'VIPTrader',
      message: 'Первый тейк профит достигнут! Переносим стоп в безубыток',
      timestamp: Date.now() - 600000,
      isPro: true,
    },
  ],
};

// Demo Chat Rooms
const demoChatRooms: ChatRoomData[] = [
  {
    id: 'btc',
    title: 'BTC Обсуждение',
    memberCount: 15420,
    lastMessage: 'Киты накапливают. Видел большие переводы...',
    lastMessageTime: Date.now() - 1800000,
    messages: demoMessages.btc,
  },
  {
    id: 'newbie',
    title: 'Новички',
    memberCount: 8934,
    lastMessage: 'И не торгуй на реальные деньги пока не...',
    lastMessageTime: Date.now() - 6000000,
    messages: demoMessages.newbie,
  },
  {
    id: 'vip',
    title: 'Сигналы VIP',
    memberCount: 1256,
    lastMessage: 'Первый тейк профит достигнут!',
    lastMessageTime: Date.now() - 600000,
    isVip: true,
    messages: demoMessages.vip,
  },
];

// Demo Traders
const demoTraders: Trader[] = [
  {
    id: 't1',
    username: 'CryptoMaster',
    rank: 1,
    winRate: 78.5,
    totalTrades: 1243,
    followers: 12500,
    pnl: 125000,
    pnlPercentage: 156.3,
    isPro: true,
  },
  {
    id: 't2',
    username: 'WhaleHunter',
    rank: 2,
    winRate: 72.3,
    totalTrades: 892,
    followers: 8900,
    pnl: 89000,
    pnlPercentage: 134.7,
    isPro: true,
  },
  {
    id: 't3',
    username: 'TradingPro',
    rank: 3,
    winRate: 69.8,
    totalTrades: 1567,
    followers: 7200,
    pnl: 67500,
    pnlPercentage: 112.4,
    isPro: true,
  },
  {
    id: 't4',
    username: 'BitcoinBull',
    rank: 4,
    winRate: 67.2,
    totalTrades: 743,
    followers: 5400,
    pnl: 54200,
    pnlPercentage: 98.6,
  },
  {
    id: 't5',
    username: 'AltcoinKing',
    rank: 5,
    winRate: 65.5,
    totalTrades: 1089,
    followers: 4800,
    pnl: 48900,
    pnlPercentage: 87.3,
  },
  {
    id: 't6',
    username: 'ScalpMaster',
    rank: 6,
    winRate: 71.2,
    totalTrades: 3421,
    followers: 4200,
    pnl: 42100,
    pnlPercentage: 76.8,
    isPro: true,
  },
  {
    id: 't7',
    username: 'SwingTrader',
    rank: 7,
    winRate: 63.8,
    totalTrades: 456,
    followers: 3100,
    pnl: 31500,
    pnlPercentage: 65.2,
  },
  {
    id: 't8',
    username: 'DeFiExpert',
    rank: 8,
    winRate: 61.4,
    totalTrades: 678,
    followers: 2800,
    pnl: 28400,
    pnlPercentage: 54.9,
    isPro: true,
  },
];

// Demo Trading Ideas
type TradingIdea = {
  id: string;
  author: string;
  authorRank: number;
  isPro: boolean;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  title: string;
  description: string;
  likes: number;
  comments: number;
  timestamp: number;
};

const demoIdeas: TradingIdea[] = [
  {
    id: 'i1',
    author: 'CryptoMaster',
    authorRank: 1,
    isPro: true,
    symbol: 'BTCUSDT',
    direction: 'LONG',
    title: 'BTC готовится к прорыву 100k',
    description: 'Формируется бычий флаг на дневном графике. RSI показывает силу покупателей. Цель - 105000.',
    likes: 234,
    comments: 45,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'i2',
    author: 'WhaleHunter',
    authorRank: 2,
    isPro: true,
    symbol: 'ETHUSDT',
    direction: 'LONG',
    title: 'ETH/BTC разворот',
    description: 'Пара ETH/BTC достигла исторической поддержки. Ожидаю отскок и рост ETH относительно BTC.',
    likes: 189,
    comments: 32,
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'i3',
    author: 'AltcoinKing',
    authorRank: 5,
    isPro: false,
    symbol: 'SOLUSDT',
    direction: 'SHORT',
    title: 'SOL перекуплен',
    description: 'RSI на дневке выше 80. Дивергенция с ценой. Жду коррекцию до уровня 180.',
    likes: 156,
    comments: 28,
    timestamp: Date.now() - 10800000,
  },
  {
    id: 'i4',
    author: 'DeFiExpert',
    authorRank: 8,
    isPro: true,
    symbol: 'LINKUSDT',
    direction: 'LONG',
    title: 'LINK недооценен',
    description: 'Фундаментально сильный проект. Интеграции растут. Техника показывает накопление.',
    likes: 98,
    comments: 19,
    timestamp: Date.now() - 14400000,
  },
];

type Tab = 'chats' | 'traders' | 'ideas';

const tabs: { id: Tab; label: string }[] = [
  { id: 'chats', label: 'Чаты' },
  { id: 'traders', label: 'Трейдеры' },
  { id: 'ideas', label: 'Идеи' },
];

export default function CommunityScreen() {
  const { theme, styles } = useTheme();
  const [selectedTab, setSelectedTab] = useState<Tab>('chats');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomData | null>(null);

  const formatTimeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}ч назад`;
    if (minutes > 0) return `${minutes}м назад`;
    return 'Только что';
  };

  if (selectedRoom) {
    return (
      <ChatRoom
        room={selectedRoom}
        onBack={() => setSelectedRoom(null)}
        onSendMessage={(message) => {
          console.log('Sending message:', message);
        }}
      />
    );
  }

  const renderChatRoomItem = (room: ChatRoomData) => (
    <TouchableOpacity
      key={room.id}
      style={[
        localStyles.chatRoomCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
      ]}
      onPress={() => setSelectedRoom(room)}
      activeOpacity={0.7}
    >
      <View style={localStyles.chatRoomLeft}>
        <View style={[localStyles.chatRoomIcon, { backgroundColor: theme.colors.accent }]}>
          <Text style={localStyles.chatRoomIconText}>
            {room.title.charAt(0)}
          </Text>
        </View>
        <View style={localStyles.chatRoomInfo}>
          <View style={localStyles.chatRoomTitleRow}>
            <Text style={[localStyles.chatRoomTitle, { color: theme.colors.textPrimary }]}>
              {room.title}
            </Text>
            {room.isVip && (
              <View style={[localStyles.vipBadge, { backgroundColor: theme.colors.warning }]}>
                <Text style={localStyles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text
            style={[localStyles.chatRoomLastMessage, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {room.lastMessage}
          </Text>
        </View>
      </View>
      <View style={localStyles.chatRoomRight}>
        <Text style={[localStyles.chatRoomTime, { color: theme.colors.textMuted }]}>
          {room.lastMessageTime ? formatTimeAgo(room.lastMessageTime) : ''}
        </Text>
        <Text style={[localStyles.chatRoomMembers, { color: theme.colors.textFaint }]}>
          {room.memberCount.toLocaleString()} участ.
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderIdeaCard = (idea: TradingIdea) => {
    const isLong = idea.direction === 'LONG';
    const directionColor = isLong ? theme.colors.changeUpText : theme.colors.changeDownText;
    const directionBgColor = isLong ? theme.colors.changeUp : theme.colors.changeDown;

    return (
      <View
        key={idea.id}
        style={[
          localStyles.ideaCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
        ]}
      >
        <View style={localStyles.ideaHeader}>
          <View style={localStyles.ideaAuthorRow}>
            <View style={[localStyles.ideaAvatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={localStyles.ideaAvatarText}>
                {idea.author.charAt(0)}
              </Text>
            </View>
            <View>
              <View style={localStyles.ideaAuthorNameRow}>
                <Text style={[localStyles.ideaAuthorName, { color: theme.colors.textPrimary }]}>
                  {idea.author}
                </Text>
                {idea.isPro && (
                  <View style={[localStyles.proBadge, { backgroundColor: theme.colors.accent }]}>
                    <Text style={localStyles.proText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={[localStyles.ideaAuthorRank, { color: theme.colors.textMuted }]}>
                Рейтинг #{idea.authorRank}
              </Text>
            </View>
          </View>
          <View style={localStyles.ideaSymbolRow}>
            <Text style={[localStyles.ideaSymbol, { color: theme.colors.textPrimary }]}>
              {idea.symbol.replace('USDT', '')}
            </Text>
            <View style={[localStyles.ideaDirection, { backgroundColor: directionBgColor }]}>
              <Text style={[localStyles.ideaDirectionText, { color: directionColor }]}>
                {idea.direction}
              </Text>
            </View>
          </View>
        </View>
        <Text style={[localStyles.ideaTitle, { color: theme.colors.textPrimary }]}>
          {idea.title}
        </Text>
        <Text style={[localStyles.ideaDescription, { color: theme.colors.textSecondary }]}>
          {idea.description}
        </Text>
        <View style={localStyles.ideaFooter}>
          <View style={localStyles.ideaStats}>
            <Text style={[localStyles.ideaStat, { color: theme.colors.textMuted }]}>
              {idea.likes} like
            </Text>
            <Text style={[localStyles.ideaStat, { color: theme.colors.textMuted }]}>
              {idea.comments} comments
            </Text>
          </View>
          <Text style={[localStyles.ideaTime, { color: theme.colors.textFaint }]}>
            {formatTimeAgo(idea.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={localStyles.header}>
        <Text style={[styles.sectionTitle, localStyles.title]}>Сообщество</Text>
        <Text style={[styles.sectionSub, localStyles.subtitle]}>
          Общайтесь с трейдерами и делитесь идеями
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={localStyles.tabContainer}>
        <View style={[localStyles.tabRow, { backgroundColor: theme.colors.input }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                localStyles.tab,
                selectedTab === tab.id && { backgroundColor: theme.colors.accent },
              ]}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Text
                style={[
                  localStyles.tabText,
                  { color: theme.colors.textSecondary },
                  selectedTab === tab.id && { color: theme.colors.buttonText },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {selectedTab === 'chats' && (
        <View style={localStyles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Чат-комнаты</Text>
            <Text style={styles.sectionSub}>{demoChatRooms.length} комнат</Text>
          </View>
          {demoChatRooms.map(renderChatRoomItem)}
        </View>
      )}

      {selectedTab === 'traders' && (
        <View style={localStyles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Топ трейдеров</Text>
            <Text style={styles.sectionSub}>По доходности за месяц</Text>
          </View>
          {demoTraders.map((trader) => (
            <TraderCard
              key={trader.id}
              trader={trader}
              onFollow={(t) => console.log('Follow:', t.username)}
              onPress={(t) => console.log('View profile:', t.username)}
            />
          ))}
        </View>
      )}

      {selectedTab === 'ideas' && (
        <View style={localStyles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Торговые идеи</Text>
            <Text style={styles.sectionSub}>От топ трейдеров</Text>
          </View>
          {demoIdeas.map(renderIdeaCard)}
        </View>
      )}
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    marginTop: 4,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  chatRoomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  chatRoomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatRoomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatRoomIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chatRoomInfo: {
    flex: 1,
  },
  chatRoomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatRoomTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  vipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  chatRoomLastMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  chatRoomRight: {
    alignItems: 'flex-end',
  },
  chatRoomTime: {
    fontSize: 11,
  },
  chatRoomMembers: {
    fontSize: 10,
    marginTop: 4,
  },
  ideaCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ideaAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ideaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ideaAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ideaAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ideaAuthorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  proBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  proText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ideaAuthorRank: {
    fontSize: 11,
    marginTop: 2,
  },
  ideaSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ideaSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ideaDirection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ideaDirectionText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  ideaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ideaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  ideaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  ideaStat: {
    fontSize: 12,
  },
  ideaTime: {
    fontSize: 11,
  },
});
