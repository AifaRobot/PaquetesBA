import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = ({ style, children }: any) => (
  <View style={[styles.placeholder, style]}>
    <Text style={styles.text}>Mapa no disponible en web</Text>
    {children}
  </View>
);

const Marker = (_: any) => null;
const Polyline = (_: any) => null;
const Circle = (_: any) => null;
const Callout = ({ children }: any) => <>{children}</>;

const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  text: {
    color: '#666',
    fontSize: 14,
  },
});

export default MapView;
export { Marker, Polyline, Circle, Callout, PROVIDER_GOOGLE };
