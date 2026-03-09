import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Search, Bug, Zap, HelpCircle } from 'lucide-react'

export default function UserGuidePage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">User Guide</h1>
        <p className="text-muted-foreground text-lg">
          Learn how to get the most out of snakehead
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link href="#getting-started" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <BookOpen className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <p className="text-sm text-muted-foreground">Create your account and set up your first crawl</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="#creating-crawls" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Search className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Creating Crawls</h3>
              <p className="text-sm text-muted-foreground">Configure and run website crawls</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="#understanding-results" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Understanding Results</h3>
              <p className="text-sm text-muted-foreground">Interpret crawl data and metrics</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="#issue-types" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Bug className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Issue Types</h3>
              <p className="text-sm text-muted-foreground">Common SEO issues and how to fix them</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="#faq" className="group">
          <Card className="h-full transition-all hover:shadow-md group-hover:border-primary">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <HelpCircle className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-semibold mb-2">FAQ</h3>
              <p className="text-sm text-muted-foreground">Answers to common questions</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="space-y-12">
        {/* Getting Started */}
        <section id="getting-started">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Getting Started
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">1. Account Creation</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>To get started with snakehead:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Visit our signup page and create an account</li>
                      <li>Verify your email address by clicking the link sent to your inbox</li>
                      <li>Log in with your email and password</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">2. Dashboard Overview</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>The dashboard provides an overview of your snakehead activity:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Recent Crawls:</strong> Your most recent crawl activities</li>
                      <li><strong>Quick Actions:</strong> Start a new crawl or view reports</li>
                      <li><strong>Usage Stats:</strong> Track crawl activity and discovered issues</li>
                      <li><strong>Navigation:</strong> Access all features from the sidebar</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">3. First Crawl</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>To run your first crawl:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>Click "New Crawl" from the dashboard</li>
                      <li>Enter your website's starting URL</li>
                      <li>Configure crawl settings (optional)</li>
                      <li>Click "Start Crawl"</li>
                      <li>Monitor progress in real-time</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Creating Crawls */}
        <section id="creating-crawls">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" />
                Creating Crawls
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">URL Input</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Enter the starting URL for your crawl:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Use the full URL including https://</li>
                      <li>The crawler will follow internal links from this page</li>
                      <li>Ensure the URL is publicly accessible</li>
                      <li>Check your robots.txt doesn't block our crawler</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Crawl Settings</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Configure your crawl with these options:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Max Pages:</strong> Limit the number of pages to crawl</li>
                      <li><strong>Max Depth:</strong> Control how deep the crawler follows links</li>
                      <li><strong>Follow External Links:</strong> Include or exclude external websites</li>
                      <li><strong>Crawl Speed:</strong> Adjust requests per second (be respectful!)</li>
                      <li><strong>User Agent:</strong> Identify your crawler to web servers</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Monitoring Progress</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>While crawling, you can monitor:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Pages discovered and processed</li>
                      <li>Current crawl status</li>
                      <li>Errors encountered</li>
                      <li>Estimated time remaining</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Understanding Results */}
        <section id="understanding-results">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Understanding Results
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Dashboard Metrics</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Key metrics displayed on the dashboard:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Total Pages:</strong> Number of pages crawled</li>
                      <li><strong>Issues Found:</strong> Total SEO issues detected</li>
                      <li><strong>Health Score:</strong> Overall website health rating</li>
                      <li><strong>Performance:</strong> Average page load times</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Issue Severity</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Issues are categorized by severity:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Critical:</strong> Must fix immediately - severely impacts SEO</li>
                      <li><strong>High:</strong> Important to fix - significant SEO impact</li>
                      <li><strong>Medium:</strong> Should fix - moderate SEO impact</li>
                      <li><strong>Low:</strong> Nice to fix - minor SEO impact</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Export Options</h3>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Export your crawl results in various formats:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>CSV:</strong> Spreadsheet-compatible format for analysis</li>
                      <li><strong>JSON:</strong> Machine-readable format for developers</li>
                      <li><strong>PDF:</strong> Printable comparison reports when available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Issue Types */}
        <section id="issue-types">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Bug className="w-6 h-6 text-primary" />
                Common Issue Types
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Duplicate Content</h3>
                  <p className="text-sm text-muted-foreground">
                    Pages with identical or very similar content can confuse search engines. Use canonical tags or consolidate similar pages.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Broken Links (404)</h3>
                  <p className="text-sm text-muted-foreground">
                    Links that lead to non-existent pages create poor user experience. Regularly audit and fix or redirect broken links.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Missing Meta Tags</h3>
                  <p className="text-sm text-muted-foreground">
                    Title tags and meta descriptions help search engines understand your content. Ensure every page has unique, descriptive tags.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Slow Loading Pages</h3>
                  <p className="text-sm text-muted-foreground">
                    Page speed is a ranking factor. Optimize images, minify code, and use caching to improve load times.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Orphaned Pages</h3>
                  <p className="text-sm text-muted-foreground">
                    Pages not linked from anywhere on your site won't be crawled. Add internal links or remove unnecessary pages.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Missing Canonical Tags</h3>
                  <p className="text-sm text-muted-foreground">
                    Canonical tags prevent duplicate content issues. Add them to pages with similar content or multiple URL versions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Large Images</h3>
                  <p className="text-sm text-muted-foreground">
                    Oversized images slow down your site. Compress images and use appropriate formats (WebP, AVIF) when possible.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Missing Alt Text</h3>
                  <p className="text-sm text-muted-foreground">
                    Alt text describes images for screen readers and search engines. Add descriptive alt text to all images.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Internal Linking Issues</h3>
                  <p className="text-sm text-muted-foreground">
                    Poor internal linking structure affects crawlability and user navigation. Create logical site hierarchies and link related content.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Sitemap Issues</h3>
                  <p className="text-sm text-muted-foreground">
                    Sitemaps help search engines discover your pages. Ensure your sitemap is valid and submitted to search engines.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section id="faq">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" />
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">How long does a crawl take?</h3>
                  <p className="text-muted-foreground">
                    Crawl time depends on website size, server response times, and crawl settings. Most small sites (under 100 pages) complete within minutes. Larger sites may take several hours.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Will crawling slow down my website?</h3>
                  <p className="text-muted-foreground">
                    Our crawler is designed to be respectful. We respect robots.txt, implement rate limiting, and use efficient crawling techniques. You can further control crawl speed in settings.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Can I crawl password-protected pages?</h3>
                  <p className="text-muted-foreground">
                    Currently, our crawler cannot access password-protected pages. We recommend temporarily removing protection during crawls or using alternative authentication methods.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">How often should I crawl my site?</h3>
                  <p className="text-muted-foreground">
                    We recommend crawling at least monthly for active sites, or weekly if you make frequent content changes. Regular crawls help catch issues early.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Is my crawl data secure?</h3>
                  <p className="text-muted-foreground">
                    Yes, all crawl data is encrypted and stored securely. Only you have access to your crawl results. We never share your data with third parties.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">How do I contact support?</h3>
                  <p className="text-muted-foreground">
                    Email us at support@seospider.com with your question. Include your account email and a detailed description of your issue for faster resolution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

