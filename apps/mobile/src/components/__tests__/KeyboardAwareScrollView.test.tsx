import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from '../KeyboardAwareScrollView';

describe('KeyboardAwareScrollView', () => {
  it('keeps the primary action in the scrollable content and handles keyboard taps', () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <KeyboardAwareScrollView>
          <TouchableOpacity testID="primary-action" />
        </KeyboardAwareScrollView>,
      );
    });

    const scrollView = tree!.root.findByType(ScrollView);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.keyboardDismissMode).toBe('none');
    expect(scrollView.findByProps({ testID: 'primary-action' })).toBeTruthy();
    const keyboardAvoidingView = tree!.root.findByType(KeyboardAvoidingView);
    expect(keyboardAvoidingView.props.behavior).toBe(
      Platform.OS === 'ios' ? 'padding' : 'height',
    );
    expect(keyboardAvoidingView.props.style).toEqual({ flex: 1 });

    ReactTestRenderer.act(() => tree!.unmount());
  });
});
