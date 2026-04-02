import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ["THESPORTSDB_API_KEY"]

url = "https://www.thesportsdb.com/api/v2/json/list/teams/4391"
headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

r = requests.get(url, headers=headers, timeout=60)
print("Status:", r.status_code)
print("Content-Type:", r.headers.get("Content-Type"))
print("First 300 chars:", r.text[:300].replace("\n", " "))
