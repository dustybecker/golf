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

BASE_V1 = f"https://www.thesportsdb.com/api/v1/json/{TSDB_KEY}"

ALLOWED_POS = {"QB", "RB", "WR", "TE"}

def get_json(url: str, params: dict | None = None) -> dict:
    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
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
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1) Teams: by league name
    teams_payload = get_json(f"{BASE_V1}/search_all_teams.php", params={"l": "National Football League"})
    teams = teams_payload.get("teams") or []
    if not teams:
        # Sometimes TSDB expects underscores; try fallback
        teams_payload = get_json(f"{BASE_V1}/search_all_teams.php", params={"l": "National_Football_League"})
        teams = teams_payload.get("teams") or []

    if not teams:
        raise RuntimeError("No teams returned from search_all_teams. Check API key / league name.")

    print(f"Fetched teams: {len(teams)}")

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
            "team_abbr": t.get("strTeamShort") or t.get("strTeamAbbr"),
            "conference": conf,
            "division": division,
        })

    supabase.table("pool_teams").upsert(team_rows).execute()
    print(f"Upserted pool_teams: {len(team_rows)}")

    team_meta = {r["team_id"]: r for r in team_rows}

    # 2) Players: by team id
    player_rows = []
    for idx, team in enumerate(team_rows, start=1):
        team_id = team["team_id"]

        players_payload = get_json(f"{BASE_V1}/lookup_all_players.php", params={"id": team_id})
        players = players_payload.get("player") or []

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

        # light pacing
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
