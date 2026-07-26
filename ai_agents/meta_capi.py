import os
import time
import hashlib
import requests

def hash_data(data: str) -> str:
    """Hash data using SHA-256 (required by Meta for PII)."""
    if not data:
        return None
    return hashlib.sha256(data.lower().strip().encode('utf-8')).hexdigest()

def send_meta_capi_event(
    event_name: str,
    event_id: str,
    user_data: dict = None,
    custom_data: dict = None
) -> bool:
    """
    Send an event to the Meta Conversions API.
    
    :param event_name: Name of the event (e.g. 'URLDropped')
    :param event_id: Unique event ID matching the browser pixel event
    :param user_data: User info dictionary containing email, phone, client_ip, client_user_agent
    :param custom_data: Event specific data
    """
    pixel_id = os.getenv("META_PIXEL_ID")
    access_token = os.getenv("META_CAPI_ACCESS_TOKEN")
    
    if not pixel_id or not access_token:
        print(f"[Meta CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN env vars. Cannot send {event_name}.")
        return False
        
    user_data = user_data or {}
    custom_data = custom_data or {}
    
    hashed_email = hash_data(user_data.get("email"))
    hashed_phone = hash_data(user_data.get("phone"))
    
    payload_user_data = {
        "client_ip_address": user_data.get("client_ip"),
        "client_user_agent": user_data.get("client_user_agent"),
    }
    
    if hashed_email:
        payload_user_data["em"] = [hashed_email]
    if hashed_phone:
        payload_user_data["ph"] = [hashed_phone]
        
    payload = {
        "data": [
            {
                "event_name": event_name,
                "event_time": int(time.time()),
                "action_source": "website",
                "event_id": event_id,
                "user_data": payload_user_data,
                "custom_data": custom_data,
            }
        ]
    }
    
    url = f"https://graph.facebook.com/v19.0/{pixel_id}/events?access_token={access_token}"
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        print(f"[Meta CAPI] Successfully sent {event_name} event (ID: {event_id}):", response.json())
        return True
    except requests.exceptions.RequestException as e:
        error_details = e.response.json() if e.response else str(e)
        print(f"[Meta CAPI] Error sending {event_name} event:", error_details)
        return False
