import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme-context';

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  timestamp: number;
  isPro?: boolean;
};

export type ChatRoomData = {
  id: string;
  title: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  isVip?: boolean;
  messages: ChatMessage[];
};

interface ChatRoomProps {
  room: ChatRoomData;
  onSendMessage?: (message: string) => void;
  onBack?: () => void;
}

function ChatRoom({ room, onSendMessage, onBack }: ChatRoomProps) {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage?.(inputText.trim());
      setInputText('');
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const showDateHeader =
      index === 0 ||
      formatDate(room.messages[index - 1].timestamp) !== formatDate(item.timestamp);

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        )}
        <View style={styles.messageContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
                {item.username}
              </Text>
              {item.isPro && (
                <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.proText}>PRO</Text>
                </View>
              )}
              <Text style={[styles.timestamp, { color: theme.colors.textMuted }]}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
            <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>
              {item.message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.appBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.panel, borderBottomColor: theme.colors.cardBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.accent }]}>{'<'} Назад</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {room.title}
            </Text>
            {room.isVip && (
              <View style={[styles.vipBadge, { backgroundColor: theme.colors.warning }]}>
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberCount, { color: theme.colors.textMuted }]}>
            {room.memberCount.toLocaleString()} участников
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={room.messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.panel, borderTopColor: theme.colors.cardBorder }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.input,
              color: theme.colors.textPrimary,
            },
          ]}
          placeholder="Введите сообщение..."
          placeholderTextColor={theme.colors.textPlaceholder}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() ? theme.colors.accent : theme.colors.metaBadge,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={[styles.sendText, { color: theme.colors.buttonText }]}>
            Отправить
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default React.memo(ChatRoom);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  vipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  memberCount: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  username: {
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
  timestamp: {
    fontSize: 11,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
