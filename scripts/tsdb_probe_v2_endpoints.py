import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ["THESPORTSDB_API_KEY"]
league_id = os.environ.get("TSDB_LEAGUE_ID", "4391")

BASE = "https://www.thesportsdb.com/api/v2/json"
HEADERS = {"X-API-KEY": api_key, "Content-Type": "application/json"}

CANDIDATES = [
    ("Teams A", f"{BASE}/lookup/teams?id={league_id}"),
    ("Teams B", f"{BASE}/lookup_all_teams?id={league_id}"),
    ("Teams C", f"{BASE}/all/teams?id={league_id}"),
    ("Teams D", f"{BASE}/teams/league/{league_id}"),
]

def try_url(label, url):
    r = requests.get(url, headers=HEADERS, timeout=60)
    ct = r.headers.get("Content-Type", "")
    print(label, r.status_code, url)
    print("  content-type:", ct)
    print("  first 200 chars:", r.text[:200].replace("\n", " "))

    if r.status_code == 200 and "application/json" in ct.lower():
        j = r.json()
        print("  keys:", list(j.keys()))
        print("  snippet:", str(j)[:200].replace("\n", " "))


for label, url in CANDIDATES:
    try_url(label, url)
