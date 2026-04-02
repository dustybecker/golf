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
BASE_V2 = "https://www.thesportsdb.com/api/v2/json"
HEADERS = {"X-API-KEY": TSDB_KEY, "Content-Type": "application/json"}

ALLOWED_POS = {"QB", "RB", "WR", "TE"}

def get_json(path: str, params: dict | None = None) -> dict:
    url = f"{BASE_V2}/{path}"
    r = requests.get(url, headers=HEADERS, params=params, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("Rate limited (429). Slow down or retry later.")
    r.raise_for_status()
    return r.json()

def normalize_pos(raw: str | None) -> str | None:
    if not raw:
        return None
    v = raw.strip().upper()
    # Common variants
    if v in {"QB", "QUARTERBACK"}:
        return "QB"
    if v in {"RB", "RUNNING BACK", "RUNNINGBACK"}:
        return "RB"
    if v in {"WR", "WIDE RECEIVER", "WIDERECEIVER"}:
        return "WR"
    if v in {"TE", "TIGHT END", "TIGHTEND"}:
        return "TE"
    return None

def parse_conference_and_division(team_obj: dict) -> tuple[str | None, str | None]:
    # TSDB commonly uses division strings like "AFC East" / "NFC North"
    division = team_obj.get("strDivision") or team_obj.get("division")
    conf = None
    if isinstance(division, str):
        d = division.strip()
        if d.upper().startswith("AFC"):
            conf = "AFC"
        elif d.upper().startswith("NFC"):
            conf = "NFC"
    return conf, division if isinstance(division, str) else None

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # --- Step 1: find the NFL league id ---
    # v2 has "all/leagues" like your doc snippet
    leagues = get_json("all/leagues").get("leagues") or []
    nfl = next((l for l in leagues if (l.get("strLeague") == "NFL" or l.get("strLeague") == "National Football League")), None)
    if not nfl:
        # Fallback: try fuzzy
        nfl = next((l for l in leagues if "football league" in (l.get("strLeague","").lower())), None)
    if not nfl:
        raise RuntimeError("Could not find NFL league in /all/leagues response.")

    league_id = nfl.get("idLeague")
    if not league_id:
        raise RuntimeError("NFL league found but missing idLeague.")

    print(f"Found NFL league_id: {league_id}")

    # --- Step 2: list teams in that league ---
    # v2 typically uses: /lookup/teams?id=LEAGUE_ID (naming varies by provider)
    # We'll try a couple common TSDB patterns.
    teams_payload = None
    for path, params in [
        ("lookup/teams", {"id": league_id}),
        ("lookup_all_teams", {"id": league_id}),
        ("all/teams", {"id": league_id}),
    ]:
        try:
            teams_payload = get_json(path, params=params)
            if (teams_payload.get("teams") or teams_payload.get("Teams")):
                break
        except requests.HTTPError:
            continue

    teams = (teams_payload or {}).get("teams") or (teams_payload or {}).get("Teams") or []
    if not teams:
        raise RuntimeError("Could not load teams for NFL league. Endpoint naming may differ on your plan.")

    print(f"Fetched teams: {len(teams)}")

    team_rows = []
    for t in teams:
        team_id = t.get("idTeam")
        team_name = t.get("strTeam")
        if not team_id or not team_name:
            continue

        team_abbr = t.get("strTeamShort") or t.get("strTeamAbbr")
        conf, division = parse_conference_and_division(t)

        team_rows.append({
            "pool_id": POOL_ID,
            "team_id": str(team_id),
            "team_name": team_name,
            "team_abbr": team_abbr,
            "conference": conf,
            "division": division,
        })

    supabase.table("pool_teams").upsert(team_rows).execute()
    print(f"Upserted pool_teams: {len(team_rows)}")

    team_meta = {r["team_id"]: r for r in team_rows}

    # --- Step 3: for each team, list players ---
    player_rows = []
    for idx, team in enumerate(team_rows, start=1):
        team_id = team["team_id"]

        players_payload = None
        for path, params in [
            ("lookup/players", {"id": team_id}),
            ("lookup_all_players", {"id": team_id}),
            ("all/players", {"id": team_id}),
        ]:
            try:
                players_payload = get_json(path, params=params)
                if (players_payload.get("player") or players_payload.get("players")):
                    break
            except requests.HTTPError:
                continue

        players = (players_payload or {}).get("player") or (players_payload or {}).get("players") or []
        for p in players:
            pid = p.get("idPlayer")
            pname = p.get("strPlayer") or p.get("strName")
            raw_pos = p.get("strPosition") or p.get("strPos") or p.get("position")

            pos = normalize_pos(raw_pos)
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

        # gentle pacing
        if idx % 5 == 0:
            time.sleep(0.8)

        print(f"[{idx}/{len(team_rows)}] team {team_id}: players so far {len(player_rows)}")

    print(f"Prepared pool_players rows: {len(player_rows)}")

    BATCH = 500
    for i in range(0, len(player_rows), BATCH):
        supabase.table("pool_players").upsert(player_rows[i:i+BATCH]).execute()
        print(f"Upserted pool_players {i + min(BATCH, len(player_rows) - i)}/{len(player_rows)}")

    print("Done.")

if __name__ == "__main__":
    main()
