print("STARTING import_pool_players_tsdb_v2_list.py")

import os
import time
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
POOL_ID = os.environ.get("POOL_ID", "2026-playoffs")

TSDB_KEY = os.environ["THESPORTSDB_API_KEY"]
BASE = "https://www.thesportsdb.com/api/v2/json"
HEADERS = {
    "X-API-KEY": TSDB_KEY,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
}

NFL_LEAGUE_ID = "4391"
ALLOWED_POS = {"QB", "RB", "WR", "TE"}

def get_json(url: str) -> dict:
    r = requests.get(url, headers=HEADERS, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("Rate limited (429). Retry after a short delay.")
    r.raise_for_status()
    if not r.text.strip():
        raise RuntimeError(f"Empty response body from {url}")
    return r.json()

def normalize_pos(raw: str | None) -> str | None:
    if not raw:
        return None
    v = raw.strip().upper()
    if v in {"QB", "QUARTERBACK"}: return "QB"
    if v in {"RB", "RUNNING BACK", "RUNNINGBACK"}: return "RB"
    if v in {"WR", "WIDE RECEIVER", "WIDERECEIVER"}: return "WR"
    if v in {"TE", "TIGHT END", "TIGHTEND"}: return "TE"
    return None

def infer_conference(division: str | None) -> str | None:
    if not division:
        return None
    d = division.strip().upper()
    if d.startswith("AFC"): return "AFC"
    if d.startswith("NFC"): return "NFC"
    return None

def main():
    print("Entered main()")
    print("POOL_ID =", POOL_ID)
    print("BASE =", BASE)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Supabase client created")

    # --- Teams ---
    teams_url = f"{BASE}/list/teams/{NFL_LEAGUE_ID}"
    print("Requesting teams:", teams_url)
    teams_payload = get_json(teams_url)
    print("Received keys:", list(teams_payload.keys()))

    teams = teams_payload.get("list") or []
    print("Teams count:", len(teams))
    if not teams:
        raise RuntimeError(f"No teams returned. Payload keys: {list(teams_payload.keys())}")

    team_rows = []
    for t in teams:
        team_id = t.get("idTeam")
        team_name = t.get("strTeam")
        if not team_id or not team_name:
            continue

        division = t.get("strDivision")
        conf = infer_conference(division)

        team_rows.append({
            "pool_id": POOL_ID,
            "team_id": str(team_id),
            "team_name": team_name,
            "team_abbr": t.get("strTeamShort"),
            "conference": conf,
            "division": division,
        })

    supabase.table("pool_teams").upsert(team_rows).execute()
    print(f"Upserted pool_teams: {len(team_rows)}")

    team_meta = {r["team_id"]: r for r in team_rows}

    # --- Players ---
    player_rows = []
    for idx, team in enumerate(team_rows, start=1):
        team_id = team["team_id"]
        players_url = f"{BASE}/list/players/{team_id}"
        payload = get_json(players_url)

        players = payload.get("list") or []
        for p in players:
            pid = p.get("idPlayer")
            pname = p.get("strPlayer")
            pos = normalize_pos(p.get("strPosition"))

            if not pid or not pname or pos not in ALLOWED_POS:
                continue

            meta = team_meta.get(team_id, {})
            player_rows.append({
                "pool_id": POOL_ID,
                "player_id": str(pid),
                "player_name": pname,
                "pos": pos,
                "team_id": team_id,
                "team_abbr": meta.get("team_abbr"),
                "conference": meta.get("conference"),
            })

        if idx % 6 == 0:
            time.sleep(0.6)

        print(f"[{idx}/{len(team_rows)}] team {team_id}: players so far {len(player_rows)}")

    print(f"Prepared pool_players rows: {len(player_rows)}")

    BATCH = 500
    for i in range(0, len(player_rows), BATCH):
        supabase.table("pool_players").upsert(player_rows[i:i+BATCH]).execute()
        print(f"Upserted pool_players {min(i+BATCH, len(player_rows))}/{len(player_rows)}")

    print("Done.")

if __name__ == "__main__":
    main()
