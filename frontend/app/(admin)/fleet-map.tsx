import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';

import { getDrivers, type DriverProfileWithUser } from '@/src/api/drivers';
import { getZones } from '@/src/api/zones';
import { LoadingScreen } from '@/src/components/LoadingScreen';
import { socketService } from '@/src/services/socket.service';
import { useAuthStore } from '@/src/store/auth.store';
import { useTrackingStore } from '@/src/store/tracking.store';
import type { WsDriverLocation, WsFleetSnapshot } from '@/src/types';

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';

interface DriverMarker {
  driverId: string;
  name: string;
  vehicle: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  zoneId: string | null;
}

export default function FleetMapScreen() {
  const { session } = useAuthStore();
  const { fleetLocations, setFleetSnapshot, setFleetLocation } = useTrackingStore();
  const mapRef = useRef<MapView>(null);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [driverMarkers, setDriverMarkers] = useState<Map<string, DriverMarker>>(new Map());

  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'all'],
    queryFn: () => getDrivers({ limit: 200 }),
  });

  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
  });

  // Build a lookup: driverId (userId) → display info
  const driverInfoMap = useCallback(() => {
    const map = new Map<string, { name: string; vehicle: string; zoneId: string | null }>();
    driversData?.items?.forEach((d: DriverProfileWithUser) => {
      map.set(d.userId, {
        name: `${d.user.firstName} ${d.user.lastName}`,
        vehicle: d.vehicleType ?? 'Vehículo',
        zoneId: d.zoneId ?? null,
      });
    });
    return map;
  }, [driversData]);

  // Sync fleetLocations from store into driverMarkers state
  useEffect(() => {
    const infoMap = driverInfoMap();
    const next = new Map<string, DriverMarker>();
    fleetLocations.forEach((loc, driverId) => {
      const info = infoMap.get(driverId);
      next.set(driverId, {
        driverId,
        name: info?.name ?? `Repartidor ${driverId.slice(0, 6)}`,
        vehicle: info?.vehicle ?? 'Vehículo',
        lat: loc.lat,
        lng: loc.lng,
        lastUpdate: new Date().toLocaleTimeString('es-AR'),
        zoneId: info?.zoneId ?? null,
      });
    });
    setDriverMarkers(next);
  }, [fleetLocations, driverInfoMap]);

  // WebSocket setup
  useEffect(() => {
    if (!session?.access_token) return;

    socketService.connect(session.access_token);
    socketService.joinFleetRoom();

    socketService.onFleetSnapshot((snapshot: WsFleetSnapshot) => {
      setFleetSnapshot(snapshot.drivers);
    });

    socketService.onDriverLocation((update: WsDriverLocation) => {
      setFleetLocation(update);
    });

    return () => {
      socketService.offFleetSnapshot();
      socketService.offDriverLocation();
    };
  }, [session?.access_token, setFleetSnapshot, setFleetLocation]);

  const visibleMarkers = Array.from(driverMarkers.values()).filter(
    (d) => selectedZone === 'all' || d.zoneId === selectedZone,
  );

  const onlineCount = visibleMarkers.length;

  const defaultRegion: Region = {
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  if (!session) {
    return <LoadingScreen message="Cargando..." />;
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {visibleMarkers.map((driver) => (
          <Marker
            key={driver.driverId}
            coordinate={{ latitude: driver.lat, longitude: driver.lng }}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="bicycle" size={18} color="#FFFFFF" />
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{driver.name}</Text>
                <Text style={styles.calloutSub}>{driver.vehicle}</Text>
                <Text style={styles.calloutTime}>Última: {driver.lastUpdate}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Online Count Badge */}
      <View style={styles.countBadge}>
        <Ionicons name="bicycle" size={16} color="#FFFFFF" />
        <Text style={styles.countText}>{onlineCount} en línea</Text>
      </View>

      {/* Zone Filter */}
      <View style={styles.zoneFilterContainer}>
        <TouchableOpacity
          style={[
            styles.zoneChip,
            selectedZone === 'all' && styles.zoneChipActive,
          ]}
          onPress={() => setSelectedZone('all')}
        >
          <Text
            style={[
              styles.zoneChipText,
              selectedZone === 'all' && styles.zoneChipTextActive,
            ]}
          >
            Todas
          </Text>
        </TouchableOpacity>
        {zones?.map((zone) => (
          <TouchableOpacity
            key={zone.id}
            style={[
              styles.zoneChip,
              selectedZone === zone.id && styles.zoneChipActive,
            ]}
            onPress={() => setSelectedZone(zone.id)}
          >
            <Text
              style={[
                styles.zoneChipText,
                selectedZone === zone.id && styles.zoneChipTextActive,
              ]}
              numberOfLines={1}
            >
              {zone.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Sheet Toggle */}
      <TouchableOpacity
        style={styles.sheetToggle}
        onPress={() => setSheetVisible(true)}
      >
        <Ionicons name="list-outline" size={20} color="#FFFFFF" />
        <Text style={styles.sheetToggleText}>Ver lista</Text>
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setSheetVisible(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Repartidores en línea ({onlineCount})
              </Text>
              <TouchableOpacity onPress={() => setSheetVisible(false)}>
                <Ionicons name="close" size={22} color={SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={visibleMarkers}
              keyExtractor={(item) => item.driverId}
              renderItem={({ item }) => (
                <View style={styles.driverListItem}>
                  <View style={styles.driverListIcon}>
                    <Ionicons name="bicycle" size={20} color={PRIMARY} />
                  </View>
                  <View style={styles.driverListInfo}>
                    <Text style={styles.driverListName}>{item.name}</Text>
                    <Text style={styles.driverListSub}>{item.vehicle}</Text>
                  </View>
                  <View style={styles.driverListRight}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.driverListTime}>{item.lastUpdate}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No hay repartidores en línea
                </Text>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2980B9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  callout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '700',
    color: SECONDARY,
    marginBottom: 2,
  },
  calloutSub: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  countBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: 16,
    backgroundColor: '#27AE60',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  zoneFilterContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 12,
    right: 80,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'nowrap',
  },
  zoneChip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zoneChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },
  zoneChipTextActive: {
    color: '#FFFFFF',
  },
  sheetToggle: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: SECONDARY,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  sheetToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SECONDARY,
  },
  driverListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  driverListIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverListInfo: {
    flex: 1,
  },
  driverListName: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY,
  },
  driverListSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  driverListRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  driverListTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 24,
  },
});
