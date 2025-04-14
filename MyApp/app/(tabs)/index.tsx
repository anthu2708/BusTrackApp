import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as Location from "expo-location";
import { getNextClassToday } from "../../utils/schedule";
import { useRouter } from "expo-router";
import * as Notifications from 'expo-notifications';
import {SchedulableTriggerInputTypes} from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr.includes("T") ? timeStr : `2025-01-01T${timeStr}`);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatNow = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// notification
const requestNotificationPermissions = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
};

const App = () => {
  const [origin, setOrigin] = useState<string | null>(null);
  const router = useRouter();
  const [nowTime, setNowTime] = useState(formatNow());
  const [routes, setRoutes] = useState<any[]>([]);
  const [nextClass, setNextClass] = useState<any | null>(null);

  const fetchNextClassAndRoutes = async () => {
  try {
    const scheduleRes = await fetch("https://tep-prj.onrender.com/schedule/");
    const scheduleData = await scheduleRes.json();
    const next = getNextClassToday(scheduleData);
    setNextClass(next);

    if (!next) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("Permission to access location was denied");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const originStr = `${location.coords.latitude},${location.coords.longitude}`;
    setOrigin(originStr);

    const [h, m] = next.start_time.split(":").map((s: string) => parseInt(s, 10));
    const classStart = new Date();
    classStart.setHours(h);
    classStart.setMinutes(m);
    classStart.setSeconds(0);
    classStart.setMilliseconds(0);

    const arrivalTimestamp = Math.floor((classStart.getTime() - 5 * 60 * 1000) / 1000); // 5 mins early

    const notiTimeBeforeClass = new Date(classStart.getTime() - 30 * 60 * 1000);
    const notiTimeBeforeDeparture = new Date(arrivalTimestamp * 1000 - 5 * 60 * 1000);

await Notifications.scheduleNotificationAsync({
  content: {
    title: "Upcoming Class 📚",
    body: `${next.class_name.split(" - ")[0]} starts in 30 minutes at ${next.address}`,
  },
  trigger: {
    seconds: Math.max(5, Math.floor((notiTimeBeforeClass.getTime() - Date.now()) / 1000)),
    repeats: false,
    type: SchedulableTriggerInputTypes.TIME_INTERVAL
  },
});


await Notifications.scheduleNotificationAsync({
  content: {
    title: "Time to Leave 🚌",
    body: `Leave now to arrive 5 minutes early at ${next.address}`,
  },
  trigger: {
    seconds: Math.max(5, Math.floor((notiTimeBeforeDeparture.getTime() - Date.now()) / 1000)),
    repeats: false,
    type: SchedulableTriggerInputTypes.TIME_INTERVAL
  },
});


    const routeRes = await fetch("https://tep-prj.onrender.com/map/fastest-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: originStr,
        destination: next.address,
        arrival_time: arrivalTimestamp,
      }),
    });

    const routeData = await routeRes.json();
    if (routeData.status === "success") {
      setRoutes(routeData.routes);
    } else {
      console.error("Failed to fetch routes:", routeData.error);
    }

  } catch (error) {
    console.error("Error fetching next class or routes:", error);
  }
};

  useEffect(() => {
    fetchNextClassAndRoutes();
    requestNotificationPermissions();
  }, []);
  // const for testing
  //     const mockNextClass = {
  //       class_name: "CPSC 221 L1 - Basic Algorithms",
  //       start_time: "14:00",
  //       end_time: "15:20",
  //       address: "UBC Bus Loop",
  //     };
  //     const mockRoutes = [
  //     {
  //       mode: "transit",
  //       departure_time: "13:35",
  //       arrival_time: "13:55",
  //       duration_value: 1200,
  //       steps: [
  //         {
  //           html_instructions: "Walk to bus stop",
  //           duration: { value: 300 },
  //         },
  //         {
  //           html_instructions: "Take bus 25 to UBC",
  //           duration: { value: 900 },
  //           transit_details: {
  //             line: { short_name: "25" },
  //           },
  //         },
  //       ],
  //     },
  //     {
  //       mode: "walking",
  //       departure_time: "13:20",
  //       arrival_time: "14:00",
  //       duration_value: 2400,
  //       steps: [
  //         {
  //           html_instructions: "Walk straight for 30 mins",
  //           duration: { value: 2400 },
  //         },
  //       ],
  //     },
  //   ];
  // useEffect(() => { setOrigin("49.2606,-123.2460");
  //   setNextClass(mockNextClass);
  //   setRoutes(mockRoutes);
  //   setOrigin("49.2606,-123.2460");
  // }, []);


  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(formatNow());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNextClassAndRoutes();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {nextClass ? (
        <View style={styles.classCard}>
          <Text style={styles.classTitle}>
            {nextClass.class_name.split(" - ")[0]}
          </Text>
          <Text style={styles.classTime}>{nowTime}</Text>
          <Text style={styles.classLocation}>{nextClass.address}</Text>
          <Text style={styles.classLocation}>
            {formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)}
          </Text>
        </View>
      ) : (
        <View style={styles.classCard}>
          <Text style={styles.classTitle}>No Upcoming Event</Text>
        </View>
      )}

      {nextClass &&
        (routes.length > 0 ? (
          routes.map((route, index) => {
            if (!route.steps || route.steps.length === 0) return null;
            const firstStep = route.steps[0];
            const icon =
              route.mode === "driving"
                ? "🚗"
                : route.mode === "walking"
                ? "🚶"
                : "🚌";

            const line =
              route.steps.find((s: any) => s.transit_details?.line?.short_name)
                ?.transit_details?.line?.short_name ?? stripHtml(firstStep.html_instructions || "");

            const classEnd = new Date("2025-01-01T" + nextClass.end_time);
            const arrival = new Date("2025-01-01T" + route.arrival_time);
            const isLate = arrival.getTime() > classEnd.getTime();

            return (

              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (!origin || isLate) return;
                  router.push({
                    pathname: "/explore",
                    params: {
                      origin,
                      destination: nextClass.address,
                      mode: route.mode,
                      steps: JSON.stringify(route.steps),
                    },
                  });
                }}
              >

                <View style={styles.infoRow}>
                  <Text style={styles.icon}>{icon}</Text>
                  <View style={styles.infoTextContainer}>
                    {isLate ? (
                      <Text style={styles.routeBold}>No route available</Text>
                    ) : (
                      <>
                        <Text style={styles.timeText}>
                          {formatTime(route.departure_time)} – {formatTime(route.arrival_time)}
                        </Text>
                        <Text
                          style={styles.route}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          <Text style={styles.routeBold}>{line}</Text>
                        </Text>
                      </>
                    )}
                  </View>
                  {!isLate && (
                    <Text style={styles.duration}>
                      {formatDuration(route.duration_value)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.icon}>❌</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.routeBold}>No route available</Text>
            </View>
          </View>
        ))}
    </View>
  );
};
//style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEBFF",
    justifyContent: "center",
    alignItems: "center",
  },
  classCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 25,
    width: "90%",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  classTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  classTime: {
    fontSize: 18,
    color: "#555",
    marginBottom: 4,
  },
  classLocation: {
    fontSize: 16,
    color: "#888",
    marginBottom: 2,
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
    margin: 10,
  },
  icon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
