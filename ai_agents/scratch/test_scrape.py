import requests
import json

def test():
    url = "http://localhost:8000/scrape-brand-profile"
    payload = {
        "url": "https://minimalist.co"
    }
    print("Testing website scan API on http://localhost:8000...")
    try:
        res = requests.post(url, json=payload)
        print("Status Code:", res.status_code)
        if res.status_code == 200:
            print("Response:", json.dumps(res.json(), indent=2))
        else:
            print("Error Details:", res.text)
    except Exception as e:
        print("Failed to run test request:", e)



if __name__ == "__main__":
    test()
