import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme-context';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { login, isLoading } = useAuth();
  const styles = createStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const onNavigateToRegister = useCallback(() => {
    navigation.replace('Register');
  }, [navigation]);

  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  const onForgotPassword = useCallback(() => {
    Alert.prompt(
      'Сброс пароля',
      'Введите email для восстановления пароля:',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить',
          onPress: async (inputEmail?: string) => {
            if (!inputEmail || !inputEmail.trim()) {
              Alert.alert('Ошибка', 'Введите email адрес');
              return;
            }

            if (!validateEmail(inputEmail.trim())) {
              Alert.alert('Ошибка', 'Введите корректный email адрес');
              return;
            }

            setIsResetting(true);
            try {
              // Simulate API call - in production this would call the backend
              await new Promise(resolve => setTimeout(resolve, 1500));

              Alert.alert(
                'Письмо отправлено',
                `Инструкции по сбросу пароля отправлены на ${inputEmail.trim()}. Проверьте папку "Спам", если письмо не пришло.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert(
                'Ошибка',
                'Не удалось отправить письмо. Попробуйте позже.'
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ],
      'plain-text',
      email // Pre-fill with current email if entered
    );
  }, [email]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Ошибка входа',
        error instanceof Error ? error.message : 'Не удалось войти'
      );
    }
  };

  const handleSocialLogin = useCallback((provider: 'google' | 'apple') => {
    const providerName = provider === 'google' ? 'Google' : 'Apple';

    Alert.alert(
      `Вход через ${providerName}`,
      `Авторизация через ${providerName} будет доступна в следующем обновлении.\n\nПока вы можете войти с помощью email и пароля или создать новый аккаунт.`,
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Узнать больше',
          onPress: () => {
            Linking.openURL('https://tradealert.ru/faq');
          },
        },
      ]
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Placeholder */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>TP</Text>
          </View>
          <Text style={styles.appName}>TradePulse</Text>
          <Text style={styles.tagline}>Торговые алерты в реальном времени</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={theme.colors.textPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Введите пароль"
              placeholderTextColor={theme.colors.textPlaceholder}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={onForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={styles.loginButtonText}>Войти</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>или</Text>
          <View style={styles.divider} />
        </View>

        {/* Social Login */}
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('google')}
            disabled={isLoading || isResetting}
          >
            <Ionicons name="logo-google" size={20} color={theme.colors.textPrimary} style={styles.socialIconStyle} />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialLogin('apple')}
              disabled={isLoading || isResetting}
            >
              <Ionicons name="logo-apple" size={20} color={theme.colors.textPrimary} style={styles.socialIconStyle} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Нет аккаунта? </Text>
          <TouchableOpacity onPress={onNavigateToRegister} disabled={isLoading}>
            <Text style={styles.registerLink}>Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.appBackground,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 32,
      color: theme.colors.buttonText,
    },
    appName: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 28,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    tagline: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    form: {
      marginBottom: 24,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.input,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 24,
    },
    forgotPasswordText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 14,
      color: theme.colors.accent,
    },
    loginButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    loginButtonText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      color: theme.colors.buttonText,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    dividerText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textMuted,
      marginHorizontal: 16,
    },
    socialContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 32,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    socialIconStyle: {
      marginRight: 8,
    },
    socialButtonText: {
      fontFamily: 'SpaceGrotesk_500Medium',
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    registerLink: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.accent,
    },
  });

export default LoginScreen;
