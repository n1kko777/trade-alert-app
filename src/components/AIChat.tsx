import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { useTheme } from '../theme-context';
import { ChatMessage } from '../services/ai/types';
import AnalysisCard from './AnalysisCard';

interface AIChatProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  onCopyMessage?: (content: string) => void;
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
}

function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';

  const handleCopy = () => {
    Clipboard.setString(message.content);
    onCopy?.(message.content);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // If message has an analysis attached, render it as a card
  if (message.analysis && !isUser) {
    return (
      <View style={styles.analysisMessageContainer}>
        <AnalysisCard analysis={message.analysis} onCopy={() => onCopy?.(message.content)} />
      </View>
    );
  }

  return (
    <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
      <View
        style={[
          styles.messageBubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.colors.accent }]
            : [styles.aiBubble, { backgroundColor: theme.colors.card }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isUser ? theme.colors.buttonText : theme.colors.textPrimary },
          ]}
        >
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted },
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
          {!isUser && (
            <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
              <Text style={[styles.copyText, { color: theme.colors.accent }]}>
                Копировать
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const { theme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.messageContainer}>
      <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.colors.card }]}>
        <View style={styles.typingContainer}>
          <Text style={[styles.typingLabel, { color: theme.colors.textMuted }]}>
            GPT печатает
          </Text>
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[styles.dot, { backgroundColor: theme.colors.accent }, getDotStyle(dot1)]}
            />
            <Animated.View
              style={[styles.dot, { backgroundColor: theme.colors.accent }, getDotStyle(dot2)]}
            />
            <Animated.View
              style={[styles.dot, { backgroundColor: theme.colors.accent }, getDotStyle(dot3)]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AIChat({ messages, isTyping = false, onCopyMessage }: AIChatProps) {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [messages.length, isTyping, scrollToBottom]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} onCopy={onCopyMessage} />
    ),
    [onCopyMessage]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const ListFooter = useCallback(
    () => (isTyping ? <TypingIndicator /> : null),
    [isTyping]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          GPT Анализ
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Задайте вопрос о криптовалютах или используйте быстрые кнопки анализа ниже
        </Text>
      </View>
    ),
    [theme.colors]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContainer}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={ListEmpty}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={scrollToBottom}
      onLayout={scrollToBottom}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  analysisMessageContainer: {
    marginBottom: 12,
    width: '100%',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 11,
  },
  copyButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
