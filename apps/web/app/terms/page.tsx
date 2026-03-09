import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to snakehead ("we," "our," or "us"). By accessing or using our service, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, then you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account and using snakehead, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>To use our service, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your password</li>
                <li>Accept all responsibility for activities under your account</li>
              </ul>
              <p>You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Responsibilities</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>As a user of snakehead, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the service only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to our systems</li>
                <li>Not interfere with or disrupt the service</li>
                <li>Not use automated tools to abuse our crawling limits</li>
                <li>Respect website robots.txt files and rate limits</li>
                <li>Not use the service to crawl websites you do not own or have permission to analyze</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Service Description</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>snakehead provides website crawling, analysis, and SEO reporting services. We strive to maintain the service but do not guarantee:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Uninterrupted or error-free operation</li>
                <li>That defects will be corrected</li>
                <li>The service will meet your requirements</li>
                <li>The accuracy or reliability of any information obtained through the service</li>
              </ul>
              <p>We reserve the right to modify, suspend, or discontinue the service at any time without prior notice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Service Availability</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>We may add, remove, or modify features over time. Access to specific functionality may change as the product evolves.</p>
              <p>We do not guarantee uninterrupted availability and may suspend or restrict access for maintenance, abuse prevention, legal compliance, or security reasons.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Our Content:</strong> All content, features, and functionality of snakehead are owned by us and protected by intellectual property laws.</p>
              <p><strong>Your Data:</strong> You retain ownership of all data you submit to our service, including crawl results and reports. We do not claim ownership of your data.</p>
              <p><strong>License:</strong> By using our service, you grant us a limited, non-exclusive, non-transferable license to use your data solely to provide the service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of our service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Please review our Privacy Policy to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>To the maximum extent permitted by law, snakehead shall not be liable for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
                <li>Damages resulting from use or inability to use the service</li>
                <li>Damages from unauthorized access to or alteration of your data</li>
              </ul>
              <p>Our total liability shall not exceed the amount you paid for the service in the 12 months preceding the claim.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>By You:</strong> You may terminate your account at any time through your account settings or by contacting us. Upon termination, your right to use the service will immediately cease.</p>
              <p><strong>By Us:</strong> We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.</p>
              <p>Upon termination, we will retain your data for a reasonable period for backup purposes, after which it will be permanently deleted.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which snakehead is established, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>If you have any questions about these Terms, please contact us:</p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> support@seospider.com</li>
                <li><strong>Website:</strong> https://seospider.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the service. Your continued use of the service after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
