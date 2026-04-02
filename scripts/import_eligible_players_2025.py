import nflreadpy as nfl

df = nfl.load_snap_counts(seasons=[2025])
print(df.columns)
print(df.head())
raise SystemExit
