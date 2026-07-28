import time
from playwright.sync_api import sync_playwright
from utils.logger import main_logger, error_logger
import urllib.parse

def parse_place_page(page, city, keyword):
    try:
        name = page.locator('h1').first.inner_text() if page.locator('h1').count() > 0 else ""
    except:
        name = ""
        
    website = ""
    try:
        web_link = page.locator('a[data-item-id="authority"]').first
        if web_link.count() > 0:
            website = web_link.get_attribute("href")
    except:
        pass
        
    phone = ""
    try:
        phone_btn = page.locator('button[data-item-id^="phone:tel:"]').first
        if phone_btn.count() > 0:
            phone_text = phone_btn.inner_text().split('\n')
            phone = phone_text[-1] if phone_text else ""
    except:
        pass
        
    rating = ""
    reviews = ""
    try:
        rating_elem = page.locator('div.fontDisplayLarge').first
        if rating_elem.count() > 0:
            rating = rating_elem.inner_text()
            review_btn = page.locator('button[aria-label*="reviews"]').first
            if review_btn.count() > 0:
                reviews = review_btn.inner_text().replace(' reviews', '').replace(' review', '').strip()
    except:
        pass
        
    address = ""
    try:
        addr_btn = page.locator('button[data-item-id="address"]').first
        if addr_btn.count() > 0:
            addr_text = addr_btn.inner_text().split('\n')
            address = addr_text[-1] if addr_text else ""
    except:
        pass

    return {
        "Agency Name": name,
        "City": city,
        "Keyword": keyword,
        "Website": website,
        "Phone": phone,
        "Rating": rating,
        "Reviews": reviews,
        "Address": address
    }

def scrape_google_maps(keyword, city, max_results=20):
    query = f"{keyword} in {city}"
    main_logger.info(f"Starting Google Maps scrape for: {query}")
    results = []
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
                locale="en-US"
            )
            page = context.new_page()
            
            search_url = f"https://www.google.com/maps/search/{urllib.parse.quote(query)}"
            page.goto(search_url, timeout=60000)
            
            try:
                consent_button = page.locator('form[action*="consent"] button').last
                if consent_button.is_visible(timeout=3000):
                    consent_button.click()
            except:
                pass
            
            # Wait for results to load
            try:
                page.wait_for_selector('a[href*="/maps/place/"]', timeout=15000)
            except Exception as e:
                if "/maps/place/" in page.url:
                    results.append(parse_place_page(page, city, keyword))
                    browser.close()
                    return results
                raise e
            
            # Scroll to load more results
            feed_container = page.locator('div[role="feed"]')
            place_hrefs = set()
            retries = 0
            
            while len(place_hrefs) < max_results and retries < 5:
                links = page.locator('a[href*="/maps/place/"]').all()
                new_found = 0
                for link in links:
                    href = link.get_attribute("href")
                    if href and href not in place_hrefs:
                        place_hrefs.add(href)
                        new_found += 1
                
                if new_found > 0:
                    retries = 0
                else:
                    retries += 1
                    time.sleep(1)
                
                # Scroll down
                try:
                    feed_container.evaluate("element => element.scrollTop = element.scrollHeight")
                except:
                    pass
                time.sleep(2)
            
            # Now visit each extracted href to get full details
            place_hrefs = list(place_hrefs)[:max_results]
            for href in place_hrefs:
                try:
                    page.goto(href, timeout=30000)
                    page.wait_for_selector('h1', timeout=10000)
                    results.append(parse_place_page(page, city, keyword))
                except Exception as ex:
                    error_logger.warning(f"Failed to scrape place {href}: {ex}")
                    continue
                
            browser.close()
            main_logger.info(f"Finished Google Maps scrape for: {query}. Found {len(results)} items.")
            
    except Exception as e:
        error_logger.error(f"Error scraping Google Maps for {query}: {str(e)}")
        
    return results
