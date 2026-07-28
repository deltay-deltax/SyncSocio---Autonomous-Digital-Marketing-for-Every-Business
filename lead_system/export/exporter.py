import pandas as pd
import json
import os
from config import OUTPUT_DIR

def deduplicate_leads(leads):
    """
    Remove duplicates based on Website, Phone, Email, or Agency Name.
    """
    df = pd.DataFrame(leads)
    
    if df.empty:
        return df

    # We will deduplicate based on Agency Name or Website primarily.
    # Replace empty strings with NaN for better subset deduplication
    df = df.replace(r'^\s*$', float('nan'), regex=True)
    
    # Deduplicate by Website
    if 'Website' in df.columns:
        df = df.drop_duplicates(subset=['Website'], keep='first')
        
    # Deduplicate by Agency Name
    if 'Agency Name' in df.columns:
        df = df.drop_duplicates(subset=['Agency Name'], keep='first')
        
    # Deduplicate by Email (ignoring NaNs)
    if 'Email' in df.columns:
        df = df.dropna(subset=['Email']).drop_duplicates(subset=['Email'], keep='first').combine_first(df)

    return df

def export_results(leads):
    df = deduplicate_leads(leads)
    if df.empty:
        return

    # Select columns as requested
    columns = [
        'Agency Name', 'Score', 'Website', 'Email', 'Phone',
        'Instagram', 'Facebook', 'LinkedIn', 'Founder',
        'Founder LinkedIn', 'Employees', 'Services', 'City',
        'State', 'Rating', 'Reviews', 'Address', 'Notes'
    ]
    
    # Ensure all columns exist in the DataFrame
    for col in columns:
        if col not in df.columns:
            df[col] = ''
            
    df = df[columns]

    # Export to Excel
    excel_path = os.path.join(OUTPUT_DIR, 'agencies.xlsx')
    df.to_excel(excel_path, index=False)
    
    # Export to CSV
    csv_path = os.path.join(OUTPUT_DIR, 'agencies.csv')
    df.to_csv(csv_path, index=False)
    
    # Export to JSON
    json_path = os.path.join(OUTPUT_DIR, 'agencies.json')
    df.to_json(json_path, orient='records', indent=4)
    
    # Export summary.txt
    summary_path = os.path.join(OUTPUT_DIR, 'summary.txt')
    total_agencies = len(leads)
    unique_agencies = len(df)
    cities_covered = df['City'].nunique() if 'City' in df.columns else 0
    emails_found = df['Email'].notna().sum() if 'Email' in df.columns else 0
    phones_found = df['Phone'].notna().sum() if 'Phone' in df.columns else 0
    instagram_found = df['Instagram'].notna().sum() if 'Instagram' in df.columns else 0
    avg_score = df['Score'].mean() if 'Score' in df.columns else 0

    with open(summary_path, 'w') as f:
        f.write("=== SyncSocio Lead Generation Summary ===\n")
        f.write(f"Total agencies: {total_agencies}\n")
        f.write(f"Unique agencies: {unique_agencies}\n")
        f.write(f"Cities covered: {cities_covered}\n")
        f.write(f"Emails found: {emails_found}\n")
        f.write(f"Phones found: {phones_found}\n")
        f.write(f"Instagram found: {instagram_found}\n")
        f.write(f"Average score: {avg_score:.2f}\n")
