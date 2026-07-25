import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, X, Sparkles, Package, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type FestivalType =
  | 'hindu' | 'muslim' | 'christian' | 'national' | 'commerce' | 'ecom' | 'regional';

export interface Festival {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: FestivalType;
  emoji: string;
  angles: { id: string; label: string; emoji: string; description: string }[];
}

interface BrandShape {
  brandName?: string;
  businessCategory?: string;
  brandTone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  visualStyle?: string;
  country?: string;
}

interface Props {
  brand?: BrandShape;
  language?: string;
  isSaas?: boolean;  // When true: SaaS/Services/Consulting mode — override all D2C angles
  onGenerate?: (data: {
    prompt: string;
    postType: 'Static Ad' | 'Story';
    festival: Festival;
    product?: any;
    imageCount: number;
    customInstruction: string;
    language?: string;
  }) => void;
  products?: any[];
}

const TYPE_COLORS: Record<FestivalType, string> = {
  hindu: '#FF6B35',
  muslim: '#2D7A3A',
  christian: '#C0392B',
  national: '#1a237e',
  commerce: '#7B1FA2',
  ecom: '#E65100',
  regional: '#00838F',
};

const TYPE_LABELS: Record<FestivalType, string> = {
  hindu: 'Hindu', muslim: 'Muslim', christian: 'Christian',
  national: 'National', commerce: 'Commerce', ecom: 'Ecom', regional: 'Regional',
};

export const FESTIVALS_2026: Festival[] = [
  // NATIONAL
  { id:'republic_day', name:'Republic Day', date:'2026-01-26', type:'national', emoji:'🇮🇳',
    angles:[
      {id:'pride', label:'National Pride', emoji:'🇮🇳', description:'Proud to be Indian brand story'},
      {id:'offer', label:'Independence Offer', emoji:'🏷️', description:'Patriotic sale campaign'},
      {id:'made_in_india', label:'Made in India', emoji:'🌿', description:'Highlight Indian origin brand'},
    ]},
  { id:'independence_day', name:'Independence Day', date:'2026-08-15', type:'national', emoji:'🇮🇳',
    angles:[
      {id:'pride', label:'National Pride', emoji:'🇮🇳', description:'Freedom themed brand story'},
      {id:'offer', label:'Freedom Sale', emoji:'🏷️', description:'Independence Day discount'},
      {id:'made_in_india', label:'Made in India', emoji:'🌿', description:'Celebrate Indian brands'},
    ]},
  { id:'gandhi_jayanti', name:'Gandhi Jayanti', date:'2026-10-02', type:'national', emoji:'🕊️',
    angles:[
      {id:'values', label:'Brand Values', emoji:'💚', description:'Simplicity and truth in your brand'},
      {id:'sustainability', label:'Sustainability', emoji:'🌱', description:'Eco-friendly brand angle'},
      {id:'offer', label:'Simple Offer', emoji:'🏷️', description:'No frills honest discount'},
    ]},
  { id:'labour_day', name:'Labour Day', date:'2026-05-01', type:'national', emoji:'🛠️',
    angles:[
      {id:'team', label:'Team Spotlight', emoji:'👥', description:'Showcase your hardworking team'},
      {id:'appreciation', label:'Appreciation', emoji:'🙌', description:'Thanking workers and staff'},
      {id:'offer', label:'Labour Day Offer', emoji:'🏷️', description:'Long weekend sale'},
    ]},
  { id:'ambedkar_jayanti', name:'Ambedkar Jayanti', date:'2026-04-14', type:'national', emoji:'⚖️',
    angles:[
      {id:'respect', label:'Tribute', emoji:'🙏', description:'Respectful brand message'},
      {id:'equality', label:'Equality', emoji:'🤝', description:'Brand values of equality'},
    ]},
  { id:'buddha_purnima', name:'Buddha Purnima', date:'2026-05-01', type:'national', emoji:'🧘',
    angles:[
      {id:'peace', label:'Inner Peace', emoji:'🕊️', description:'Calm and mindfulness'},
      {id:'values', label:'Brand Values', emoji:'🤍', description:'Simplicity theme'},
    ]},
  { id:'guru_nanak_jayanti', name:'Guru Nanak Jayanti', date:'2026-11-24', type:'national', emoji:'ੴ',
    angles:[
      {id:'blessings', label:'Blessings', emoji:'✨', description:'Auspicious wishes'},
      {id:'community', label:'Community', emoji:'🤝', description:'Giving back theme'},
    ]},
  // COMMERCE
  { id:'new_year', name:'New Year', date:'2026-01-01', type:'commerce', emoji:'🎆',
    angles:[
      {id:'resolution', label:'New Year Resolution', emoji:'✨', description:'New year new skincare routine'},
      {id:'offer', label:'New Year Offer', emoji:'🏷️', description:'Start the year with a sale'},
      {id:'gift', label:'Gift Yourself', emoji:'🎁', description:'Treat yourself this new year'},
    ]},
  { id:'valentines', name:"Valentine's Day", date:'2026-02-14', type:'commerce', emoji:'❤️',
    angles:[
      {id:'gift', label:'Gift Angle', emoji:'🎁', description:"Perfect Valentine's gift"},
      {id:'self_love', label:'Self Love', emoji:'💕', description:'Love yourself campaign'},
      {id:'offer', label:'Valentine Offer', emoji:'🏷️', description:'Love-themed discount'},
    ]},
  { id:'womens_day', name:"Women's Day", date:'2026-03-08', type:'commerce', emoji:'💜',
    angles:[
      {id:'empowerment', label:'Empowerment', emoji:'💪', description:"Celebrate women's strength"},
      {id:'self_care', label:'Self Care', emoji:'🌸', description:'You deserve to feel good'},
      {id:'gift', label:'Gift for Her', emoji:'🎁', description:'Gift the women in your life'},
    ]},
  { id:'mothers_day', name:"Mother's Day", date:'2026-05-10', type:'commerce', emoji:'🌷',
    angles:[
      {id:'gift', label:'Gift for Mom', emoji:'🎁', description:"Perfect Mother's Day gift"},
      {id:'emotional', label:'Emotional', emoji:'❤️', description:'Celebrate the love of mothers'},
      {id:'offer', label:"Mom's Special", emoji:'🏷️', description:"Mother's Day discount"},
    ]},
  { id:'fathers_day', name:"Father's Day", date:'2026-06-21', type:'commerce', emoji:'👔',
    angles:[
      {id:'gift', label:'Gift for Dad', emoji:'🎁', description:"Perfect Father's Day gift"},
      {id:'emotional', label:'Celebrate Dad', emoji:'❤️', description:'Honour the father figure'},
      {id:'offer', label:"Dad's Special", emoji:'🏷️', description:"Father's Day sale"},
    ]},
  { id:'childrens_day', name:"Children's Day", date:'2026-11-14', type:'commerce', emoji:'🧒',
    angles:[
      {id:'kids', label:'Kids Focus', emoji:'🧒', description:'Products safe for the family'},
      {id:'gift', label:'Gift for Kids', emoji:'🎁', description:'Treat the little ones'},
      {id:'offer', label:'Family Offer', emoji:'🏷️', description:'Family discount campaign'},
    ]},
  { id:'friendship_day', name:'Friendship Day', date:'2026-08-02', type:'commerce', emoji:'👯',
    angles:[
      {id:'gift', label:'Gift for Friends', emoji:'🎁', description:'Perfect gift for your bestie'},
      {id:'bogo', label:'BOGO Offer', emoji:'👯', description:'Buy one for you, one for friend'},
      {id:'emotional', label:'Friendship Bond', emoji:'❤️', description:'Celebrate brand community'},
    ]},
  { id:'halloween', name:'Halloween', date:'2026-10-31', type:'commerce', emoji:'🎃',
    angles:[
      {id:'spooky', label:'Spooky Fun', emoji:'👻', description:'Fun and quirky brand post'},
      {id:'offer', label:'Scary Good Deals', emoji:'🏷️', description:'Halloween flash sale'},
      {id:'engagement', label:'Trick or Treat', emoji:'🍬', description:'Engaging giveaway or contest'},
    ]},
  { id:'new_years_eve', name:"New Year's Eve", date:'2026-12-31', type:'commerce', emoji:'🥂',
    angles:[
      {id:'celebration', label:'NYE Party', emoji:'🎉', description:'Get ready for the party'},
      {id:'recap', label:'Year in Review', emoji:'📅', description:'Brand year recap'},
      {id:'offer', label:'Year End Sale', emoji:'🏷️', description:'Last sale of the year'},
    ]},
  // HINDU
  { id:'makar_sankranti', name:'Makar Sankranti', date:'2026-01-14', type:'hindu', emoji:'🪁',
    angles:[
      {id:'fresh_start', label:'Fresh Start', emoji:'☀️', description:'New season new routine'},
      {id:'offer', label:'Sankranti Offer', emoji:'🏷️', description:'Harvest season discount'},
      {id:'emotional', label:'Festival Feels', emoji:'🌾', description:'Celebrate the harvest'},
    ]},
  { id:'vasant_panchami', name:'Vasant Panchami', date:'2026-01-23', type:'hindu', emoji:'🌼',
    angles:[
      {id:'spring', label:'Spring Vibes', emoji:'🌸', description:'Spring skincare refresh'},
      {id:'offer', label:'Spring Offer', emoji:'🏷️', description:'Season change sale'},
      {id:'emotional', label:'Saraswati Blessings', emoji:'📚', description:'Knowledge and beauty'},
    ]},
  { id:'mahashivratri', name:'Mahashivratri', date:'2026-02-15', type:'hindu', emoji:'🔱',
    angles:[
      {id:'spiritual', label:'Spiritual Calm', emoji:'🕉️', description:'Peace and purity angle'},
      {id:'offer', label:'Shivratri Offer', emoji:'🏷️', description:'Festival discount'},
      {id:'emotional', label:'Divine Glow', emoji:'✨', description:'Inner and outer glow'},
    ]},
  { id:'holi', name:'Holi', date:'2026-03-04', type:'hindu', emoji:'🌈',
    angles:[
      {id:'color', label:'Color Your Feed', emoji:'🌈', description:'Vibrant colorful creative'},
      {id:'skincare', label:'Post-Holi Care', emoji:'💧', description:'Protect skin from colors'},
      {id:'offer', label:'Holi Offer', emoji:'🏷️', description:'Festival of colors sale'},
    ]},
  { id:'ram_navami', name:'Ram Navami', date:'2026-03-26', type:'hindu', emoji:'🙏',
    angles:[
      {id:'values', label:'Brand Values', emoji:'💛', description:'Truth and purity in brand'},
      {id:'offer', label:'Festival Offer', emoji:'🏷️', description:'Ram Navami discount'},
      {id:'emotional', label:'Blessings', emoji:'🌸', description:'Auspicious day campaign'},
    ]},
  { id:'akshaya_tritiya', name:'Akshaya Tritiya', date:'2026-04-28', type:'hindu', emoji:'✨',
    angles:[
      {id:'investment', label:'Invest in Yourself', emoji:'💰', description:'Best day to buy — auspicious'},
      {id:'gift', label:'Auspicious Gift', emoji:'🎁', description:'Gift on this golden day'},
      {id:'offer', label:'Akshaya Offer', emoji:'🏷️', description:'Auspicious day sale'},
    ]},
  { id:'raksha_bandhan', name:'Raksha Bandhan', date:'2026-08-28', type:'hindu', emoji:'🎀',
    angles:[
      {id:'gift', label:'Gift for Sister', emoji:'🎁', description:'Perfect Rakhi gift'},
      {id:'gift_brother', label:'Gift from Brother', emoji:'❤️', description:'Brother gifting sister'},
      {id:'offer', label:'Rakhi Offer', emoji:'🏷️', description:'Festival gifting discount'},
    ]},
  { id:'janmashtami', name:'Janmashtami', date:'2026-09-04', type:'hindu', emoji:'🦚',
    angles:[
      {id:'divine', label:'Divine Beauty', emoji:'🦚', description:'Celestial glow campaign'},
      {id:'offer', label:'Janmashtami Offer', emoji:'🏷️', description:'Festival discount'},
      {id:'emotional', label:'Celebration', emoji:'✨', description:'Joyful festival campaign'},
    ]},
  { id:'ganesh_chaturthi', name:'Ganesh Chaturthi', date:'2026-09-14', type:'hindu', emoji:'🐘',
    angles:[
      {id:'new_beginning', label:'New Beginnings', emoji:'🐘', description:'Ganpati blessings for brand'},
      {id:'offer', label:'Ganesh Offer', emoji:'🏷️', description:'Auspicious festival sale'},
      {id:'emotional', label:'Festive Joy', emoji:'🎉', description:'Celebration mood campaign'},
    ]},
  { id:'navratri', name:'Navratri', date:'2026-10-11', type:'hindu', emoji:'💃',
    angles:[
      {id:'glow', label:'Festive Glow', emoji:'✨', description:'Look good for Navratri nights'},
      {id:'offer', label:'Navratri Offer', emoji:'🏷️', description:'9 nights of deals'},
      {id:'emotional', label:'Garba Vibes', emoji:'💃', description:'Energy and celebration'},
    ]},
  { id:'dussehra', name:'Dussehra', date:'2026-10-20', type:'hindu', emoji:'🏹',
    angles:[
      {id:'victory', label:'Victory of Good', emoji:'🏹', description:'Overcome skin problems angle'},
      {id:'offer', label:'Dussehra Offer', emoji:'🏷️', description:'Victory day sale'},
      {id:'emotional', label:'Celebration', emoji:'🎆', description:'Festive triumph mood'},
    ]},
  { id:'dhanteras', name:'Dhanteras', date:'2026-11-06', type:'hindu', emoji:'🪙',
    angles:[
      {id:'investment', label:'Invest in Skin', emoji:'🪙', description:'Best day to invest in skincare'},
      {id:'gift', label:'Auspicious Gift', emoji:'🎁', description:'Gift on Dhanteras'},
      {id:'offer', label:'Dhanteras Deal', emoji:'🏷️', description:'Auspicious shopping day'},
    ]},
  { id:'diwali', name:'Diwali', date:'2026-11-08', type:'hindu', emoji:'🪔',
    angles:[
      {id:'offer', label:'Diwali Sale', emoji:'🏷️', description:'Festival of lights sale'},
      {id:'emotional', label:'Glow this Diwali', emoji:'✨', description:'Celebratory brand moment'},
      {id:'gift', label:'Diwali Gift', emoji:'🎁', description:'Position product as Diwali gift'},
    ]},
  { id:'bhai_dooj', name:'Bhai Dooj', date:'2026-11-11', type:'hindu', emoji:'🤝',
    angles:[
      {id:'gift', label:'Gift for Sister', emoji:'🎁', description:'Brother gifting sister'},
      {id:'offer', label:'Bhai Dooj Offer', emoji:'🏷️', description:'Sibling bonding sale'},
      {id:'emotional', label:'Sibling Love', emoji:'❤️', description:'Celebrate sibling bond'},
    ]},
  { id:'chhath_puja', name:'Chhath Puja', date:'2026-11-15', type:'hindu', emoji:'🌅',
    angles:[
      {id:'purity', label:'Purity Angle', emoji:'☀️', description:'Sun and purity brand theme'},
      {id:'offer', label:'Chhath Offer', emoji:'🏷️', description:'Festival discount'},
      {id:'emotional', label:'Devotion', emoji:'🙏', description:'Spiritual celebration campaign'},
    ]},
  { id:'gudi_padwa', name:'Gudi Padwa', date:'2026-03-19', type:'hindu', emoji:'🌸',
    angles:[
      {id:'new_year', label:'Marathi New Year', emoji:'✨', description:'New beginnings and growth'},
      {id:'offer', label:'Gudi Padwa Offer', emoji:'🏷️', description:'Auspicious day sale'},
      {id:'traditional', label:'Traditional Roots', emoji:'🕉️', description:'Connect with heritage'},
    ]},
  { id:'karwa_chauth', name:'Karwa Chauth', date:'2026-10-29', type:'hindu', emoji:'🌙',
    angles:[
      {id:'glow', label:'Fasting Glow', emoji:'✨', description:'Look beautiful for the moon'},
      {id:'gift', label:'Gift for Wife', emoji:'🎁', description:'Husband gifting wife angle'},
      {id:'offer', label:'Karwa Chauth Deal', emoji:'🏷️', description:'Pre-festival beauty/fashion sale'},
    ]},
  { id:'mahavir_jayanti', name:'Mahavir Jayanti', date:'2026-03-31', type:'hindu', emoji:'🕊️',
    angles:[
      {id:'peace', label:'Non-violence', emoji:'🤍', description:'Peaceful brand message'},
      {id:'values', label:'Values', emoji:'🌿', description:'Eco-friendly or vegan theme'},
    ]},
  // REGIONAL
  { id:'pongal', name:'Pongal', date:'2026-01-14', type:'regional', emoji:'🌾',
    angles:[
      {id:'harvest', label:'Harvest Joy', emoji:'🌾', description:'South Indian celebration'},
      {id:'offer', label:'Pongal Offer', emoji:'🏷️', description:'Pongal sale for South India'},
      {id:'emotional', label:'Festival Feels', emoji:'☀️', description:'Tamil celebration mood'},
    ]},
  { id:'baisakhi', name:'Baisakhi', date:'2026-04-14', type:'regional', emoji:'🌻',
    angles:[
      {id:'harvest', label:'Harvest Season', emoji:'🌻', description:'Punjab harvest celebration'},
      {id:'offer', label:'Baisakhi Offer', emoji:'🏷️', description:'Harvest festival sale'},
      {id:'emotional', label:'Celebration', emoji:'🎉', description:'Bhangra vibes campaign'},
    ]},
  { id:'onam', name:'Onam', date:'2026-08-26', type:'regional', emoji:'🌸',
    angles:[
      {id:'kerala', label:'Kerala Pride', emoji:'🌸', description:"God's own country campaign"},
      {id:'offer', label:'Onam Offer', emoji:'🏷️', description:'Onam harvest sale'},
      {id:'gift', label:'Onam Gift', emoji:'🎁', description:'Gift for Onam celebration'},
    ]},
  { id:'ugadi', name:'Ugadi', date:'2026-03-19', type:'regional', emoji:'🌿',
    angles:[
      {id:'new_year', label:'Telugu New Year', emoji:'🌿', description:'New year new beginning'},
      {id:'offer', label:'Ugadi Offer', emoji:'🏷️', description:'South Indian new year sale'},
      {id:'emotional', label:'Fresh Start', emoji:'✨', description:'New year celebration'},
    ]},
  { id:'bihu', name:'Bihu', date:'2026-04-15', type:'regional', emoji:'🌾',
    angles:[
      {id:'harvest', label:'Assam Harvest', emoji:'🌾', description:'Northeast India celebration'},
      {id:'offer', label:'Bihu Offer', emoji:'🏷️', description:'Bihu festival sale'},
      {id:'emotional', label:'Cultural Pride', emoji:'🎵', description:'Bihu dance vibes'},
    ]},
  { id:'durga_puja', name:'Durga Puja', date:'2026-10-18', type:'regional', emoji:'🌺',
    angles:[
      {id:'power', label:'Goddess Energy', emoji:'🌺', description:'Shakti and strength angle'},
      {id:'offer', label:'Pujo Offer', emoji:'🏷️', description:'Bengali festival sale'},
      {id:'emotional', label:'Pujo Vibes', emoji:'✨', description:'Kolkata celebration mood'},
    ]},
  { id:'shivaji_jayanti', name:'Shivaji Jayanti', date:'2026-02-19', type:'regional', emoji:'🚩',
    angles:[
      {id:'pride', label:'Maratha Pride', emoji:'🚩', description:'Regional pride post'},
      {id:'strength', label:'Strength', emoji:'💪', description:'Bold brand message'},
    ]},
  { id:'rath_yatra', name:'Rath Yatra', date:'2026-07-16', type:'regional', emoji:'🛕',
    angles:[
      {id:'blessings', label:'Divine Journey', emoji:'🙏', description:'Auspicious wishes'},
      {id:'celebration', label:'Festive Joy', emoji:'✨', description:'Odisha celebration mood'},
    ]},
  // MUSLIM
  { id:'eid_fitr', name:'Eid ul-Fitr', date:'2026-03-21', type:'muslim', emoji:'🌙',
    angles:[
      {id:'gift', label:'Eid Gift', emoji:'🎁', description:'Perfect Eid gift for loved ones'},
      {id:'celebration', label:'Eid Mubarak', emoji:'🌙', description:'Celebratory Eid campaign'},
      {id:'offer', label:'Eid Offer', emoji:'🏷️', description:'Eid festival discount'},
    ]},
  { id:'eid_adha', name:'Eid ul-Adha', date:'2026-05-27', type:'muslim', emoji:'🐑',
    angles:[
      {id:'gift', label:'Bakrid Gift', emoji:'🎁', description:'Gift your loved ones'},
      {id:'celebration', label:'Eid Mubarak', emoji:'🌙', description:'Festival celebration post'},
      {id:'offer', label:'Bakrid Offer', emoji:'🏷️', description:'Eid al-Adha sale'},
    ]},
  { id:'muharram', name:'Muharram', date:'2026-06-26', type:'muslim', emoji:'🌙',
    angles:[
      {id:'respectful', label:'Respectful Post', emoji:'🕊️', description:'Thoughtful brand message'},
      {id:'values', label:'Brand Values', emoji:'💚', description:'Peace and reflection theme'},
      {id:'offer', label:'Gentle Offer', emoji:'🏷️', description:'Subtle respectful campaign'},
    ]},
  { id:'ramadan_start', name:'Ramadan Starts', date:'2026-02-19', type:'muslim', emoji:'🌙',
    angles:[
      {id:'wishes', label:'Ramadan Mubarak', emoji:'🌙', description:'Holy month wishes'},
      {id:'fasting', label:'Fasting Routine', emoji:'Dates', description:'Healthy routine during fast'},
    ]},
  { id:'milad_un_nabi', name:'Milad un-Nabi', date:'2026-08-26', type:'muslim', emoji:'🕌',
    angles:[
      {id:'respectful', label:'Respectful Post', emoji:'🕊️', description:'Thoughtful brand message'},
    ]},
  // CHRISTIAN
  { id:'good_friday', name:'Good Friday', date:'2026-04-03', type:'christian', emoji:'✝️',
    angles:[
      {id:'reflection', label:'Reflection', emoji:'🕊️', description:'Thoughtful brand message'},
      {id:'values', label:'Brand Values', emoji:'💙', description:'Hope and peace theme'},
      {id:'offer', label:'Easter Weekend', emoji:'🏷️', description:'Easter weekend sale'},
    ]},
  { id:'easter', name:'Easter', date:'2026-04-05', type:'christian', emoji:'🐣',
    angles:[
      {id:'renewal', label:'Fresh Start', emoji:'🌱', description:'New beginnings spring theme'},
      {id:'gift', label:'Easter Gift', emoji:'🎁', description:'Easter gifting campaign'},
      {id:'offer', label:'Easter Offer', emoji:'🏷️', description:'Easter weekend discount'},
    ]},
  { id:'christmas', name:'Christmas', date:'2026-12-25', type:'christian', emoji:'🎄',
    angles:[
      {id:'gift', label:'Christmas Gift', emoji:'🎁', description:'Perfect Christmas gift'},
      {id:'emotional', label:'Festive Cheer', emoji:'🎄', description:'Warm Christmas mood'},
      {id:'offer', label:'Christmas Sale', emoji:'🏷️', description:'Year end festive offer'},
    ]},
  // ECOM
  { id:'amazon_sale', name:'Amazon Great Indian Sale', date:'2026-01-13', type:'ecom', emoji:'🛒',
    angles:[
      {id:'offer', label:'Sale Offer', emoji:'🏷️', description:'Biggest sale of the year'},
      {id:'urgency', label:'Limited Time', emoji:'⏰', description:"Don't miss this deal"},
      {id:'value', label:'Best Value', emoji:'💰', description:'Best price guarantee'},
    ]},
  { id:'big_billion', name:'Big Billion Days', date:'2026-10-08', type:'ecom', emoji:'🛍️',
    angles:[
      {id:'offer', label:'Billion Dollar Deal', emoji:'🏷️', description:"Flipkart's biggest sale"},
      {id:'urgency', label:'Limited Time', emoji:'⏰', description:'Hurry before stocks end'},
      {id:'value', label:'Unbeatable Price', emoji:'💰', description:'Best price campaign'},
    ]},
  { id:'black_friday', name:'Black Friday', date:'2026-11-27', type:'ecom', emoji:'🖤',
    angles:[
      {id:'offer', label:'Black Friday Deal', emoji:'🖤', description:'Biggest discount of the year'},
      {id:'urgency', label:'24 Hours Only', emoji:'⏰', description:'One day flash sale'},
      {id:'value', label:'Steal the Deal', emoji:'💰', description:'Too good to miss'},
    ]},
  { id:'end_of_season_summer', name:'End of Season Sale', date:'2026-06-15', type:'ecom', emoji:'☀️',
    angles:[
      {id:'clearance', label:'Stock Clearance', emoji:'📦', description:'Last chance to grab summer picks'},
      {id:'offer', label:'Summer Clearance', emoji:'🏷️', description:'Summer season finale sale'},
      {id:'urgency', label:'Limited Stock', emoji:'⏰', description:'While stocks last'},
    ]},
  { id:'end_of_season_winter', name:'End of Season Sale', date:'2026-12-20', type:'ecom', emoji:'❄️',
    angles:[
      {id:'clearance', label:'Winter Clearance', emoji:'📦', description:'Clear winter collection'},
      {id:'offer', label:'Year End Sale', emoji:'🏷️', description:'End of year mega discount'},
      {id:'urgency', label:'Last Chance', emoji:'⏰', description:'Year end final sale'},
    ]},
];

const FILTERS: ({ id: 'all'; label: string } | { id: FestivalType; label: string })[] = [
  { id: 'all', label: 'All' },
  { id: 'hindu', label: 'Hindu' },
  { id: 'muslim', label: 'Muslim' },
  { id: 'christian', label: 'Christian' },
  { id: 'national', label: 'National' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'ecom', label: 'Ecom' },
  { id: 'regional', label: 'Regional' },
];

// ── SaaS Festival Angles ──────────────────────────────────────────────────────
// Replaces all D2C/skincare angles with B2B thought-leadership angles for
// SaaS & Digital, Services, and Coaching & Consulting brands.
const SAAS_FESTIVAL_ANGLES: Record<string, Festival['angles']> = {
  // NATIONAL
  republic_day: [
    { id: 'milestone', label: 'Company Milestone', emoji: '🏆', description: 'Share a key achievement from the past year' },
    { id: 'vision', label: 'Vision & Mission', emoji: '🎯', description: 'Restate your brand\'s purpose and national impact' },
    { id: 'community', label: 'Community Story', emoji: '🤝', description: 'Celebrate the community you serve' },
  ],
  independence_day: [
    { id: 'independence', label: 'Freedom from Manual Work', emoji: '⚡', description: 'How your solution liberates teams from repetitive tasks' },
    { id: 'indian_growth', label: 'Built for India', emoji: '🇮🇳', description: 'Your contribution to Indian entrepreneurship' },
    { id: 'team_culture', label: 'Team Culture', emoji: '👥', description: 'Celebrate the team behind the brand' },
  ],
  gandhi_jayanti: [
    { id: 'simplicity', label: 'Simplify Your Stack', emoji: '🕊️', description: 'Less is more — how you simplify complex workflows' },
    { id: 'values', label: 'Brand Values', emoji: '💚', description: 'The principles that drive your business decisions' },
    { id: 'impact', label: 'Social Impact', emoji: '🌱', description: 'A genuine story of positive impact in the community' },
  ],
  // COMMERCE
  new_year: [
    { id: 'year_wrap', label: '2025 In Numbers', emoji: '📊', description: 'Share key metrics and wins from the past year' },
    { id: 'goals', label: 'Goals for 2026', emoji: '🎯', description: 'Preview what your team is building this year' },
    { id: 'framework', label: 'New Year Framework', emoji: '🧠', description: 'Share a planning framework for the new year' },
  ],
  valentines: [
    { id: 'love_clients', label: 'Client Love', emoji: '❤️', description: 'Celebrate the clients who trust you most' },
    { id: 'team_appreciation', label: 'Team Appreciation', emoji: '💜', description: 'Spotlight the people behind your brand' },
    { id: 'product_love', label: 'What We Love Building', emoji: '🚀', description: 'Share what excites your team about the product' },
  ],
  womens_day: [
    { id: 'empowerment', label: 'Women in Tech/Business', emoji: '💪', description: 'Spotlight women leaders and your D&I stance' },
    { id: 'team_spotlight', label: 'Team Spotlight', emoji: '🌟', description: 'Feature women on your team making impact' },
    { id: 'thought_leadership', label: 'Industry Insight', emoji: '🧠', description: 'A provocative stat or insight on women in your industry' },
  ],
  mothers_day: [
    { id: 'team_story', label: 'Team Family Story', emoji: '🌷', description: 'A human story from the team about work-life balance' },
    { id: 'gratitude', label: 'Client Gratitude', emoji: '💌', description: 'Thank your clients in a warm, human way' },
    { id: 'insight', label: 'Industry Reflection', emoji: '💡', description: 'A reflective insight connecting the theme to business' },
  ],
  fathers_day: [
    { id: 'leadership', label: 'Leadership Lesson', emoji: '👔', description: 'A lesson about leadership or mentorship' },
    { id: 'team_story', label: 'Founder/Team Story', emoji: '🏗️', description: 'A personal story about building with purpose' },
    { id: 'insight', label: 'Business Wisdom', emoji: '🧠', description: 'A framework or principle that guides your work' },
  ],
  childrens_day: [
    { id: 'curiosity', label: 'Stay Curious', emoji: '🔭', description: 'The value of curiosity and learning in business' },
    { id: 'future', label: 'Building the Future', emoji: '🚀', description: 'What you\'re building for tomorrow\'s generation' },
    { id: 'team_culture', label: 'Learning Culture', emoji: '📚', description: 'How your team keeps learning and growing' },
  ],
  // HINDU
  makar_sankranti: [
    { id: 'fresh_start', label: 'New Season, New Goals', emoji: '☀️', description: 'Use the seasonal shift as a business planning hook' },
    { id: 'harvest', label: 'Q1 Planning', emoji: '🌾', description: 'Share a Q1 goal-setting framework' },
    { id: 'community', label: 'Community Celebration', emoji: '🎉', description: 'Warm wishes + a genuine brand milestone' },
  ],
  vasant_panchami: [
    { id: 'knowledge', label: 'Knowledge & Learning', emoji: '📚', description: 'The role of learning in growing your business' },
    { id: 'spring_launch', label: 'Spring Feature Launch', emoji: '🌸', description: 'A new feature, product, or initiative going live' },
    { id: 'insight', label: 'Industry Insight', emoji: '💡', description: 'A sharp insight for your audience this season' },
  ],
  mahashivratri: [
    { id: 'focus', label: 'Deep Work & Focus', emoji: '🕉️', description: 'The power of focused work and minimal distraction' },
    { id: 'transformation', label: 'Transformation Story', emoji: '🔄', description: 'A client or product transformation story' },
    { id: 'community', label: 'Gratitude Post', emoji: '🙏', description: 'A thoughtful appreciation post for your community' },
  ],
  holi: [
    { id: 'bold_thinking', label: 'Think in Color', emoji: '🎨', description: 'Bold, colorful thinking — challenge convention in your industry' },
    { id: 'team_culture', label: 'Team Celebration', emoji: '🌈', description: 'A vibrant, energetic team culture post' },
    { id: 'rebrand', label: 'Fresh Perspective', emoji: '✨', description: 'A new way of looking at a familiar business problem' },
  ],
  ram_navami: [
    { id: 'values', label: 'Brand Values', emoji: '💛', description: 'The core principles that guide your team and brand' },
    { id: 'leadership', label: 'Leadership Reflection', emoji: '🏹', description: 'A thought on decisive, principled leadership' },
    { id: 'community', label: 'Community Moment', emoji: '🌸', description: 'A warm, inclusive community celebration post' },
  ],
  akshaya_tritiya: [
    { id: 'investment', label: 'Invest in Your Business', emoji: '💰', description: 'Why now is the right time to invest in [your category]' },
    { id: 'roi', label: 'ROI Story', emoji: '📈', description: 'A real client ROI or growth story' },
    { id: 'growth', label: 'Growth Mindset', emoji: '🌱', description: 'A framework for sustainable business growth' },
  ],
  raksha_bandhan: [
    { id: 'partnership', label: 'Partnership Story', emoji: '🤝', description: 'Celebrate a key partner or integration' },
    { id: 'community', label: 'Client Relationships', emoji: '❤️', description: 'The bond between your brand and your clients' },
    { id: 'team', label: 'Team Bond', emoji: '🎀', description: 'Celebrate the unbreakable bonds within your team' },
  ],
  janmashtami: [
    { id: 'origin_story', label: 'Origin Story', emoji: '✨', description: 'Share the founding story of your brand' },
    { id: 'joyful', label: 'Celebrate the Team', emoji: '🦚', description: 'A joyful, celebratory post about your people' },
    { id: 'wisdom', label: 'Business Lesson', emoji: '🪭', description: 'A timeless insight applied to modern business' },
  ],
  ganesh_chaturthi: [
    { id: 'new_beginning', label: 'New Product/Feature Launch', emoji: '🐘', description: 'Position your launch as a new beginning' },
    { id: 'obstacles', label: 'Removing Obstacles', emoji: '🚀', description: 'How your solution removes key business obstacles' },
    { id: 'gratitude', label: 'Community Gratitude', emoji: '🙏', description: 'Celebrate and thank your growing community' },
  ],
  navratri: [
    { id: 'energy', label: 'High-Energy Team Culture', emoji: '💃', description: 'The vibrant energy that drives your team forward' },
    { id: 'nine_days', label: '9-Day Challenge/Tip Series', emoji: '✨', description: 'Share 9 quick tips or insights (one per day)' },
    { id: 'strength', label: 'Strength & Resilience', emoji: '⚡', description: 'The resilience that defines your brand journey' },
  ],
  dussehra: [
    { id: 'victory', label: 'Victory Over Inefficiency', emoji: '🏹', description: 'How your brand helps defeat workflow bottlenecks' },
    { id: 'milestone', label: 'Team Win', emoji: '🏆', description: 'Celebrate a recent team or product victory' },
    { id: 'case_study', label: 'Client Win Story', emoji: '🎆', description: 'A brief, punchy client success story' },
  ],
  dhanteras: [
    { id: 'roi', label: 'Invest in Growth', emoji: '💎', description: 'Why investing in [your solution] is the best ROI decision' },
    { id: 'value', label: 'Value Story', emoji: '📈', description: 'The long-term value your brand creates for clients' },
    { id: 'auspicious_launch', label: 'Launch Announcement', emoji: '🪙', description: 'Use the auspicious day to announce something new' },
  ],
  diwali: [
    { id: 'light_up', label: 'Light Up Your Growth', emoji: '🪔', description: 'How your brand lights up client business outcomes' },
    { id: 'year_milestone', label: 'Year-End Milestone', emoji: '✨', description: 'Reflect on wins from the year with your community' },
    { id: 'new_beginning', label: 'New Phase Launch', emoji: '🎇', description: 'Use Diwali as a launch moment for a new initiative' },
  ],
  bhai_dooj: [
    { id: 'partnership', label: 'Partner Appreciation', emoji: '🤝', description: 'Celebrate a key business partner relationship' },
    { id: 'team_bond', label: 'Team Bonds', emoji: '❤️', description: 'A warm post about the brotherly bonds in your team' },
    { id: 'community', label: 'Community Love', emoji: '💙', description: 'Appreciation for the community that supports you' },
  ],
  chhath_puja: [
    { id: 'dedication', label: 'Dedicated to Excellence', emoji: '☀️', description: 'The dedication and discipline behind your brand' },
    { id: 'sustainability', label: 'Sustainable Growth', emoji: '🌱', description: 'Building business sustainably for the long term' },
    { id: 'community', label: 'Community Celebration', emoji: '🙏', description: 'A respectful, inclusive celebration post' },
  ],
  // REGIONAL
  pongal: [
    { id: 'harvest', label: 'Q1 Harvest: Key Wins', emoji: '🌾', description: 'Share the wins your clients harvested using your solution' },
    { id: 'new_chapter', label: 'New Chapter', emoji: '🌅', description: 'A fresh-start energy post for the new quarter' },
    { id: 'team_culture', label: 'South India Spotlight', emoji: '☀️', description: 'Celebrate the South Indian tech and business ecosystem' },
  ],
  baisakhi: [
    { id: 'harvest', label: 'Results Season', emoji: '🌻', description: 'It\'s harvest time — share your clients\' results' },
    { id: 'new_financial_year', label: 'New Financial Year', emoji: '📊', description: 'Planning tips for the new Indian financial year' },
    { id: 'community', label: 'Community Celebration', emoji: '🎉', description: 'A warm, inclusive celebration for the season' },
  ],
  onam: [
    { id: 'abundance', label: 'Abundance Story', emoji: '🌸', description: 'The abundance your solution creates for clients' },
    { id: 'community', label: 'Kerala Tech Community', emoji: '🌴', description: 'Celebrate the vibrant South Indian tech ecosystem' },
    { id: 'milestone', label: 'Team Milestone', emoji: '🎊', description: 'A joyful team or product milestone celebration' },
  ],
  ugadi: [
    { id: 'new_year_goals', label: 'New Year Goals', emoji: '🌿', description: 'Set bold goals for the Telugu/Kannada new year' },
    { id: 'fresh_start', label: 'Fresh Product Chapter', emoji: '✨', description: 'A new product phase or roadmap announcement' },
    { id: 'community', label: 'South India Community', emoji: '🌺', description: 'Celebrate the rich culture and business community' },
  ],
  bihu: [
    { id: 'team_culture', label: 'Joyful Team Culture', emoji: '🎵', description: 'The energy and celebration at the heart of your team' },
    { id: 'northeast_spotlight', label: 'Northeast India Spotlight', emoji: '🌾', description: 'Celebrate the growing business ecosystem in Northeast India' },
    { id: 'community', label: 'Community Moment', emoji: '🎉', description: 'A celebratory community post with cultural respect' },
  ],
  durga_puja: [
    { id: 'strength', label: 'Strength & Power', emoji: '🌺', description: 'The power of your solution to overcome business challenges' },
    { id: 'kolkata_ecosystem', label: 'Bengal Business Spotlight', emoji: '✨', description: 'Celebrate the Bengal startup and business ecosystem' },
    { id: 'team_culture', label: 'Team Celebration', emoji: '🎊', description: 'A joyful team culture moment inspired by the pujo spirit' },
  ],
  // MUSLIM
  eid_fitr: [
    { id: 'gratitude', label: 'Client Gratitude', emoji: '🌙', description: 'Express deep gratitude to clients and the community' },
    { id: 'renewal', label: 'Product Renewal/Update', emoji: '✨', description: 'Use Eid as a moment to announce a fresh update' },
    { id: 'community', label: 'Inclusive Community Post', emoji: '🤝', description: 'A warm, inclusive Eid Mubarak to your entire community' },
  ],
  eid_adha: [
    { id: 'sacrifice', label: 'Built on Sacrifice', emoji: '💙', description: 'The dedication and sacrifice behind your brand journey' },
    { id: 'gratitude', label: 'Community Gratitude', emoji: '🌙', description: 'Thank your community warmly and inclusively' },
    { id: 'milestone', label: 'Brand Milestone', emoji: '🏆', description: 'Celebrate a key company achievement' },
  ],
  muharram: [
    { id: 'reflection', label: 'Reflection & Resilience', emoji: '🕊️', description: 'A thoughtful, respectful reflection on resilience in business' },
    { id: 'values', label: 'Brand Values', emoji: '💚', description: 'Revisit the core values that guide your brand' },
    { id: 'community', label: 'Respectful Solidarity', emoji: '🤝', description: 'A thoughtful, respectful acknowledgment of the occasion' },
  ],
  // CHRISTIAN
  good_friday: [
    { id: 'reflection', label: 'Pause & Reflect', emoji: '🕊️', description: 'A thoughtful pause — what your brand stands for' },
    { id: 'resilience', label: 'Resilience Story', emoji: '💙', description: 'A story of overcoming challenges with purpose' },
    { id: 'community', label: 'Community Respect', emoji: '✝️', description: 'A respectful, inclusive post acknowledging the day' },
  ],
  easter: [
    { id: 'renewal', label: 'Product Rebirth/Update', emoji: '🌱', description: 'A new product update or rebrand announcement' },
    { id: 'fresh_start', label: 'Fresh Start Energy', emoji: '🐣', description: 'A spring-energy post about new beginnings in business' },
    { id: 'growth', label: 'Growth Story', emoji: '🌷', description: 'A client or brand growth story that mirrors renewal' },
  ],
  christmas: [
    { id: 'year_review', label: 'Year in Review', emoji: '🎄', description: 'Key achievements, lessons, and gratitude for the year' },
    { id: 'team_appreciation', label: 'Team Appreciation', emoji: '🎁', description: 'Celebrate the people who made this year possible' },
    { id: 'vision', label: '2026 Vision Teaser', emoji: '✨', description: 'Tease what\'s coming in the new year with excitement' },
  ],
  // ECOM (repurposed for SaaS)
  amazon_sale: [
    { id: 'featured', label: 'Platform Feature', emoji: '🚀', description: 'Get featured or integrate with top platforms' },
    { id: 'roi', label: 'ROI Story', emoji: '📊', description: 'How clients achieve more with less using your platform' },
    { id: 'insight', label: 'Market Insight', emoji: '💡', description: 'A sharp insight about the current market opportunity' },
  ],
  big_billion: [
    { id: 'growth', label: 'Billion in Savings', emoji: '💰', description: 'The collective value created for your client base' },
    { id: 'scale', label: 'Scale Story', emoji: '📈', description: 'How you help businesses scale without chaos' },
    { id: 'milestone', label: 'Company Milestone', emoji: '🏆', description: 'A major product or revenue milestone' },
  ],
  black_friday: [
    { id: 'value', label: 'Real Value, Not Discounts', emoji: '💎', description: 'Why long-term value beats one-day deals' },
    { id: 'roi', label: 'Year-Round ROI', emoji: '📊', description: 'The consistent ROI clients see every month' },
    { id: 'insight', label: 'Contrarian Take', emoji: '🧠', description: 'A bold contrarian perspective on Black Friday for B2B' },
  ],
  end_of_season_summer: [
    { id: 'q2_review', label: 'H1 Wrap-Up', emoji: '☀️', description: 'Key learnings and results from the first half of the year' },
    { id: 'planning', label: 'H2 Planning', emoji: '📋', description: 'A framework or tips for planning the second half' },
    { id: 'team_milestone', label: 'Team Milestone', emoji: '🏖️', description: 'Celebrate a key team achievement this quarter' },
  ],
  end_of_season_winter: [
    { id: 'year_wrap', label: 'Year-End Wrap', emoji: '❄️', description: 'Full-year summary of client wins and team achievements' },
    { id: 'roadmap', label: '2026 Roadmap Teaser', emoji: '🗺️', description: 'Tease what\'s on the product roadmap for next year' },
    { id: 'gratitude', label: 'Community Gratitude', emoji: '🙏', description: 'A heartfelt thank-you to everyone who believed in you' },
  ],
};

// Returns SaaS angles for a festival, falling back to generic B2B angles
const getSaasAngles = (festivalId: string): Festival['angles'] => {
  return SAAS_FESTIVAL_ANGLES[festivalId] || [
    { id: 'milestone', label: 'Company Milestone', emoji: '🏆', description: 'Share a key achievement or company win' },
    { id: 'insight', label: 'Industry Insight', emoji: '💡', description: 'A sharp, relevant insight for your audience' },
    { id: 'community', label: 'Community Appreciation', emoji: '🤝', description: 'Celebrate and thank your community or clients' },
  ];
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const languages = [
  { id: 'english', label: 'English', flag: '🇬🇧' },
  { id: 'hinglish', label: 'Hinglish', flag: '🅷' },
  { id: 'hindi', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { id: 'marathi', label: 'Marathi (मराठी)', flag: '🌾' },
  { id: 'bengali', label: 'Bengali (বাংলা)', flag: '🌸' },
  { id: 'gujarati', label: 'Gujarati (ગુજરાતી)', flag: '🪁' },
  { id: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🌾' },
  { id: 'tamil', label: 'Tamil (தமிழ்)', flag: '🪔' },
  { id: 'telugu', label: 'Telugu (தெలుగు)', flag: '🌟' },
  { id: 'kannada', label: 'Kannada (ಕನ್ನಡ)', flag: '🌺' },
  { id: 'malayalam', label: 'Malayalam (മലയാളം)', flag: '🌴' },
  { id: 'odia', label: 'Odia (ଓଡ଼ିଆ)', flag: '🐚' },
  { id: 'nepali', label: 'Nepali (नेपाली)', flag: '🇳🇵' },
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const diffDays = (a: Date, b: Date) =>
  Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
              new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / 86400000);

function imgSrc(src: string | null | undefined): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) return src;
  return `data:image/jpeg;base64,${src}`;
}

export const FESTIVALS_NEPAL_2083: Festival[] = [
  // NATIONAL
  { id:'nepali_new_year', name:'Nepali New Year', date:'2026-04-14', type:'national', emoji:'🌄', angles:[{id:'new_year', label:'New Beginnings', emoji:'✨', description:'Start the year fresh'},{id:'offer', label:'New Year Offer', emoji:'🏷️', description:'Baisakh special discount'},{id:'cultural', label:'Cultural Pride', emoji:'🇳🇵', description:'Celebrate Nepali heritage'}] },
  { id:'republic_day_np', name:'Ganatantra Diwas', date:'2026-05-29', type:'national', emoji:'🇳🇵', angles:[{id:'pride', label:'National Pride', emoji:'🇳🇵', description:'Proud to be Nepali'},{id:'offer', label:'Republic Offer', emoji:'🏷️', description:'Patriotic sale campaign'}] },
  { id:'constitution_day', name:'Constitution Day', date:'2026-09-19', type:'national', emoji:'📜', angles:[{id:'pride', label:'National Pride', emoji:'🇳🇵', description:'Celebrate our constitution'}] },
  { id:'democracy_day', name:'National Democracy Day', date:'2026-02-19', type:'national', emoji:'🕊️', angles:[{id:'pride', label:'Democracy Day', emoji:'🇳🇵', description:'Celebrate democracy'}] },
  { id:'majdoor_divas', name:'Majdoor Divas', date:'2026-05-01', type:'national', emoji:'🛠️', angles:[{id:'team', label:'Team Spotlight', emoji:'👥', description:'Showcase your hardworking team'}] },
  
  // HINDU & MAJOR
  { id:'maghe_sankranti', name:'Maghe Sankranti', date:'2026-01-15', type:'hindu', emoji:'🍠', angles:[{id:'warmth', label:'Warmth & Health', emoji:'☀️', description:'Healthy winter treats'},{id:'fresh_start', label:'New Season', emoji:'🌱', description:'Welcome warmer days'}] },
  { id:'shivaratri', name:'Maha Shivaratri', date:'2026-02-15', type:'hindu', emoji:'🔱', angles:[{id:'power', label:'Strength & Power', emoji:'💪', description:'Channel inner strength'},{id:'spiritual', label:'Spiritual Connection', emoji:'🕉️', description:'Connect with the divine'}] },
  { id:'fagu_purnima', name:'Fagu Purnima (Holi)', date:'2026-03-02', type:'hindu', emoji:'🎨', angles:[{id:'colors', label:'Festival of Colors', emoji:'🌈', description:'Vibrant celebrations'},{id:'offer', label:'Holi Special', emoji:'🏷️', description:'Colorful discounts'}] },
  { id:'ram_navami', name:'Ram Navami', date:'2026-03-27', type:'hindu', emoji:'🙏', angles:[{id:'blessings', label:'Divine Blessings', emoji:'✨', description:'Auspicious day post'}] },
  { id:'buddha_jayanti', name:'Buddha Jayanti', date:'2026-05-01', type:'hindu', emoji:'🕊️', angles:[{id:'peace', label:'Peace & Harmony', emoji:'🌸', description:'Spread peace and calm'}] },
  { id:'rakshya_bandhan', name:'Janai Purnima / Rakhi', date:'2026-08-28', type:'hindu', emoji:'🧵', angles:[{id:'bond', label:'Sibling Bond', emoji:'👫', description:'Celebrate the bond of love'},{id:'offer', label:'Special Offer', emoji:'🏷️', description:'Festival discount'}] },
  { id:'krishna_janmashtami', name:'Krishna Janmashtami', date:'2026-09-04', type:'hindu', emoji:'🦚', angles:[{id:'joy', label:'Joy & Celebration', emoji:'✨', description:'Festive joy and mischief'}] },
  { id:'teej', name:'Hartalika Teej', date:'2026-09-14', type:'hindu', emoji:'💃', angles:[{id:'women', label:'Women Empowerment', emoji:'🌺', description:'Celebrate womanhood'},{id:'offer', label:'Teej Special', emoji:'🏷️', description:'Discounts for women'}] },
  
  // DASHAIN
  { id:'dashain_ghatasthapana', name:'Ghatasthapana', date:'2026-10-11', type:'hindu', emoji:'🌱', angles:[{id:'blessings', label:'Dashain Begins', emoji:'🙏', description:'Welcome Dashain'}] },
  { id:'dashain_phulpati', name:'Phulpati', date:'2026-10-17', type:'hindu', emoji:'🌿', angles:[{id:'cultural', label:'Cultural Tradition', emoji:'🌸', description:'Bringing the sacred flowers'}] },
  { id:'dashain_ashtami', name:'Maha Ashtami', date:'2026-10-19', type:'hindu', emoji:'🐐', angles:[{id:'power', label:'Strength & Devotion', emoji:'💪', description:'Worship of Goddess Durga'}] },
  { id:'dashain_navami', name:'Maha Navami', date:'2026-10-20', type:'hindu', emoji:'⚔️', angles:[{id:'blessings', label:'Divine Blessings', emoji:'🙏', description:'Final day of Navratri'}] },
  { id:'dashain', name:'Bijaya Dashami (Tika)', date:'2026-10-21', type:'hindu', emoji:'🌾', angles:[{id:'family', label:'Family Reunion', emoji:'👨‍👩‍👧‍👦', description:'Celebrate with loved ones'},{id:'offer', label:'Dashain Dhamaka', emoji:'🏷️', description:'Biggest sale of the year'}] },
  
  // TIHAR & CHHATH
  { id:'tihar_laxmi', name:'Laxmi Puja (Tihar)', date:'2026-11-08', type:'hindu', emoji:'🪔', angles:[{id:'light', label:'Festival of Lights', emoji:'✨', description:'Illuminate your life'},{id:'offer', label:'Tihar Offer', emoji:'🏷️', description:'Festive discount'}] },
  { id:'tihar_govardhan', name:'Gobhardan Pujan', date:'2026-11-09', type:'hindu', emoji:'🐮', angles:[{id:'culture', label:'Nature & Culture', emoji:'🌿', description:'Celebrate nature'}] },
  { id:'tihar_bhai_tika', name:'Bhai Tika', date:'2026-11-10', type:'hindu', emoji:'👫', angles:[{id:'siblings', label:'Sibling Love', emoji:'❤️', description:'Celebrate sibling bond'}] },
  { id:'chhath', name:'Chhat Parwa', date:'2026-11-15', type:'hindu', emoji:'🌅', angles:[{id:'devotion', label:'Purity & Devotion', emoji:'🙏', description:'Sun god worship'}] },
  
  // REGIONAL / ETHNIC
  { id:'sonam_lhosar', name:'Sonam Losar', date:'2026-01-19', type:'regional', emoji:'🐉', angles:[{id:'new_year', label:'Tamang New Year', emoji:'🎊', description:'Celebrate new beginnings'}] },
  { id:'gyalpo_lhosar', name:'Gyalpo Losar', date:'2026-02-18', type:'regional', emoji:'🏔️', angles:[{id:'new_year', label:'Sherpa New Year', emoji:'🎊', description:'Celebrate new beginnings'}] },
  { id:'godhe_yatra', name:'Godhe Yatra', date:'2026-03-18', type:'regional', emoji:'🐎', angles:[{id:'culture', label:'Kathmandu Festival', emoji:'🏰', description:'Tradition and culture'}] },
  { id:'ubhauli_parva', name:'Ubhauli Parva', date:'2026-05-01', type:'regional', emoji:'🥁', angles:[{id:'harvest', label:'Kirat Festival', emoji:'🌾', description:'Celebrate the season'}] },
  { id:'gai_jatra', name:'Gai Jatra', date:'2026-08-29', type:'regional', emoji:'🐄', angles:[{id:'culture', label:'Remembrance & Joy', emoji:'✨', description:'Honoring loved ones'}] },
  { id:'gaura_parba', name:'Gaura Parba', date:'2026-09-04', type:'regional', emoji:'🌿', angles:[{id:'culture', label:'Sudurpaschim Pride', emoji:'🏔️', description:'Regional celebration'}] },
  { id:'jitiya_parwa', name:'Jitiya Parwa', date:'2026-10-04', type:'regional', emoji:'🌅', angles:[{id:'culture', label:'Mithila Festival', emoji:'🌸', description:'Fasting and blessings'}] },
  { id:'phalgunanda_jayanti', name:'Phalgunanda Jayanti', date:'2026-11-11', type:'regional', emoji:'🕊️', angles:[{id:'respect', label:'Tribute', emoji:'🙏', description:'Respectful post'}] },
  { id:'tamu_lhosar', name:'Tamu Lhosar', date:'2026-12-30', type:'regional', emoji:'🎉', angles:[{id:'new_year', label:'Gurung New Year', emoji:'🎊', description:'Celebrate new beginnings'}] },
  
  // MUSLIM & CHRISTIAN
  { id:'ramadan_start_np', name:'Ramadan Starts', date:'2026-02-19', type:'muslim', emoji:'🌙', angles:[{id:'wishes', label:'Ramadan Mubarak', emoji:'🌙', description:'Holy month wishes'}] },
  { id:'eid_fitr_np', name:'Ramjan Edul Fikra', date:'2026-03-20', type:'muslim', emoji:'🌙', angles:[{id:'celebration', label:'Eid Mubarak', emoji:'✨', description:'Celebratory Eid campaign'}] },
  { id:'eid_adha_np', name:'Edul Aajaha', date:'2026-05-27', type:'muslim', emoji:'🐑', angles:[{id:'celebration', label:'Eid Mubarak', emoji:'🌙', description:'Festival celebration post'}] },
  { id:'christmas_np', name:'Christmas Day', date:'2026-12-25', type:'christian', emoji:'🎄', angles:[{id:'joy', label:'Merry Christmas', emoji:'🎁', description:'Festive cheer'}] },
  
  // COMMERCE
  { id:'nari_dibas', name:'Nari Dibas (Women\'s Day)', date:'2026-03-08', type:'commerce', emoji:'💜', angles:[{id:'empowerment', label:'Empowerment', emoji:'💪', description:"Celebrate women's strength"},{id:'offer', label:"Women's Day Special", emoji:'🏷️', description:'Special discount'}] },
  { id:'valentines_commerce', name:"Valentine's Day", date:'2026-02-14', type:'commerce', emoji:'❤️', angles:[{id:'gift', label:'Gift Angle', emoji:'🎁', description:"Perfect Valentine's gift"}] },
];

export const FestivalCalendar: React.FC<Props> = ({ brand = {}, language = 'english', isSaas = false, onGenerate, products }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<'all' | FestivalType>('all');
  const [selected, setSelected] = useState<Festival | null>(null);
  const [angleId, setAngleId] = useState<string>('');
  const [postType, setPostType] = useState<'Static Ad' | 'Story'>('Static Ad');
  const [lang, setLang] = useState<string>(language || 'english');

  React.useEffect(() => {
    if (brand?.country?.toLowerCase() === 'nepal') {
      if (lang !== 'english' && lang !== 'nepali') {
        setLang('english');
      }
    }
  }, [brand?.country, lang]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [imageCount, setImageCount] = useState<number>(1);
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [showProdModal, setShowProdModal] = useState<boolean>(false);
  // SaaS-only: campaign focus input (replaces product picker)
  const [campaignFocus, setCampaignFocus] = useState<string>('');

  const activeFestivals = useMemo(() => {
    const country = brand?.country?.toLowerCase();
    if (country === 'nepal') return FESTIVALS_NEPAL_2083;
    if (country === 'india') return FESTIVALS_2026;
    
    // For global users (not India/Nepal), hide Indian-specific categories
    return FESTIVALS_2026.filter((f) => !['hindu', 'regional', 'national'].includes(f.type));
  }, [brand?.country]);

  const filtered = useMemo(
    () => activeFestivals.filter((f) => filter === 'all' || f.type === filter),
    [filter, activeFestivals]
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Festival[]>();
    filtered.forEach((f) => {
      const k = f.date;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    });
    return m;
  }, [filtered]);

  const upcoming = useMemo(() => {
    return filtered
      .map((f) => ({ f, days: diffDays(parseDate(f.date), today) }))
      .filter(({ days }) => days >= 0 && days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [filtered]);

  // Build 6×7 grid
  const gridDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const openFestival = (f: Festival) => {
    // When isSaas, use SaaS-specific angles instead of D2C ones
    setSelected(isSaas ? { ...f, angles: getSaasAngles(f.id) } : f);
    const angles = isSaas ? getSaasAngles(f.id) : f.angles;
    setAngleId(angles[0].id);
    setPostType('Static Ad');
    setLang(language);
    setSelectedProductId('');
    setCampaignFocus('');
    setImageCount(1);
    setCustomInstruction('');
  };

  const selectedAngle = selected?.angles.find((a) => a.id === angleId) || selected?.angles[0];
  const chosenProduct = products?.find((p) => p._id === selectedProductId);

  const buildPrompt = () => {
    if (!selected || !selectedAngle) return '';

    if (isSaas) {
      // ── SaaS mode prompt ────────────────────────────────────────────────
      const brandDna = `BRAND DNA:
- Brand Name: ${brand.brandName || 'Your Brand'}
- Business Category: ${brand.businessCategory || 'SaaS & Digital'}
- Brand Tone: ${brand.brandTone || 'Professional & Direct'}
- Color Palette: Primary ${brand.primaryColor || '#2563eb'}, Secondary ${brand.secondaryColor || '#6366f1'}
- Visual Style: ${brand.visualStyle || 'Clean minimal B2B'}`;

      const saasDirective = `SAAS/SERVICES BRAND RULES:
- NO product packaging photography
- NO discount, sale, or urgency language
- NO lifestyle stock photos
- USE dashboard UI, workspace, data visuals, or clean typographic layouts
- Headlines must lead with outcomes, insights, or frameworks
- Tone: professional, B2B, thought-leadership focused`;

      const campaignInfo = `OCCASION: ${selected.name} ${selected.emoji}
CAMPAIGN ANGLE: ${selectedAngle.label} — ${selectedAngle.description}`;

      const focusInfo = campaignFocus.trim()
        ? `CAMPAIGN FOCUS / BRAND CONTEXT:\n${campaignFocus.trim()}`
        : '';

      const langInstr =
        lang === 'english' ? 'Write in clean professional English.'
        : lang === 'hinglish' ? 'Write in Hinglish — mix Hindi words naturally with an English base. Professional B2B tone.'
        : 'Write entirely in Hindi using Devanagari script. Maintain professional tone.';

      const customInstrLine = customInstruction.trim()
        ? `CUSTOM INSTRUCTIONS:\n${customInstruction.trim()}`
        : '';

      const creativePrompt = `CREATIVE BRIEF:
Create a premium B2B brand post for ${selected.name}.
Angle: ${selectedAngle.label} — ${selectedAngle.description}.
Visual: Use clean professional workspace photography, UI dashboards, data charts, or elegant typographic layouts in brand colors.
No product shots. No sale badges. No discount copy.
Post type: ${postType}.
${langInstr}`;

      return [brandDna, saasDirective, campaignInfo, focusInfo, customInstrLine, creativePrompt]
        .filter(Boolean)
        .join('\n\n');
    }

    // ── D2C / original mode prompt ────────────────────────────────────────
    const brandDna = `BRAND DNA:
- Brand Name: ${brand.brandName || 'Your Brand'}
- Business Category: ${brand.businessCategory || 'D2C'}
- Brand Tone: ${brand.brandTone || 'warm & confident'}
- Color Palette: Primary ${brand.primaryColor || '#2563eb'}, Secondary ${brand.secondaryColor || '#f59e0b'}
- Visual Style: ${brand.visualStyle || 'modern premium'}`;

    // 2. PRODUCT DETAILS
    const chosenProduct = products?.find((p) => p._id === selectedProductId);
    const productDna = chosenProduct
      ? `PRODUCT DETAILS:
- Name: ${chosenProduct.name}
- Price: ${chosenProduct.offerPrice || chosenProduct.price || 'N/A'}
- Key Benefit: ${chosenProduct.keyBenefit || 'N/A'}
- Description: ${chosenProduct.description || 'N/A'}`
      : `PRODUCT DETAILS: Flagship product / general brand presence`;

    // 3. CAMPAIGN ANGLE
    const campaignAngle = `CAMPAIGN ANGLE:
- Festival: ${selected.name} ${selected.emoji}
- Concept: ${selectedAngle.label}
- Description: ${selectedAngle.description}`;

    // 4. POST TYPE & LANGUAGE
    const langInstr =
      lang === 'english' ? 'Write in clean professional English.'
      : lang === 'hinglish' ? 'Write in Hinglish — mix Hindi words naturally. Casual warm tone.'
      : lang === 'hindi' ? 'Write entirely in Hindi using Devanagari script.'
      : `Write entirely in ${languages.find(l => l.id === lang)?.label.split(' ')[0] || lang} script.`;
      
    const postTypeAndLang = `POST TYPE: ${postType}
LANGUAGE INSTRUCTION: ${langInstr}`;

    // 5. INSTRUCTION (Optional Instruction Box)
    const customInstrLine = customInstruction.trim()
      ? `CUSTOM INSTRUCTIONS:\n${customInstruction.trim()}`
      : '';

    // 6. ACTUAL CREATIVE PROMPT
    const angleLine =
      selectedAngle.id === 'offer' ? 'Include discount/offer messaging. Create urgency.'
      : selectedAngle.id === 'emotional' ? 'Warm, celebratory, emotional. No hard sell.'
      : selectedAngle.id === 'gift' ? `Position product as the perfect ${selected.name} gift.`
      : `Lean into the "${selectedAngle.label}" angle — ${selectedAngle.description}.`;

    const actualPrompt = `ACTUAL CREATIVE PROMPT:
Create a high-converting ${selected.name} ${selectedAngle.label} ad creative.
Set in a ${selected.name} festival theme for an Indian audience.
${angleLine}
Ensure a clean layout, ${brand.visualStyle || 'modern premium'} aesthetic, and bold readable text.`;

    // Combine all sections clearly
    return `${brandDna}\n\n${productDna}\n\n${campaignAngle}\n\n${postTypeAndLang}${customInstrLine ? `\n\n${customInstrLine}` : ''}\n\n${actualPrompt}`;
  };

  const prompt = buildPrompt();

  return (
    <div className="w-full">
      {/* Upcoming strip */}
      {upcoming.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coming up</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {upcoming.map(({ f, days }) => (
              <button
                key={f.id + f.date}
                onClick={() => openFestival(f)}
                className="shrink-0 px-3 py-2 rounded-xl bg-card border border-border/60 hover:border-primary/50 transition flex items-center gap-2"
                style={{ borderLeftColor: TYPE_COLORS[f.type], borderLeftWidth: 3 }}
              >
                <span className="text-base leading-none">{f.emoji}</span>
                <span className="text-xs font-semibold text-foreground">{f.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 rounded-xl hover:bg-muted transition"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base sm:text-lg font-display font-bold text-foreground min-w-[160px] text-center">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h2>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 rounded-xl hover:bg-muted transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
        >
          Today
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-semibold transition border',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-foreground border-border hover:border-primary/40'
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/40">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const fests = byDate.get(key) || [];
            const visible = fests.slice(0, 2);
            const overflow = fests.length - visible.length;

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[78px] sm:min-h-[92px] p-1.5 border-t border-l border-border/40 relative',
                  i % 7 === 6 && 'border-r-0',
                  !inMonth && 'bg-muted/20',
                  isPast && 'opacity-60'
                )}
              >
                <div className={cn('flex items-center justify-end mb-1')}>
                  <span
                    className={cn(
                      'text-[11px] font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                      !inMonth && 'text-muted-foreground/60'
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {visible.map((f) => {
                    const days = diffDays(parseDate(f.date), today);
                    const pulse = days >= 0 && days <= 7;
                    return (
                      <button
                        key={f.id}
                        onClick={() => openFestival(f)}
                        className={cn(
                          'w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-white truncate flex items-center gap-1 hover:opacity-90 transition',
                          pulse && 'animate-pulse'
                        )}
                        style={{ backgroundColor: TYPE_COLORS[f.type] }}
                        title={f.name}
                      >
                        <span>{f.emoji}</span>
                        <span className="truncate">{f.name}</span>
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[9px] font-semibold text-muted-foreground px-1">+{overflow} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && selectedAngle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/60"
            >
              <div
                className="p-5 sm:p-6 rounded-t-3xl text-white flex items-start justify-between"
                style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[selected.type]}, ${TYPE_COLORS[selected.type]}CC)` }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{selected.emoji}</div>
                  <div>
                    <h3 className="text-xl font-display font-bold">{selected.name}</h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {parseDate(selected.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {TYPE_LABELS[selected.type]}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/15 transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Campaign angle</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {selected.angles.map((a) => {
                      const active = angleId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setAngleId(a.id)}
                          className={cn(
                            'p-3 rounded-xl border text-left transition',
                            active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/40'
                          )}
                        >
                          <div className="text-lg mb-1">{a.emoji}</div>
                          <p className="text-xs font-semibold text-foreground">{a.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{a.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Post type</p>
                    <div className="flex gap-1.5">
                      {(['Static Ad', 'Story'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPostType(t)}
                          className={cn(
                            'flex-1 px-2 py-2 rounded-lg text-[11px] font-semibold border transition',
                            postType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Language</p>
                    <div className="relative">
                      <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold bg-card border-border border hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary transition cursor-pointer appearance-none"
                      >
                        {(() => {
                          const available = brand?.country?.toLowerCase() === 'nepal'
                            ? [
                                { id: 'english', label: 'English', flag: '🇬🇧' },
                                { id: 'nepali', label: 'Nepali (नेपाली)', flag: '🇳🇵' }
                              ]
                            : languages.filter(l => l.id !== 'nepali');
                          return available.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.flag} {l.label}
                            </option>
                          ));
                        })()}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Campaign Focus (SaaS) OR Product Picker (D2C) */}
                  {isSaas ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Campaign focus (optional)</p>
                      <div className="h-20 flex items-center">
                        <textarea
                          value={campaignFocus}
                          onChange={(e) => setCampaignFocus(e.target.value)}
                          placeholder={`e.g. "We just crossed 500 clients" or "Launching our new automation feature"`}
                          className="w-full h-full p-3 rounded-xl border border-border/60 bg-card text-xs text-foreground resize-none leading-normal focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Choose product (optional)</p>
                      {chosenProduct ? (
                        <div
                          onClick={() => setShowProdModal(true)}
                          className="h-20 flex items-center justify-between px-3 py-2 border border-primary bg-primary/5 ring-1 ring-primary rounded-2xl cursor-pointer relative overflow-hidden group transition duration-200"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {chosenProduct.imageBase64 ? (
                              <img src={imgSrc(chosenProduct.imageBase64)} className="w-10 h-10 rounded-lg object-contain bg-white border border-border/40 shrink-0" alt="" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package size={16} className="text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-foreground truncate w-full">{chosenProduct.name}</p>
                              <p className="text-[9px] text-muted-foreground/80 uppercase tracking-widest">{chosenProduct.price ? `$${chosenProduct.price}` : 'Product'}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductId('');
                            }}
                            className="w-5 h-5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground flex items-center justify-center shrink-0 transition"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setShowProdModal(true)}
                          className="h-20 flex flex-col items-center justify-center p-3 border border-border/60 hover:border-primary/40 bg-card rounded-2xl cursor-pointer relative overflow-hidden group transition duration-200 text-center"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition duration-200">
                            <ShoppingBag size={13} />
                          </div>
                          <p className="text-xs font-bold text-foreground">Product Catalog</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Select store product</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image Count Selector */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Number of images</p>
                    <div className="flex gap-2 h-20 items-center">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setImageCount(n)}
                          className={cn(
                            'flex-1 h-10 py-2 rounded-xl text-xs font-semibold transition border',
                            imageCount === n
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25'
                              : 'bg-card border-border text-foreground hover:border-primary/40'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>


                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Optional instructions</p>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="e.g. Focus on premium lighting, cinematic shadows, and a clean layout."
                    className="w-full min-h-[72px] p-3 rounded-xl border border-border/60 bg-card text-xs text-foreground resize-none leading-normal focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  onClick={() => {
                    const finalPrompt = buildPrompt();
                    const chosenProduct = products?.find((p) => p._id === selectedProductId);
                    onGenerate?.({
                      prompt: finalPrompt,
                      postType,
                      festival: selected,
                      product: chosenProduct,
                      imageCount,
                      customInstruction,
                      language: lang,
                    });
                    setSelected(null);
                  }}
                  size="lg"
                  className="w-full h-12 rounded-2xl text-sm font-bold gap-2 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Sparkles size={16} /> Generate Creative
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Product Selection Modal inside Festival Modal ─── */}
      <AnimatePresence>
        {showProdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowProdModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag size={18} className="text-primary" /> Select Product
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pick a product to anchor your festival creative generation.
                  </p>
                </div>
                <button onClick={() => setShowProdModal(false)} className="p-2 rounded-xl hover:bg-muted transition">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {(!products || products.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No products available in catalog.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((p) => {
                      const selected = selectedProductId === p._id;
                      return (
                        <button
                          key={p._id}
                          onClick={() => {
                            setSelectedProductId(p._id);
                            setShowProdModal(false);
                          }}
                          className={cn(
                            'text-left relative p-3 rounded-2xl border transition overflow-hidden bg-card hover:bg-muted/30',
                            selected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border'
                          )}
                        >
                          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative">
                            {p.imageBase64 ? (
                              <img src={imgSrc(p.imageBase64)} alt={p.name} className="w-full h-full object-contain p-2" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="text-muted-foreground/30" />
                              </div>
                            )}
                            {selected && (
                              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-sm">
                                <CheckCircle2 size={12} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-bold text-foreground leading-tight truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5 uppercase tracking-wider font-semibold">
                            {p.price ? `₹${p.price}` : 'Catalog'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-border/50 shrink-0 flex items-center justify-end">
                <Button onClick={() => setShowProdModal(false)} className="rounded-xl px-6">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FestivalCalendar;
