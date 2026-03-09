// SERP History Chart Component - Visualize SERP position and feature changes over time
'use client';

import { SerpHistory } from '@prisma/client';
import { Card } from './ui/card';

interface SerpHistoryChartProps {
  history: SerpHistory[];
  className?: string;
}

export function SerpHistoryChart({ history, className = '' }: SerpHistoryChartProps) {
  if (history.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <p className="text-sm text-gray-500">No history data available</p>
      </Card>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.checkDate).getTime() - new Date(b.checkDate).getTime()
  );

  // Find min and max position for scaling
  const positions = sortedHistory
    .map(h => h.positionAfter)
    .filter((p): p is number => p !== null);

  const minPosition = Math.min(...positions, 1);
  const maxPosition = Math.max(...positions, 10);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">SERP Position History</h3>

      <div className="space-y-4">
        {/* Timeline */}
        <div className="relative">
          {/* Position line */}
          <div className="absolute left-16 right-0 top-1/2 h-0.5 bg-gray-200 -translate-y-1/2" />

          {/* Data points */}
          <div className="relative space-y-4">
            {sortedHistory.map((item, idx) => {
              const date = new Date(item.checkDate);
              const position = item.positionAfter;
              const positionPercent = position
                ? ((maxPosition - position) / (maxPosition - minPosition)) * 80 + 10
                : 90;

              const changeColor =
                item.impact === 'POSITIVE'
                  ? 'bg-green-500'
                  : item.impact === 'NEGATIVE'
                  ? 'bg-red-500'
                  : 'bg-gray-400';

              return (
                <div key={item.id} className="flex items-center gap-4">
                  {/* Date */}
                  <div className="w-14 text-right text-sm text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Position indicator */}
                  <div
                    className="relative w-4 h-4 rounded-full border-2 border-white shadow-md z-10"
                    style={{
                      backgroundColor: changeColor,
                      marginTop: `${positionPercent}%`,
                    }}
                  />

                  {/* Details */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {position ? (
                          <span className="font-semibold text-gray-900">Position: {position}</span>
                        ) : (
                          <span className="text-gray-400">Not found</span>
                        )}
                        {item.positionChange !== null && item.positionChange !== 0 && (
                          <span
                            className={`text-sm ${
                              item.positionChange > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {item.positionChange > 0 ? '↑' : '↓'} {Math.abs(item.positionChange)}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          item.impact === 'POSITIVE'
                            ? 'bg-green-100 text-green-800'
                            : item.impact === 'NEGATIVE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.changeType}
                      </span>
                    </div>

                    {/* Feature changes */}
                    {(item.featuresAdded.length > 0 || item.featuresRemoved.length > 0) && (
                      <div className="mt-2 text-sm">
                        {item.featuresAdded.length > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <span>+</span>
                            <span>{item.featuresAdded.join(', ')}</span>
                          </div>
                        )}
                        {item.featuresRemoved.length > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <span>-</span>
                            <span>{item.featuresRemoved.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Featured snippet changes */}
                    {item.gainedSnippet && (
                      <div className="mt-2 text-sm text-green-600">
                        ⭐ Featured snippet gained
                      </div>
                    )}
                    {item.lostSnippet && (
                      <div className="mt-2 text-sm text-red-600">
                        ⭐ Featured snippet lost
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
