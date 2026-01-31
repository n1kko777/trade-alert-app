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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme-context';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const onNavigateToLogin = useCallback(() => {
    navigation.replace('Login');
  }, [navigation]);
  const { theme } = useTheme();
  const { register, isLoading } = useAuth();
  const styles = createStyles(theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Ошибка', 'Примите условия использования');
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
    } catch (error) {
      Alert.alert(
        'Ошибка регистрации',
        error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
      );
    }
  };

  const handleTermsPress = () => {
    Alert.alert(
      'Условия использования',
      'Полный текст условий использования будет доступен позже.'
    );
  };

  const handlePrivacyPress = () => {
    Alert.alert(
      'Политика конфиденциальности',
      'Полный текст политики конфиденциальности будет доступен позже.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.subtitle}>
            Зарегистрируйтесь для доступа ко всем функциям
          </Text>
        </View>

        {/* Registration Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Имя</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ваше имя"
              placeholderTextColor={theme.colors.textPlaceholder}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

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
              placeholder="Минимум 6 символов"
              placeholderTextColor={theme.colors.textPlaceholder}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Подтвердите пароль</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Повторите пароль"
              placeholderTextColor={theme.colors.textPlaceholder}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
            disabled={isLoading}
          >
            <View
              style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
            >
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>
                Я принимаю{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>
                  условия использования
                </Text>{' '}
                и{' '}
                <Text style={styles.termsLink} onPress={handlePrivacyPress}>
                  политику конфиденциальности
                </Text>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.registerButton,
              (!termsAccepted || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={!termsAccepted || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.buttonText} />
            ) : (
              <Text style={styles.registerButtonText}>Зарегистрироваться</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Уже есть аккаунт? </Text>
          <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
            <Text style={styles.loginLink}>Войти</Text>
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
    header: {
      marginBottom: 32,
    },
    title: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 28,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 16,
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
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
      marginTop: 8,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkmark: {
      color: theme.colors.buttonText,
      fontSize: 14,
      fontWeight: 'bold',
    },
    termsTextContainer: {
      flex: 1,
    },
    termsText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    termsLink: {
      fontFamily: 'SpaceGrotesk_500Medium',
      color: theme.colors.accent,
    },
    registerButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    registerButtonText: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 16,
      color: theme.colors.buttonText,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loginText: {
      fontFamily: 'SpaceGrotesk_400Regular',
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    loginLink: {
      fontFamily: 'SpaceGrotesk_700Bold',
      fontSize: 14,
      color: theme.colors.accent,
    },
  });

export default RegisterScreen;
