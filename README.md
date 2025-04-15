# 🦆 QuackTrack – Smart School & Transit Companion

QuackTrack is a mobile companion app for students to manage their school schedule and transit in real-time. Powered by FastAPI and React Native (Expo), QuackTrack helps students **import school schedules**, **track buses**, and **navigate to classes** — all through a **talking duck mascot** on your home widget.

## ✨ Key Features

- 📅 **Smart Schedule Import**
  - Import from `.xls` files or your phone’s calendar.
  - Automatically detects today's classes and next class.

- 🗺️ **Real-Time Bus & Navigation**
  - View real-time bus locations using Google Maps API.
  - Calculate fastest route (walk, drive, transit) to your next class.
  - Get **step-by-step navigation** with **live updates**.

## 🧠 Tech Stack

| Layer     | Tech                                  |
|-----------|---------------------------------------|
| Backend   | FastAPI, SQLAlchemy, Pandas, Uvicorn  |
| Frontend  | React Native (Expo), React Navigation |
| APIs      | Google Maps API, Location, Calendar   |
| Storage   | PostgreSQL                            |

---

## 🚀 Getting Started

### 1. Try the App Instantly

You can try **QuackTrack** right now — no build needed!

#### 📲 Steps:

1. Download **Expo Go**:
   - [iOS – App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android – Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Open Expo Go and **scan the QR code below**:

<p align="center">
  <img src="assets/qr-code.svg" width="220" alt="QR code to launch QuackTrack on Expo Go" />
</p>

---

### 2. Screenshots

### Home Widget

<p align="center">
  <img src="assets/screen-home.png" width="180" />
</p>

---

### Explore – Live Route Navigation

<p align="center">
  <img src="assets/screen-explore.png" width="180" />
</p>

---

### Calendar View – Today Schedule

<p align="center">
  <img src="assets/screen-calendar.png" width="180" />
</p>

---
