import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import * as MediaLibrary from 'expo-media-library';

const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr.includes("T") ? timeStr : `2025-01-01T${timeStr}`);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};


const handleImport = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      copyToCacheDirectory: true,
    });

    console.log("📂 Full result:", result);

    if (result.canceled || !result.assets?.length) {
      alert("❌ No file selected.");
      return;
    }

    const file = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as any);

    const response = await fetch('https://tep-prj.onrender.com/schedule/upload-excel', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log("📦 Server says:", data);

    if (response.ok) {
      alert("✅ Upload successful!");
    } else {
      alert(`❌ Upload failed: ${JSON.stringify(data.detail)}`);
    }

  } catch (error) {
    console.error("❌ Upload error:", error);
    alert("❌ Error uploading file.");
  }
};


const getDayCode = () => {
  const dayMap: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  };
  const code = dayMap[new Date().getDay()];
  console.log("📅 Today is:", code);
  return code;
};

const isToday = (start: string, end: string, days: string): boolean => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const code = getDayCode();

  const inRange =
    start <= todayStr &&
    todayStr <= end;

  const matchDay = days.split(',').map(d => d.trim()).includes(code);

  return inRange && matchDay;
};


const ScheduleScreen = () => {
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch('https://tep-prj.onrender.com/schedule/');
        const data = await response.json();

        const filtered = data.filter((item: any) => {
  const match = isToday(item.start_date, item.end_date, item.days);
  if (match) {
    console.log("✅ Included:", item.class_name, item.days);
  } else {
    console.log("❌ Skipped:", item.class_name, item.days);
  }
  return match;
});

        filtered.sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

        setScheduleItems(filtered);
      } catch (error) {
        console.error("Failed to load schedule", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Schedule</Text>
      <View style={styles.purpleBox}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : scheduleItems.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#fff', marginTop: 50 }}>No classes today 🎉</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollView}>
            {scheduleItems.map((item, index) => (
              <View style={styles.scheduleItem} key={index}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{formatTime(item.start_time)}</Text>

                </View>
                <View style={styles.details}>
                  <Text style={styles.title}>{item.class_name}</Text>
                  <Text style={styles.location}>{item.address}</Text>
                  <Text style={styles.duration}>
                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity style={styles.importButton} onPress={handleImport}>
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8FC',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center'
  },
  header: {
    top: 60,
    width: '60%',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: '#A5A5F8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    textAlign: 'center',
  },
  purpleBox: {
    backgroundColor: '#A5A5F8', // Same color as the schedule header
    borderRadius: 20,
    padding: 20,
    flex: 1,
    maxHeight: 550,
    top: 70,
    width: '100%', // Ensure it takes full width
  },
  scrollView: {
    width: '100%',
    flexGrow: 1,
  },
  scheduleItem: {
    flexDirection: 'row', // Align items in a row
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  timeBox: {
    width: 60,
    height: 60, // Fixed height to make it square
    borderRadius: 15,
    backgroundColor: '#A5A5F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },

  location: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  duration: {
    fontSize: 12,
    color: '#888',
  },
  importButton: {
    marginTop: 20,
    backgroundColor: '#6B6BF0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
    alignSelf: 'center',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default ScheduleScreen;