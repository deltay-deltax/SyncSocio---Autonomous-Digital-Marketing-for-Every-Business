from config import SCORING_WEIGHTS

def score_lead(lead_data):
    """
    Scores the lead based on completeness and criteria.
    Maximum score is 100.
    """
    score = 0
    
    if lead_data.get('Website'):
        score += SCORING_WEIGHTS['website']
        
    if lead_data.get('Email'):
        score += SCORING_WEIGHTS['email']
        
    if lead_data.get('Instagram'):
        score += SCORING_WEIGHTS['instagram']
        
    if lead_data.get('LinkedIn'):
        score += SCORING_WEIGHTS['linkedin']
        
    if lead_data.get('Phone'):
        score += SCORING_WEIGHTS['phone']
        
    rating = lead_data.get('Rating')
    if rating:
        try:
            if float(rating) > 4.5:
                score += SCORING_WEIGHTS['rating_gt_4_5']
        except:
            pass
            
    reviews = lead_data.get('Reviews')
    if reviews:
        try:
            # Handle formats like "1,200 reviews" or "50"
            clean_reviews = ''.join(filter(str.isdigit, str(reviews)))
            if clean_reviews and int(clean_reviews) > 30:
                score += SCORING_WEIGHTS['reviews_gt_30']
        except:
            pass
            
    if lead_data.get('Contact Page Found'):
        score += SCORING_WEIGHTS['contact_page']
        
    if lead_data.get('Founder'):
        score += SCORING_WEIGHTS['founder']
        
    # Active socials check (at least 2 socials)
    social_count = sum(1 for k in ['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'YouTube'] if lead_data.get(k))
    if social_count >= 2:
        score += SCORING_WEIGHTS['active_socials']
        
    # Cap score at 100
    return min(score, 100)
