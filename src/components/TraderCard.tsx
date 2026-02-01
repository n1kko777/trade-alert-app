import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme-context';

export type Trader = {
  id: string;
  username: string;
  rank: number;
  avatar?: string;
  winRate: number;
  totalTrades: number;
  followers: number;
  pnl: number;
  pnlPercentage: number;
  isPro?: boolean;
  isFollowing?: boolean;
};

interface TraderCardProps {
  trader: Trader;
  isFollowing?: boolean;
  onFollow?: (trader: Trader) => void;
  onPress?: (trader: Trader) => void;
}

function TraderCard({ trader, isFollowing: isFollowingProp, onFollow, onPress }: TraderCardProps) {
  const { theme } = useTheme();
  const [isFollowingLocal, setIsFollowingLocal] = useState(trader.isFollowing ?? false);
  const isFollowing = isFollowingProp ?? isFollowingLocal;

  const isProfitable = trader.pnl >= 0;
  const pnlColor = isProfitable ? theme.colors.changeUpText : theme.colors.changeDownText;
  const pnlBgColor = isProfitable ? theme.colors.changeUp : theme.colors.changeDown;

  const handleFollow = () => {
    if (isFollowingProp === undefined) {
      setIsFollowingLocal(!isFollowingLocal);
    }
    onFollow?.(trader);
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return { backgroundColor: '#FFD700' };
    if (rank === 2) return { backgroundColor: '#C0C0C0' };
    if (rank === 3) return { backgroundColor: '#CD7F32' };
    return { backgroundColor: theme.colors.metaBadge };
  };

  const getRankTextStyle = (rank: number) => {
    if (rank <= 3) return { color: '#1A1A1A' };
    return { color: theme.colors.textSecondary };
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
      ]}
      onPress={() => onPress?.(trader)}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        {/* Rank Badge */}
        <View style={[styles.rankBadge, getRankBadgeStyle(trader.rank)]}>
          <Text style={[styles.rankText, getRankTextStyle(trader.rank)]}>
            #{trader.rank}
          </Text>
        </View>

        {/* Avatar Placeholder */}
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.avatarText}>
            {trader.username.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
              {trader.username}
            </Text>
            {trader.isPro && (
              <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
          <View style={styles.statsRow}>
            <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
              Побед: {trader.winRate.toFixed(0)}%
            </Text>
            <Text style={[styles.statDivider, { color: theme.colors.textMuted }]}>|</Text>
            <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
              Сделок: {trader.totalTrades}
            </Text>
            <Text style={[styles.statDivider, { color: theme.colors.textMuted }]}>|</Text>
            <Text style={[styles.statText, { color: theme.colors.textMuted }]}>
              {trader.followers} подп.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* PnL Indicator */}
        <View style={[styles.pnlBadge, { backgroundColor: pnlBgColor }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {isProfitable ? '+' : ''}{trader.pnlPercentage.toFixed(1)}%
          </Text>
        </View>

        {/* Follow Button */}
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing
              ? { backgroundColor: theme.colors.metaBadge }
              : { backgroundColor: theme.colors.accent },
          ]}
          onPress={handleFollow}
        >
          <Text
            style={[
              styles.followText,
              { color: isFollowing ? theme.colors.textSecondary : theme.colors.buttonText },
            ]}
          >
            {isFollowing ? 'Отписаться' : 'Подписаться'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(TraderCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: 11,
  },
  statDivider: {
    marginHorizontal: 6,
    fontSize: 11,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  pnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pnlText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
