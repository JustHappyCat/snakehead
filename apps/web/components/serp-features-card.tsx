// SERP Features Card Component - Display SERP features for a page
import { SerpFeature } from '@/lib/serp-api';
import { SerpBadges } from './serp-badge';
import { Card } from './ui/card';

interface SerpFeaturesCardProps {
  query: string;
  features: SerpFeature[];
  position?: number;
  isFeatured?: boolean;
  isTopResult?: boolean;
  featuredSnippet?: any;
  localPack?: any;
  knowledgePanel?: any;
  className?: string;
}

export function SerpFeaturesCard({
  query,
  features,
  position,
  isFeatured,
  isTopResult,
  featuredSnippet,
  localPack,
  knowledgePanel,
  className = '',
}: SerpFeaturesCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Query and Position */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Search Query</h3>
            <p className="text-lg font-semibold text-gray-900">{query}</p>
          </div>
          {position && (
            <div className="text-right">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Position</h3>
              <p className="text-2xl font-bold text-gray-900">
                #{position}
              </p>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {isFeatured && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              ⭐ Featured Snippet
            </span>
          )}
          {isTopResult && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              🏆 Top 3 Result
            </span>
          )}
        </div>

        {/* SERP Features */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">SERP Features Detected</h3>
          {features.length > 0 ? (
            <SerpBadges features={features} maxDisplay={10} />
          ) : (
            <p className="text-sm text-gray-400">No special SERP features detected</p>
          )}
        </div>

        {/* Featured Snippet Details */}
        {featuredSnippet && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Featured Snippet</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">{featuredSnippet.content}</p>
              <p className="text-xs text-purple-600 mt-2">Source: {featuredSnippet.sourceUrl}</p>
            </div>
          </div>
        )}

        {/* Local Pack Details */}
        {localPack && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Local Pack</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                {localPack.businessCount} businesses listed
              </p>
              <ul className="space-y-2">
                {localPack.topBusinesses.slice(0, 3).map((business: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 font-medium">{idx + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900">{business.name}</p>
                      <p className="text-gray-600">
                        ⭐ {business.rating} ({business.reviewCount} reviews)
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Knowledge Panel Details */}
        {knowledgePanel && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Knowledge Panel</h3>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-lg font-semibold text-gray-900">{knowledgePanel.entityName}</p>
              <p className="text-sm text-gray-600 mb-2">{knowledgePanel.entityType}</p>
              <p className="text-sm text-gray-700">{knowledgePanel.description}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
