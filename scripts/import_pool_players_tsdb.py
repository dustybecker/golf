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

# --- position mapping (TheSportsDB uses human-readable positions) ---
POS_MAP = {
    "Quarterback": "QB",
    "Running Back": "RB",
    "Wide Receiver": "WR",
    "Tight End": "TE",
    # Common alternates / abbreviations some datasets use:
    "QB": "QB",
    "RB": "RB",
    "WR": "WR",
    "TE": "TE",
}

ALLOWED = {"QB", "RB", "WR", "TE"}

def get_json(url: str, params: dict | None = None) -> dict:
    r = requests.get(url, params=params, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("Rate limited (429). Slow down or retry later.")
    r.raise_for_status()
    return r.json()

def parse_conference(team_obj: dict) -> tuple[str | None, str | None]:
    # Many TSDB team records have strDivision like "AFC East" / "NFC North"
    division = team_obj.get("strDivision")
    conf = None
    if isinstance(division, str):
        d = division.strip()
        if d.startswith("AFC"):
            conf = "AFC"
        elif d.startswith("NFC"):
            conf = "NFC"
    return conf, division

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1) List all NFL teams by league name
    # Docs: search_all_teams.php?l=... :contentReference[oaicite:5]{index=5}
    teams_payload = get_json(f"{BASE_V1}/search_all_teams.php", params={"l": "National_Football_League"})
    teams = teams_payload.get("teams") or []
    if not teams:
        raise RuntimeError("No teams returned. Check league name or API key permissions.")

    print(f"Fetched teams: {len(teams)}")

    # Upsert teams
    team_rows = []
    for t in teams:
        team_id = t.get("idTeam")
        team_name = t.get("strTeam")
        if not team_id or not team_name:
            continue

        team_abbr = t.get("strTeamShort")
        conf, division = parse_conference(t)

        team_rows.append({
            "pool_id": POOL_ID,
            "team_id": str(team_id),
            "team_name": team_name,
            "team_abbr": team_abbr,
            "conference": conf,
            "division": division,
        })

    if team_rows:
        supabase.table("pool_teams").upsert(team_rows).execute()
        print(f"Upserted pool_teams: {len(team_rows)}")

    # Build lookup map for team metadata
    team_meta = {str(t["team_id"]): t for t in team_rows}

    # 2) For each team, list players by team id
    # Docs: lookup_all_players.php?id=... :contentReference[oaicite:6]{index=6}
    player_rows = []
    for idx, team in enumerate(team_rows, start=1):
        team_id = team["team_id"]
        payload = get_json(f"{BASE_V1}/lookup_all_players.php", params={"id": team_id})
        players = payload.get("player") or []

        for p in players:
            pid = p.get("idPlayer")
            pname = p.get("strPlayer")
            raw_pos = p.get("strPosition")

            if not pid or not pname or not raw_pos:
                continue

            pos = POS_MAP.get(raw_pos.strip(), None)
            if pos not in ALLOWED:
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

        # gentle pacing to avoid 429s (rate limits apply) :contentReference[oaicite:7]{index=7}
        if idx % 5 == 0:
            time.sleep(1.0)

        print(f"[{idx}/{len(team_rows)}] team {team_id}: players so far {len(player_rows)}")

    # Upsert players in batches
    print(f"Prepared pool_players rows: {len(player_rows)}")
    BATCH = 500
    for i in range(0, len(player_rows), BATCH):
        batch = player_rows[i:i + BATCH]
        supabase.table("pool_players").upsert(batch).execute()
        print(f"Upserted pool_players {i + len(batch)}/{len(player_rows)}")

    print("Done.")

if __name__ == "__main__":
    main()
