// SERP Recommendations Display Component - Display SERP optimization recommendations
'use client';

import { SerpRecommendation } from '@/lib/serp-recommendations';
import { Card } from './ui/card';

interface SerpRecommendationsProps {
  recommendations: SerpRecommendation[];
  className?: string;
}

const priorityConfig = {
  critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🟠' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🟡' },
  low: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '⚪' },
};

const typeConfig = {
  content: { label: 'Content', color: 'bg-blue-50 text-blue-700' },
  technical: { label: 'Technical', color: 'bg-purple-50 text-purple-700' },
  'off-page': { label: 'Off-Page', color: 'bg-green-50 text-green-700' },
  schema: { label: 'Schema', color: 'bg-indigo-50 text-indigo-700' },
};

const effortConfig = {
  quick: { label: 'Quick Win', color: 'bg-green-100 text-green-800' },
  moderate: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
  significant: { label: 'Significant', color: 'bg-red-100 text-red-800' },
};

export function SerpRecommendations({ recommendations, className = '' }: SerpRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <p className="text-sm text-gray-500">No recommendations available</p>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">
        Recommendations ({recommendations.length})
      </h3>

      {recommendations.map(rec => {
        const priority = priorityConfig[rec.priority];
        const type = typeConfig[rec.type];
        const effort = effortConfig[rec.estimatedEffort];

        return (
          <Card key={rec.id} className={`p-5 border-l-4 ${priority.color}`}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{priority.icon}</span>
                    <h4 className="text-base font-semibold text-gray-900">{rec.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${type.color}`}>
                    {type.label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${effort.color}`}>
                    {effort.label}
                  </span>
                </div>
              </div>

              {/* Expected Impact */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Expected Impact:</span> {rec.expectedImpact}
                </p>
              </div>

              {/* Action Items */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Action Items:</h5>
                <ul className="space-y-1">
                  {rec.actionItems.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              {rec.resources && rec.resources.length > 0 && (
                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Resources:</h5>
                  <div className="flex flex-wrap gap-2">
                    {rec.resources.map((resource, resIdx) => (
                      <a
                        key={resIdx}
                        href={resource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Learn more
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
