import re

def extract_social_profiles(social_links):
    """
    Categorize social links.
    """
    profiles = {
        'instagram': '',
        'facebook': '',
        'linkedin': '',
        'youtube': '',
        'twitter': ''
    }
    
    for link in social_links:
        link_lower = link.lower()
        if 'instagram.com' in link_lower:
            profiles['instagram'] = link
        elif 'facebook.com' in link_lower:
            profiles['facebook'] = link
        elif 'linkedin.com' in link_lower:
            profiles['linkedin'] = link
        elif 'youtube.com' in link_lower:
            profiles['youtube'] = link
        elif 'twitter.com' in link_lower or 'x.com' in link_lower:
            profiles['twitter'] = link
            
    return profiles

def find_founder_online(agency_name, city):
    """
    Uses Google Search or basic heuristics to find founder names.
    Since no paid API, we could use a basic requests search or return empty for now.
    """
    return {
        'founder_name': '',
        'founder_linkedin': ''
    }
