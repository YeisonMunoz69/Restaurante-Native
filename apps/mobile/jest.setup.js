/* eslint-disable no-undef */

// simulacion basica de react-native-keychain para el entorno de pruebas unitarias
jest.mock(
  'react-native-keychain',
  () => {
    const mockStorage = {};
    return {
      SECURITY_LEVEL: {
        SECURE_SOFTWARE: 'SECURE_SOFTWARE',
        SECURE_HARDWARE: 'SECURE_HARDWARE',
      },
      ACCESSIBLE: {
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      },
      setGenericPassword: jest.fn((username, password, options) => {
        const service = options?.service || 'default';
        mockStorage[service] = { username, password };
        return Promise.resolve(true);
      }),
      getGenericPassword: jest.fn(options => {
        const service = options?.service || 'default';
        const item = mockStorage[service];
        return Promise.resolve(item || false);
      }),
      resetGenericPassword: jest.fn(options => {
        const service = options?.service || 'default';
        delete mockStorage[service];
        return Promise.resolve(true);
      }),
    };
  },
  { virtual: true },
);

// simulacion completa de react-native-safe-area-context con contextos y consumers
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext(frame);

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

// simulacion de react-native-screens
jest.mock('react-native-screens', () => {
  const View = require('react-native').View;
  return {
    enableScreens: jest.fn(),
    screensEnabled: jest.fn(() => true),
    ScreenContainer: View,
    Screen: View,
    NativeScreen: View,
    NativeScreenContainer: View,
  };
});
