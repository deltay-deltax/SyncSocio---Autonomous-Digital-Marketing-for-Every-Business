import os
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from config import CITIES, KEYWORDS, MAX_WORKERS
from scraper.google_maps import scrape_google_maps
from website.crawler import crawl_website
from social.extractor import extract_social_profiles, find_founder_online
from enrichment.scorer import score_lead
from export.exporter import export_results
from utils.logger import main_logger, error_logger

def process_agency(agency):
    """
    Given a basic agency dictionary from google_maps, enrich it.
    """
    website = agency.get('Website')
    if not website:
        # If we didn't extract a website from Maps but we have raw text, 
        # try to extract a domain if possible (simplified here)
        raw = agency.get('Raw', [])
        for line in raw:
            if '.' in line and ' ' not in line:
                website = line
                agency['Website'] = line
                break
                
    if website:
        # Crawl website
        web_data = crawl_website(website)
        
        # Merge data
        agency['Email'] = ', '.join(web_data['emails']) if web_data['emails'] else ''
        agency['Phone'] = ', '.join(web_data['phones']) if web_data['phones'] else ''
        agency['Services'] = web_data['services_text'][:500] if web_data['services_text'] else ''
        agency['Contact Page Found'] = web_data['contact_page_found']
        
        # Social Profiles
        socials = extract_social_profiles(web_data['socials'])
        agency.update({k.capitalize(): v for k, v in socials.items()})
        
    # Founder search
    founder_data = find_founder_online(agency.get('Agency Name', ''), agency.get('City', ''))
    agency['Founder'] = founder_data.get('founder_name', '')
    agency['Founder LinkedIn'] = founder_data.get('founder_linkedin', '')
    
    # Score
    agency['Score'] = score_lead(agency)
    
    return agency

def scrape_city_keyword(city, keyword):
    try:
        agencies = scrape_google_maps(keyword, city)
        enriched = []
        for a in agencies:
            enriched.append(process_agency(a))
        return enriched
    except Exception as e:
        error_logger.error(f"Failed {city} - {keyword}: {e}")
        return []

def main(cities, keywords):
    main_logger.info("Starting SyncSocio Lead Generation System")
    all_leads = []
    
    tasks = []
    for city in cities:
        for keyword in keywords:
            tasks.append((city, keyword))
            
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(scrape_city_keyword, city, kw): (city, kw) for city, kw in tasks}
        for future in as_completed(futures):
            city, kw = futures[future]
            try:
                results = future.result()
                all_leads.extend(results)
                main_logger.info(f"Completed {city} - {kw}. Found {len(results)} leads.")
            except Exception as e:
                error_logger.error(f"Future error for {city} - {kw}: {e}")

    # Export
    main_logger.info(f"Total leads gathered: {len(all_leads)}. Exporting...")
    export_results(all_leads)
    main_logger.info("Export complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SyncSocio Lead Scraper")
    parser.add_argument("--city", help="Specific city to scrape (comma separated)")
    parser.add_argument("--keyword", help="Specific keyword to scrape (comma separated)")
    args = parser.parse_args()
    
    target_cities = [c.strip() for c in args.city.split(',')] if args.city else CITIES
    target_keywords = [k.strip() for k in args.keyword.split(',')] if args.keyword else KEYWORDS
    
    main(target_cities, target_keywords)
