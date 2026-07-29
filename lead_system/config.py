import os

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# Scraping Configuration
MAX_WORKERS = 5
REQUEST_TIMEOUT = 15
RETRIES = 3

KEYWORDS = [
    "Social Media Agency",
    "Digital Marketing Agency",
    "Creative Agency",
    "Branding Agency",
    "Content Marketing Agency",
    "Instagram Marketing Agency",
    "Performance Marketing Agency",
    "Meta Ads Agency",
    "Shopify Agency"
]

CITIES = [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Jaipur", "Jodhpur", "Udaipur",
    "Indore", "Bhopal", "Nagpur", "Nashik", "Pune", "Kolhapur", "Mysore",
    "Bangalore", "Hubli", "Mangalore", "Kochi", "Trivandrum", "Coimbatore",
    "Madurai", "Lucknow", "Kanpur", "Varanasi", "Patna", "Bhubaneswar",
    "Raipur", "Chandigarh", "Ludhiana", "Guwahati"
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
]

SCORING_WEIGHTS = {
    "website": 10,
    "email": 20,
    "instagram": 10,
    "linkedin": 10,
    "phone": 10,
    "rating_gt_4_5": 10,
    "reviews_gt_30": 10,
    "contact_page": 5,
    "founder": 15,
    "active_socials": 10  # Arbitrary check for having at least 2 social links
}

PATHS_TO_VISIT = [
    '/',
    '/about',
    '/about-us',
    '/contact',
    '/contact-us',
    '/team',
    '/our-team'
]
