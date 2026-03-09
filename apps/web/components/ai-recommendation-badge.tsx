'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface AIRecommendation {
  id: string;
  issueId: string;
  recommendation: string;
  actionableSteps: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  cost: number;
  cached: boolean;
  createdAt: Date;
}

export interface AIRecommendationBadgeProps {
  recommendation: AIRecommendation;
  issueUrl?: string;
}

export function AIRecommendationBadge({
  recommendation,
  issueUrl,
}: AIRecommendationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const priorityLabels = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const handleCopy = async () => {
    try {
      const textToCopy = `AI Recommendation for ${issueUrl || 'this issue'}:\n\n${recommendation.recommendation}\n\nActionable Steps:\n${recommendation.actionableSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nEstimated Impact: ${recommendation.estimatedImpact}`;
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPriorityBadgeVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="ai-recommendation-badge mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Recommendation
        </Badge>
        {recommendation.cached && (
          <Badge variant="secondary" className="text-xs">
            Cached
          </Badge>
        )}
        <Badge variant={getPriorityBadgeVariant(recommendation.priority)} className="text-xs">
          {priorityLabels[recommendation.priority]} Priority
        </Badge>
        <span className="text-xs text-gray-500 ml-auto">
          Confidence: {Math.round(recommendation.confidence * 100)}%
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm mb-3">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">AI-Generated Fix</CardTitle>
              <CardDescription className="mt-1">
                {recommendation.recommendation}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="ml-2"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4">
            {/* Actionable Steps */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full" />
                Actionable Steps
              </h4>
              <ul className="space-y-2">
                {recommendation.actionableSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Estimated Impact */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2 text-blue-800">
                <span className="w-1 h-4 bg-blue-500 rounded-full" />
                Estimated Impact
              </h4>
              <p className="text-sm text-blue-700">
                {recommendation.estimatedImpact}
              </p>
            </div>

            {/* Meta Information */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
              <div className="flex justify-between">
                <span>Model: {recommendation.model}</span>
                <span>Tokens: {recommendation.tokensUsed}</span>
              </div>
              <div className="flex justify-between">
                <span>Cost: ${recommendation.cost.toFixed(4)}</span>
                <span>
                  Created: {new Date(recommendation.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Copy Button */}
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Recommendation
                </>
              )}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Loading state component
export function AIRecommendationLoading() {
  return (
    <div className="ai-recommendation-loading mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Recommendation
        </Badge>
      </div>
      <Card className="border-purple-200">
        <CardContent className="py-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-purple-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Generating AI recommendation...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error state component
export function AIRecommendationError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ai-recommendation-error mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Recommendation
        </Badge>
      </div>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 mb-3">{message}</p>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Empty state component
export function AIRecommendationEmpty() {
  return (
    <div className="ai-recommendation-empty mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Recommendation
        </Badge>
      </div>
      <Card className="border-gray-200">
        <CardContent className="py-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            No AI recommendation available for this issue.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click the button below to generate one.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
