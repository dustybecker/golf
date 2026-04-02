import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ["THESPORTSDB_API_KEY"]

url = "https://www.thesportsdb.com/api/v2/json/all/leagues"
headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

r = requests.get(url, headers=headers, timeout=60)
r.raise_for_status()
data = r.json()

leagues = data.get("leagues") or []
print(f"Total leagues: {len(leagues)}\n")

matches = []
for l in leagues:
    name = (l.get("strLeague") or "").strip()
    sport = (l.get("strSport") or "").strip()
    if "football" in name.lower() or "nfl" in name.lower() or "american football" in sport.lower():
        matches.append(l)

# print likely candidates
for l in matches[:50]:
    print({
        "idLeague": l.get("idLeague"),
        "strLeague": l.get("strLeague"),
        "strSport": l.get("strSport"),
        "strLeagueAlternate": l.get("strLeagueAlternate"),
    })
