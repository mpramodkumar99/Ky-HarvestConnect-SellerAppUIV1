import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, []);

  if (!visible) return null;

  return <Animated.View style={[styles.overlay, { opacity }]} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#2d7a47',
    zIndex: 1000,
  },
});
