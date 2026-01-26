#!/usr/bin/env python3
"""
Send Push Notification Test - Python Script
Usage: python send_push.py YOUR_TOKEN "Title" "Message"
"""

import requests
import sys
import json

def send_expo_push(token, title, body):
    """Send push notification via Expo"""
    
    url = "https://exp.host/--/api/v2/push/send"
    
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "channelId": "default"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print(f"📤 Sending notification to: {token[:30]}...")
    print(f"📝 Title: {title}")
    print(f"💬 Body: {body}")
    print()
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("data", {}).get("status") == "ok":
            print("✅ Notification sent successfully!")
            print(f"📊 Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print("❌ Failed to send notification")
            print(f"📊 Response: {json.dumps(result, indent=2)}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python send_push.py YOUR_TOKEN")
        print("  python send_push.py YOUR_TOKEN \"Custom Title\" \"Custom Message\"")
        print()
        print("Example:")
        print('  python send_push.py ExponentPushToken[xxx] "Test" "Hello World"')
        sys.exit(1)
    
    token = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else "🧪 Test Notification"
    body = sys.argv[3] if len(sys.argv) > 3 else "This is a test message from Python script!"
    
    send_expo_push(token, title, body)

if __name__ == "__main__":
    main()
