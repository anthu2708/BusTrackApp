from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
from dotenv import load_dotenv

router = APIRouter()

# ========================
# === Models ============
# ========================
class RouteRequest(BaseModel):
    origin: str
    destination: str

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
def fetch_route(origin: str, destination: str, mode: str):
    try:
        response = requests.get(
            GOOGLE_MAPS_API_URL,
            params={
                "origin": origin,
                "destination": destination,
                "mode": mode,
                "key": GOOGLE_API_KEY,
            },
            timeout=10
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Google Maps API error: {response.text}"
            )

        data = response.json()
        if not data.get("routes"):
            print (response.text)
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
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail="Could not reach Google Maps service.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# ========================
# === API Endpoints =====
# ========================

@router.post("/transit-route")
def get_transit_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "transit")

@router.post("/car-route")
def get_car_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "driving")

@router.post("/walk-route")
def get_walk_route(request: RouteRequest):
    return fetch_route(request.origin, request.destination, "walking")

@router.post("/fastest-route")
def get_fastest_route(request: RouteRequest):
    modes = ["driving", "walking", "transit"]
    routes = []

    for mode in modes:
        try:
            route_data = fetch_route(request.origin, request.destination, mode)
            routes.append({
                "mode": mode,
                "summary": route_data["summary"],
                "duration": route_data["duration"],
                "duration_value": route_data["duration_value"],
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
