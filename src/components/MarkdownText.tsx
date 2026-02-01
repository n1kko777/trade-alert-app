import React from 'react';
import { Text, View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../theme-context';

interface MarkdownTextProps {
  children: string;
  style?: TextStyle;
}

interface ParsedBlock {
  type: 'heading' | 'paragraph' | 'listItem' | 'text';
  level?: number;
  content: string;
}

/**
 * Simple markdown renderer for React Native
 * Supports: headers (#, ##, ###), bold (**), italic (*), lists (-, *)
 */
export default function MarkdownText({ children, style }: MarkdownTextProps) {
  const { theme } = useTheme();

  const parseBlocks = (text: string): ParsedBlock[] => {
    const lines = text.split('\n');
    const blocks: ParsedBlock[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Headers
      const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
      if (headerMatch) {
        blocks.push({
          type: 'heading',
          level: headerMatch[1].length,
          content: headerMatch[2],
        });
        continue;
      }

      // List items
      const listMatch = trimmed.match(/^[-*]\s+(.+)/);
      if (listMatch) {
        blocks.push({
          type: 'listItem',
          content: listMatch[1],
        });
        continue;
      }

      // Numbered list items
      const numberedListMatch = trimmed.match(/^\d+\.\s+(.+)/);
      if (numberedListMatch) {
        blocks.push({
          type: 'listItem',
          content: numberedListMatch[1],
        });
        continue;
      }

      // Regular paragraph
      blocks.push({
        type: 'paragraph',
        content: trimmed,
      });
    }

    return blocks;
  };

  const renderInlineFormatting = (text: string, baseStyle: TextStyle): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(
            <Text key={key++} style={baseStyle}>
              {remaining.substring(0, boldMatch.index)}
            </Text>
          );
        }
        parts.push(
          <Text key={key++} style={[baseStyle, styles.bold]}>
            {boldMatch[1]}
          </Text>
        );
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Italic *text* (single asterisk, not inside bold)
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          parts.push(
            <Text key={key++} style={baseStyle}>
              {remaining.substring(0, italicMatch.index)}
            </Text>
          );
        }
        parts.push(
          <Text key={key++} style={[baseStyle, styles.italic]}>
            {italicMatch[1]}
          </Text>
        );
        remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // No more matches, add remaining text
      parts.push(
        <Text key={key++} style={baseStyle}>
          {remaining}
        </Text>
      );
      break;
    }

    return parts;
  };

  const blocks = parseBlocks(children);

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading': {
            const headingStyle: TextStyle = {
              ...styles.heading,
              fontSize: block.level === 1 ? 20 : block.level === 2 ? 17 : 15,
              color: theme.colors.textPrimary,
            };
            return (
              <Text key={index} style={[headingStyle, style]}>
                {renderInlineFormatting(block.content, headingStyle)}
              </Text>
            );
          }

          case 'listItem': {
            const itemStyle: TextStyle = {
              ...styles.text,
              color: theme.colors.textPrimary,
            };
            return (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
                <Text style={[itemStyle, styles.listText, style]}>
                  {renderInlineFormatting(block.content, itemStyle)}
                </Text>
              </View>
            );
          }

          default: {
            const textStyle: TextStyle = {
              ...styles.text,
              color: theme.colors.textPrimary,
            };
            return (
              <Text key={index} style={[textStyle, style]}>
                {renderInlineFormatting(block.content, textStyle)}
              </Text>
            );
          }
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  heading: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    paddingLeft: 8,
  },
  bullet: {
    marginRight: 8,
    fontSize: 15,
  },
  listText: {
    flex: 1,
  },
});
