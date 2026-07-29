import requests
from bs4 import BeautifulSoup
import re
import urllib.parse
from config import PATHS_TO_VISIT, REQUEST_TIMEOUT, USER_AGENTS
import random
from utils.logger import error_logger

def crawl_website(base_url):
    """
    Crawls a website's key pages to extract emails, phones, social links, and text.
    """
    if not base_url.startswith('http'):
        base_url = 'https://' + base_url

    data = {
        'emails': set(),
        'phones': set(),
        'socials': set(),
        'about_text': '',
        'services_text': '',
        'founders': set(),
        'contact_page_found': False
    }

    headers = {
        'User-Agent': random.choice(USER_AGENTS)
    }

    try:
        # Check if domain is reachable
        res = requests.get(base_url, headers=headers, timeout=REQUEST_TIMEOUT, verify=False)
        if res.status_code != 200:
            return data
    except Exception as e:
        error_logger.warning(f"Could not reach {base_url}: {e}")
        return data

    for path in PATHS_TO_VISIT:
        url = urllib.parse.urljoin(base_url, path)
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT, verify=False)
            if response.status_code == 200:
                if 'contact' in path.lower():
                    data['contact_page_found'] = True
                    
                html = response.text
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract emails
                emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', html)
                data['emails'].update([e for e in emails if not e.endswith(('.png', '.jpg', '.jpeg', '.gif'))])
                
                # Extract phones (basic regex for Indian numbers or generic)
                phones = re.findall(r'(\+91[\-\s]?\d{10}|\d{10}|\d{3}[\-\s]\d{3}[\-\s]\d{4})', soup.get_text())
                data['phones'].update(phones)
                
                # Extract social links
                for a in soup.find_all('a', href=True):
                    href = a['href'].lower()
                    if any(domain in href for domain in ['instagram.com', 'linkedin.com', 'facebook.com', 'twitter.com', 'youtube.com']):
                        data['socials'].add(a['href'])
                        
                # Extract text for about / services
                if 'about' in path.lower():
                    data['about_text'] += soup.get_text(separator=' ', strip=True)[:1000]
                if 'service' in path.lower() or path == '/':
                    data['services_text'] += soup.get_text(separator=' ', strip=True)[:1000]
                    
        except Exception as e:
            pass
            
    return data
