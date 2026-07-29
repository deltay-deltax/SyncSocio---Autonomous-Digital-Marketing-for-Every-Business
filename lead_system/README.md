# SyncSocio Lead Generation System

A production-ready Python application designed to discover and enrich digital marketing agencies in India, outputting structured data ready for CRM import.

## Features
- **Google Maps Scraping**: Extracts agency profiles using Playwright.
- **Website Crawling**: Visits agency websites (home, about, contact, team) to extract emails, phones, and text.
- **Social Extraction**: Finds social links (LinkedIn, Instagram, FB, YouTube) and founder info.
- **Lead Scoring**: Assigns a score (out of 100) based on data completeness and quality.
- **Deduplication**: Removes duplicates by website, phone, or email.
- **Export**: Outputs to `.xlsx`, `.csv`, `.json`, and a `summary.txt`.

## Prerequisites
- Python 3.12
- Playwright browsers installed

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Playwright browsers:
```bash
playwright install chromium
```

## Configuration

Settings can be modified in `config.py`.
By default, the system will search for a predefined list of keywords across a list of cities in India.

## Usage

To run the full scraper pipeline:
```bash
python main.py
```

Outputs will be saved in the `output/` directory.
Logs will be saved in the `logs/` directory.
