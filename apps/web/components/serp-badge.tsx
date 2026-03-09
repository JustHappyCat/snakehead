// SERP Feature Badge Component - Display SERP features as badges
import { SerpFeature } from '@/lib/serp-api';

interface SerpBadgeProps {
  feature: SerpFeature;
  className?: string;
}

const featureConfig: Record<SerpFeature, { label: string; color: string; icon: string }> = {
  FEATURED_SNIPPET: { label: 'Featured Snippet', color: 'bg-purple-100 text-purple-800', icon: '⭐' },
  LOCAL_PACK: { label: 'Local Pack', color: 'bg-blue-100 text-blue-800', icon: '📍' },
  KNOWLEDGE_PANEL: { label: 'Knowledge Panel', color: 'bg-indigo-100 text-indigo-800', icon: '📚' },
  IMAGE_PACK: { label: 'Image Pack', color: 'bg-green-100 text-green-800', icon: '🖼️' },
  VIDEO_PACK: { label: 'Video Pack', color: 'bg-red-100 text-red-800', icon: '🎥' },
  PEOPLE_ALSO_ASK: { label: 'People Also Ask', color: 'bg-yellow-100 text-yellow-800', icon: '❓' },
  RELATED_SEARCHES: { label: 'Related Searches', color: 'bg-gray-100 text-gray-800', icon: '🔍' },
  TOP_STORIES: { label: 'Top Stories', color: 'bg-orange-100 text-orange-800', icon: '📰' },
  SHOPPING_RESULTS: { label: 'Shopping Results', color: 'bg-pink-100 text-pink-800', icon: '🛒' },
  SITELINKS: { label: 'Sitelinks', color: 'bg-teal-100 text-teal-800', icon: '🔗' },
  REVIEWS: { label: 'Reviews', color: 'bg-cyan-100 text-cyan-800', icon: '⭐' },
  RATING_STARS: { label: 'Rating Stars', color: 'bg-amber-100 text-amber-800', icon: '⭐' },
  FAQ_SCHEMA: { label: 'FAQ Schema', color: 'bg-lime-100 text-lime-800', icon: '❓' },
  EVENT_SCHEMA: { label: 'Event Schema', color: 'bg-violet-100 text-violet-800', icon: '📅' },
  PRODUCT_SCHEMA: { label: 'Product Schema', color: 'bg-rose-100 text-rose-800', icon: '🏷️' },
  RECIPE_SCHEMA: { label: 'Recipe Schema', color: 'bg-emerald-100 text-emerald-800', icon: '🍳' },
  HOW_TO_SCHEMA: { label: 'How-To Schema', color: 'bg-sky-100 text-sky-800', icon: '📝' },
  JOB_LISTINGS: { label: 'Job Listings', color: 'bg-fuchsia-100 text-fuchsia-800', icon: '💼' },
  FINANCE_BOX: { label: 'Finance Box', color: 'bg-slate-100 text-slate-800', icon: '💰' },
  CALCULATOR: { label: 'Calculator', color: 'bg-zinc-100 text-zinc-800', icon: '🧮' },
  CONVERTER: { label: 'Converter', color: 'bg-stone-100 text-stone-800', icon: '🔄' },
  FLIGHT_BOX: { label: 'Flight Box', color: 'bg-neutral-100 text-neutral-800', icon: '✈️' },
  HOTEL_PACK: { label: 'Hotel Pack', color: 'bg-orange-100 text-orange-800', icon: '🏨' },
  NONE: { label: 'No Features', color: 'bg-gray-100 text-gray-800', icon: '➖' },
};

export function SerpBadge({ feature, className = '' }: SerpBadgeProps) {
  const config = featureConfig[feature] || featureConfig.NONE;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}
      title={config.label}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

interface SerpBadgesProps {
  features: SerpFeature[];
  maxDisplay?: number;
  className?: string;
}

export function SerpBadges({ features, maxDisplay = 5, className = '' }: SerpBadgesProps) {
  const displayFeatures = features.slice(0, maxDisplay);
  const remainingCount = features.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displayFeatures.map(feature => (
        <SerpBadge key={feature} feature={feature} />
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
