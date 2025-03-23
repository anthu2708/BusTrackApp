from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import re
from datetime import datetime
from database import get_db
from models.schedule import Schedule

router = APIRouter()

# Building code mappings
LOC_ABB = {
  "ALRD": "1822 East Mall",
  "ANSO": "6303 North West Marine Drive",
  "AERL": "2202 Main Mall",
  "ACEN": "1871 West Mall",
  "AUDX": "1924 West Mall",
  "BINN": "6373 University Boulevard",
  "BIOL": "6270 University Boulevard",
  "BUCH": "1866 Main Mall",
  "BUTO": "1873 East Mall",
  "CCM": "4145 Wesbrook Mall",
  "CIRS": "2260 West Mall",
  "CHAN": "6265 Crescent Road",
  "GUNN": "2553 Wesbrook Mall",
  "CHBE": "2360 East Mall V6T 1Z3",
  "CHEM": "2036 Main Mall",
  "CEME": "6250 Applied Science Lane",
  "MINL": "2332 West Mall",
  "COPP": "2146 Health Sciences Mall",
  "DLAM": "2033 Main Mall V6T 1Z2",
  "DSOM": "6361 University Blvd",
  "KENN": "2136 West Mall",
  "EOS": "6339 Stores Road",
  "ESB": "2207 Main Mall",
  "ESC": "2335 Engineering Road",
  "FNH": "2205 East Mall",
  "FSC": "2424 Main Mall",
  "FORW": "6350 Stores Road",
  "LASR": "6333 Memorial Road",
  "FRWO": "6354 Crescent Road",
  "FRDM": "2177 Wesbrook Mall V6T 1Z3",
  "GEOG": "1984 West Mall",
  "CUNN": "2146 East Mall",
  "HEBB": "2045 East Mall",
  "HENN": "6224 Agricultural Road",
  "ANGU": "2053 Main Mall",
  "DMP": "6245 Agronomy Road V6T 1Z4",
  "IRSC": "1985 Learners' Walk",
  "ICCS": "2366 Main Mall",
  "IBLC": "1961 East Mall V6T 1Z1",
  "MCDN": "2199 West Mall",
  "SOWK": "2080 West Mall",
  "LAX": "2371 Main Mall",
  "LSK": "6356 Agricultural Road",
  "PARC": "6049 Nurseries Road",
  "LSC": "2350 Health Sciences Mall",
  "MCLD": "2356 Main Mall",
  "MCML": "2357 Main Mall",
  "MATH": "1984 Mathematics Road",
  "MATX": "1986 Mathematics Road",
  "MEDC": "2176 Health Sciences Mall",
  "MSL": "2185 East Mall",
  "MUSC": "6361 Memorial Road",
  "SCRF": "2125 Main Mall",
  "AUDI": "6344 Memorial Road",
  "IRC": "2194 Health Sciences Mall",
  "PHRM": "2405 Wesbrook Mall",
  "PONE": "2034 Lower Mall",
  "PONF": "2008 Lower Mall",
  "OSB2": "6108 Thunderbird Boulevard",
  "SRC": "6000 Student Union Blvd",
  "BRIM": "2355 East Mall",
  "UCEN": "6331 Crescent Road V6T 1Z1",
  "TFPB": "6358 University Blvd, V6T 1Z4",
  "YURT": "3465 Ross Drive",
  "KPAV": "2211 Wesbrook Mall",
  "MGYM": "6081 University Blvd",
  "EDC": "2345 East Mall",
  "WESB": "6174 University Boulevard",
  "WMAX": "1933 West Mall",
  "SWNG": "2175 West Mall V6T 1Z4"
}

@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an Excel file and parse schedule data into the database."""
    if not file.filename.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Invalid file format")

    df = pd.read_excel(file.file, skiprows=2, engine="openpyxl")  # Skip first 2 rows

    for _, row in df.iterrows():
        class_name = str(row.get("Section", "Unknown Class")).strip()
        start_date = str(row.get("Start Date", "")).strip()
        end_date = str(row.get("End Date", "")).strip()
        meeting_patterns_text = str(row.get("Meeting Patterns", "")).strip()

        pattern_chunks = [chunk for chunk in meeting_patterns_text.split("\n") if chunk.strip()]
        for chunk in pattern_chunks:
            parsed_data = parse_meeting_pattern(chunk, start_date, end_date)
            if parsed_data:
                new_schedule = Schedule(class_name=class_name, **parsed_data)
                db.add(new_schedule)

    db.commit()
    return {"message": "Schedule uploaded successfully"}

def parse_meeting_pattern(chunk, start_date, end_date):
    """ Parses meeting pattern data into structured format. """
    parts = chunk.split('|')
    if len(parts) < 4:
        return None  # Skip invalid rows

    days_str, class_time, location = parts[1].strip(), parts[2].strip(), parts[3].strip()
    loc_match = re.match(r"([^-]+)-Floor (\d+)-Room (\S+)", location.strip())

    loc, room = (loc_match.group(1), loc_match.group(3)) if loc_match else (location, "Unknown")
    print(loc)
    location_noti = f"Room {room} - {loc}"
    days_list = ",".join([d.strip() for d in days_str.split()])  # Store as "Mon,Wed,Fri"

    try:
        start_time_str, end_time_str = [re.sub(r'\.', '', t.strip()).upper() for t in class_time.split('-')]
        start_time_obj, end_time_obj = datetime.strptime(start_time_str, "%I:%M %p"), datetime.strptime(end_time_str, "%I:%M %p")
    except ValueError:
        return None  # Skip invalid time formats

    return {
        "start_date": start_date, "end_date": end_date, "days": days_list,
        "start_time": start_time_obj.strftime("%H:%M"), "end_time": end_time_obj.strftime("%H:%M"),
        "location": location_noti, "address": LOC_ABB.get(loc, "Unknown Address"), "room": room
    }

@router.get("/")
def get_schedules(db: Session = Depends(get_db)):
    """Returns all schedules from the database."""
    schedules = db.query(Schedule).all()
    return schedules

@router.get("/{schedule_id}")
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Returns a specific schedule by ID."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule:
        return schedule
    raise HTTPException(status_code=404, detail="Schedule not found")

@router.delete("/clear-all")
def clear_schedules(db: Session = Depends(get_db)):
    """Deletes all schedules from the database."""
    db.query(Schedule).delete()
    db.commit()
    return {"message": "All schedules cleared"}

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Deletes a schedule by ID."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if schedule:
        db.delete(schedule)
        db.commit()
        return {"message": "Schedule deleted"}
    raise HTTPException(status_code=404, detail="Schedule not found")


