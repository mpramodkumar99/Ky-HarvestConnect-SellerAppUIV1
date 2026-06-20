import { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

import classes from './animated-icon.module.css';

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  const bgScale      = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(1.2)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bgScale, { toValue: 1, useNativeDriver: false }),
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.spring(logoOpacity, { toValue: 1, useNativeDriver: false }),
          Animated.spring(logoScale,   { toValue: 1, useNativeDriver: false }),
        ]),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.background, { transform: [{ scale: bgScale }] }]}>
        <div className={classes.sellerLogoBackground} />
      </Animated.View>

      <Animated.View
        style={[styles.imageContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoMark}>
          <Animated.Text style={styles.logoEmoji}>🌾</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
  logoMark: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 48,
  },
});
