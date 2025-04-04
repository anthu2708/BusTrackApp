import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Location from "expo-location";

type Step = {
  html_instructions: string;
  duration: { value: number };
  transit_details?: {
    line?: {
      short_name?: string;
    };
  };
};

type Route = {
  mode: string;
  duration_value: number;
  departure_time: string;
  arrival_time: string;
  steps: Step[];
};

const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr.includes("T") ? timeStr : `2025-01-01T${timeStr}`);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};
const now = new Date();


const App = () => {
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Permission to access location was denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const origin = `${location.coords.latitude},${location.coords.longitude}`;

        const response = await fetch("https://tep-prj.onrender.com/map/fastest-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin,
            destination: "UBC Bus Loop",
          }),
        });

        const data = await response.json();
        if (data.status === "success") {
          setRoutes(data.routes);
        } else {
          console.error("Failed to fetch routes:", data.error);
        }
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };

    fetchRoutes();
  }, []);

  return (
    <View style={styles.container}>
      {routes.map((route, index) => {
        const firstStep = route.steps[0];
        const icon =
          route.mode === "driving" ? "🚗" : route.mode === "walking" ? "🚶" : "🚌";

        const line =
          route.steps.find((s) => s.transit_details?.line?.short_name)?.transit_details?.line
            ?.short_name ?? stripHtml(firstStep?.html_instructions ?? "");

        return (
          <View key={index} style={styles.infoRow}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.timeText}>
                {formatTime(route.departure_time)} – {formatTime(route.arrival_time)}
              </Text>

              <Text style={styles.route}>
                <Text style={styles.routeBold}>{line}</Text>
              </Text>
            </View>
            <Text style={styles.duration}>{formatDuration(route.duration_value)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEBFF",
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 30,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    margin: 10
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center", // center text
  },
  timeText: {
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
  },
  route: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  routeBold: {
    fontWeight: "bold",
    color: "#666",
  },
  duration: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
});

export default App;
