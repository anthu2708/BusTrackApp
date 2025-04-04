from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv
from zoneinfo import ZoneInfo
from typing import Optional
from datetime import datetime, timedelta
from typing import Optional
from datetime import datetime, timedelta
router = APIRouter()

# ========================
# === Models ============
# ========================
class RouteRequest(BaseModel):
    origin: str
    destination: str
    arrival_time: Optional[int] = None

# ========================
# === Constants =========
# ========================
load_dotenv()
GOOGLE_API_KEY =  os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("Missing Google API Key.")

GOOGLE_MAPS_API_URL = "https://maps.googleapis.com/maps/api/directions/json"
GOOGLE_GEOLOCATION_API_URL = "https://www.googleapis.com/geolocation/v1/geolocate"

# ========================
# === Core Logic ========
# ========================

def fetch_route(origin: str, destination: str, mode: str, arrival_time: Optional[int] = None):
    try:
        estimated_duration_sec = None
        departure_time = None

        # If arrival_time is provided, we need to back-calculate departure time
        if arrival_time and mode in ["driving", "walking"]:
            # Estimate duration first
            initial_response = requests.get(
                GOOGLE_MAPS_API_URL,
                params={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "key": GOOGLE_API_KEY,
                },
                timeout=10
            )

            if initial_response.status_code != 200:
                raise HTTPException(status_code=initial_response.status_code, detail="Error estimating duration.")

            initial_data = initial_response.json()
            if not initial_data.get("routes"):
                raise HTTPException(status_code=404, detail="No route found for estimate.")

            leg = initial_data["routes"][0]["legs"][0]
            estimated_duration_sec = leg["duration"]["value"]
            departure_time = arrival_time - estimated_duration_sec

            # 🔥 Make sure departure_time is not in the past
            now_ts = int(datetime.now().timestamp())
            if departure_time < now_ts:
                departure_time = now_ts  # fallback to "now"

        # Build request params
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "key": GOOGLE_API_KEY,
        }

        if arrival_time and mode == "transit":
            params["arrival_time"] = arrival_time
        elif departure_time and mode in ["driving", "walking"]:
            params["departure_time"] = departure_time

        # Final request
        response = requests.get(
            GOOGLE_MAPS_API_URL,
            params=params,
            timeout=10
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Google Maps API error: {response.text}"
            )

        data = response.json()
        if not data.get("routes"):
            print(response.text)
            raise HTTPException(status_code=404, detail="No route found.")

        leg = data["routes"][0]["legs"][0]
        return {
            "status": "success",
            "message": f"{mode.capitalize()} route retrieved successfully.",
            "summary": data["routes"][0].get("summary", ""),
            "duration": leg["duration"]["text"],
            "duration_value": leg["duration"]["value"],
            "steps": leg["steps"]
        }

    except HTTPException:
        raise
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="Could not reach Google Maps service.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# ========================
# === API Endpoints =====
# ========================

@router.post("/transit-route")
def get_transit_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "transit", request.arrival_time)

@router.post("/car-route")
def get_car_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "driving", request.arrival_time)

@router.post("/walk-route")
def get_walk_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "walking", request.arrival_time)


@router.post("/fastest-route")
def get_fastest_route(request: RouteRequest):
    modes = ["driving", "walking", "transit"]
    routes = []

    for mode in modes:
        try:
            route_data = fetch_route(request.origin, request.destination, mode, request.arrival_time)
            duration_sec = route_data["duration_value"]
            now = datetime.now(ZoneInfo("America/Vancouver"))

            if request.arrival_time:
                arrival_dt = datetime.fromtimestamp(request.arrival_time, ZoneInfo("America/Vancouver"))
                departure_dt = arrival_dt - timedelta(seconds=duration_sec)

                if departure_dt < now:
                    # ❌ Không kịp → fallback dùng bây giờ
                    departure_dt = now
                    arrival_dt = departure_dt + timedelta(seconds=duration_sec)
                    print("❌ Hong kip giờ → tính lại từ bây giờ", departure_dt, arrival_dt)
                else:
                    # ✅ Vẫn kịp → giữ giờ đến
                    print("✅ Tính đi kịp", departure_dt, arrival_dt)
            else:
                # Không có arrival_time → mặc định đi từ bây giờ
                departure_dt = now
                arrival_dt = departure_dt + timedelta(seconds=duration_sec)
                print("⏰ Không có arrival time → đi từ bây giờ", departure_dt, arrival_dt)

            routes.append({
                "mode": mode,
                "summary": route_data["summary"],
                "duration": route_data["duration"],
                "duration_value": duration_sec,
                "departure_time": departure_dt.strftime("%H:%M"),
                "arrival_time": arrival_dt.strftime("%H:%M"),
                "steps": route_data["steps"]
            })
        except HTTPException as e:
            print(f"[WARN] Skipping mode '{mode}' due to: {e.detail}")
            continue

    if not routes:
        raise HTTPException(status_code=404, detail="No available route from any travel mode.")

    return {
        "status": "success",
        "message": "Fastest route determined.",
        "routes": sorted(routes, key=lambda x: x["duration_value"])
    }


@router.post("/polyline/{mode}")
def get_polyline(mode: str, request: RouteRequest):
    route_data = fetch_route(request.origin, request.destination, mode)
    try:
        for step in route_data["steps"]:
            if "polyline" in step:
                return {"status": "success", "polyline": step["polyline"]["points"]}
        raise HTTPException(status_code=500, detail="No polyline found in route steps.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Polyline error: {str(e)}")

@router.post("/my-location")
def get_my_location():
    try:
        response = requests.post(
            f"{GOOGLE_GEOLOCATION_API_URL}?key={GOOGLE_API_KEY}",
            json={"considerIp": True},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch location")
        return response.json()
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="Could not reach Google Geolocation service.")
