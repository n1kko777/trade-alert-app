import React, { createContext, useContext, useMemo } from 'react';
import createStyles from './styles';
import { Theme } from './theme';

type ThemeContextValue = {
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const value = useMemo(() => ({ theme, styles }), [theme, styles]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('ThemeProvider is missing');
  }
  return context;
};
