// SERP Features Page - Full page for analyzing SERP features for crawled pages
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SerpBadges } from '@/components/serp-badge';
import { SerpFeaturesCard } from '@/components/serp-features-card';
import { SerpHistoryChart } from '@/components/serp-history-chart';
import { SerpRecommendations } from '@/components/serp-recommendations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface SerpData {
  pageId: string;
  url: string;
  query: string;
  features: string[];
  position?: number;
  isFeatured: boolean;
  isTopResult: boolean;
  parsed?: any;
  recommendations?: any[];
  createdAt: string;
}

interface SerpHistory {
  id: string;
  checkDate: string;
  positionAfter?: number;
  positionChange?: number;
  featuresAdded: string[];
  featuresRemoved: string[];
  gainedSnippet: boolean;
  lostSnippet: boolean;
  changeType: string;
  impact: string;
}

export default function SerpFeaturesPage() {
  const params = useParams();
  const crawlId = params.id as string;

  const [serpData, setSerpData] = useState<SerpData[]>([]);
  const [selectedPage, setSelectedPage] = useState<SerpData | null>(null);
  const [history, setHistory] = useState<SerpHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryFilter, setQueryFilter] = useState('');
  const [useMock, setUseMock] = useState(true);

  useEffect(() => {
    fetchSerpData();
  }, [crawlId, useMock]);

  const fetchSerpData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/serp?crawlId=${crawlId}&useMock=${useMock}`
      );
      const data = await response.json();

      if (data.success) {
        setSerpData(data.results);
        if (data.results.length > 0) {
          setSelectedPage(data.results[0]);
          fetchHistory(data.results[0].pageId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch SERP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (pageId: string) => {
    try {
      const response = await fetch(`/api/serp/history?pageSerpDataId=${pageId}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to fetch SERP history:', error);
    }
  };

  const handlePageSelect = (page: SerpData) => {
    setSelectedPage(page);
    fetchHistory(page.pageId);
  };

  const filteredData = serpData.filter(
    item =>
      item.query.toLowerCase().includes(queryFilter.toLowerCase()) ||
      item.url.toLowerCase().includes(queryFilter.toLowerCase())
  );

  const summaryStats = {
    totalPages: serpData.length,
    pagesWithFeatures: serpData.filter(p => p.features.length > 0).length,
    featuredSnippets: serpData.filter(p => p.isFeatured).length,
    topResults: serpData.filter(p => p.isTopResult).length,
    avgPosition: calculateAveragePosition(serpData),
  };

  function calculateAveragePosition(data: SerpData[]): number {
    const positions = data
      .map(p => p.position)
      .filter((p): p is number => p !== null && p !== undefined);
    if (positions.length === 0) return 0;
    return Math.round(positions.reduce((sum, p) => sum + p, 0) / positions.length);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SERP Features</h1>
          <p className="text-gray-600">Analyze search engine results page features for your crawled pages</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={useMock ? 'default' : 'outline'}
            onClick={() => setUseMock(true)}
          >
            Mock Data
          </Button>
          <Button
            variant={!useMock ? 'default' : 'outline'}
            onClick={() => setUseMock(false)}
          >
            Live API
          </Button>
          <Button onClick={fetchSerpData}>Refresh</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Pages</p>
          <p className="text-2xl font-bold text-gray-900">{summaryStats.totalPages}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">With Features</p>
          <p className="text-2xl font-bold text-blue-600">{summaryStats.pagesWithFeatures}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Featured Snippets</p>
          <p className="text-2xl font-bold text-purple-600">{summaryStats.featuredSnippets}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Top 3 Results</p>
          <p className="text-2xl font-bold text-green-600">{summaryStats.topResults}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Avg Position</p>
          <p className="text-2xl font-bold text-gray-900">
            {summaryStats.avgPosition > 0 ? `#${summaryStats.avgPosition}` : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="mb-4">
              <Input
                placeholder="Filter by query or URL..."
                value={queryFilter}
                onChange={e => setQueryFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : filteredData.length === 0 ? (
                <p className="text-sm text-gray-500">No results found</p>
              ) : (
                filteredData.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePageSelect(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPage?.pageId === item.pageId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{item.query}</p>
                    <p className="text-xs text-gray-500 truncate">{item.url}</p>
                    <div className="mt-1">
                      <SerpBadges features={item.features as any} maxDisplay={3} />
                    </div>
                    {item.position && (
                      <p className="text-xs text-gray-600 mt-1">Position: #{item.position}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPage ? (
            <>
              {/* SERP Features Card */}
              <SerpFeaturesCard
                query={selectedPage.query}
                features={selectedPage.features as any}
                position={selectedPage.position}
                isFeatured={selectedPage.isFeatured}
                isTopResult={selectedPage.isTopResult}
                featuredSnippet={selectedPage.parsed?.featuredSnippet}
                localPack={selectedPage.parsed?.localPack}
                knowledgePanel={selectedPage.parsed?.knowledgePanel}
              />

{/* SERP History */}
              {history.length > 0 && <SerpHistoryChart history={history as any} />}

              {/* Recommendations */}
              {selectedPage.recommendations && selectedPage.recommendations.length > 0 && (
                <SerpRecommendations recommendations={selectedPage.recommendations} />
              )}
            </>
          ) : (
            <Card className="p-6">
              <p className="text-sm text-gray-500">Select a page to view SERP details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
