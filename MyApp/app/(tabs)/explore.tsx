import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, FlatList } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import polyline from "@mapbox/polyline";

const screen = Dimensions.get("window");

const ExploreScreen = () => {
  const params = useLocalSearchParams();
  const { origin, destination, mode, steps } = params;

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const mapRef = useRef<MapView>(null);

  if (!steps || !origin || !destination) {
    return (
      <View style={styles.safeContainer}>
        <Text style={styles.safeText}>Waiting for route info...</Text>
      </View>
    );
  }

  let parsedSteps: any[] = [];
  try {
    parsedSteps = JSON.parse(steps as string);
  } catch {
    return (
      <View style={styles.safeContainer}>
        <Text style={styles.safeText}>Invalid route format</Text>
      </View>
    );
  }

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
    };

    startTracking();
  }, []);

  const decodePolyline = (encoded: string) =>
    polyline.decode(encoded).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

  const fullCoords = parsedSteps.flatMap((step: any) =>
    step.polyline?.points ? decodePolyline(step.polyline.points) : []
  );

  const focusStep = (index: number) => {
    const step = parsedSteps[index];
    const coords = decodePolyline(step.polyline?.points || "");
    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    focusStep(currentStep);
  }, [currentStep]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: fullCoords[0]?.latitude || 49.2606,
          longitude: fullCoords[0]?.longitude || -123.2460,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        followsUserLocation
      >
        <Polyline coordinates={fullCoords} strokeWidth={5} strokeColor="#007AFF" />
        {fullCoords.length > 0 && (
          <>
            <Marker coordinate={fullCoords[0]} title="Start" />
            <Marker coordinate={fullCoords[fullCoords.length - 1]} title="End" />
          </>
        )}
      </MapView>

      <FlatList
        horizontal
        pagingEnabled
        data={parsedSteps}
        keyExtractor={(_, index) => index.toString()}
        showsHorizontalScrollIndicator={false}
        style={styles.stepList}
        onMomentumScrollEnd={(e) => {
          const index = Math.floor(e.nativeEvent.contentOffset.x / screen.width);
          setCurrentStep(index);
        }}
        renderItem={({ item, index }) => (
          <View style={styles.stepCard}>
            <Text style={styles.stepIndex}>Step {index + 1}</Text>
            <Text style={styles.stepText}>
              {item.html_instructions.replace(/<[^>]+>/g, "")}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  stepList: {
    position: "absolute",
    bottom: 30,
  },
  stepCard: {
    backgroundColor: "#fff",
    width: screen.width - 40,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    elevation: 5,
  },
  stepIndex: {
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  stepText: {
    fontSize: 16,
    color: "#222",
  },
  safeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  safeText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});

export default ExploreScreen;
