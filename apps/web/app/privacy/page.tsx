import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <Card>
        <CardContent className="p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              snakehead ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. By using snakehead, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold mb-2">2.1 Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name and company name</li>
                  <li>Email address</li>
                  <li>Password (stored securely as a hash)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.2 Usage Data</h3>
                <p>We automatically collect information about your use of the service:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Crawl configurations and settings</li>
                  <li>Pages crawled and analyzed</li>
                  <li>Features used within the application</li>
                  <li>Access times and frequency</li>
                  <li>Device and browser information</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.3 Website Data</h3>
                <p>When you crawl websites, we process:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>URLs and page content (for analysis purposes)</li>
                  <li>Meta tags and headers</li>
                  <li>Link structures</li>
                  <li>Technical performance metrics</li>
                </ul>
                <p className="mt-2"><strong>Important:</strong> We do not store the full HTML content of crawled pages beyond what is necessary for analysis. We do not use this data for any purpose other than providing the service.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2.4 Cookies and Tracking</h3>
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Keep you logged in</li>
                  <li>Remember your preferences</li>
                  <li>Analyze service usage patterns</li>
                  <li>Improve our service</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>We use the collected information for various purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>To Provide and Maintain the Service:</strong> Process your crawl requests, generate reports, and deliver the features you request</li>
                <li><strong>To Manage Your Account:</strong> Authenticate you, provide customer support, and manage your account preferences</li>
                <li><strong>To Improve the Service:</strong> Analyze usage patterns to enhance features and fix bugs</li>
                <li><strong>To Communicate:</strong> Send service updates, security alerts, and support communications</li>
                <li><strong>To Comply with Legal Obligations:</strong> Meet legal requirements and protect our rights</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>We implement appropriate security measures to protect your information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Encryption:</strong> Data is encrypted in transit using HTTPS and at rest where applicable</li>
                <li><strong>Access Controls:</strong> Strict access controls limit who can view your data</li>
                <li><strong>Secure Passwords:</strong> Passwords are hashed using bcrypt and never stored in plain text</li>
                <li><strong>Regular Audits:</strong> We conduct regular security reviews</li>
              </ul>
              <p className="mt-2">However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>We use third-party services to operate our business:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Resend:</strong> Sends transactional emails. See <a href="https://resend.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Resend's Privacy Policy</a></li>
                <li><strong>Cloud Infrastructure:</strong> Data is hosted on secure cloud providers</li>
              </ul>
              <p className="mt-2">We carefully select these partners and require them to protect your data. We are not responsible for the privacy practices of these third parties.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Data Rights (GDPR/CCPA)</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Depending on your location, you may have the following rights:</p>

              <div>
                <h3 className="font-semibold mb-2">6.1 Access Right</h3>
                <p>You can request a copy of all personal data we hold about you.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.2 Rectification Right</h3>
                <p>You can request correction of inaccurate or incomplete data.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.3 Erasure Right (Right to be Forgotten)</h3>
                <p>You can request deletion of your personal data, subject to legal obligations.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.4 Portability Right</h3>
                <p>You can request your data in a structured, commonly used format.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.5 Objection Right</h3>
                <p>You can object to processing of your data in certain circumstances.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.6 Restriction Right</h3>
                <p>You can request restriction of processing in certain circumstances.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.7 Withdraw Consent</h3>
                <p>You can withdraw consent at any time by contacting us or adjusting your account settings.</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">6.8 CCPA Specific Rights</h3>
                <p>California residents have additional rights:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Right to know what personal information is collected</li>
                  <li>Right to know if personal information is sold or disclosed</li>
                  <li>Right to opt-out of sale of personal information</li>
                  <li>Right to non-discrimination for exercising privacy rights</li>
                </ul>
              </div>

              <p className="mt-4">To exercise these rights, contact us at privacy@seospider.com. We will respond within 30 days.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>We retain your data for different periods depending on the type:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Retained while your account is active</li>
                <li><strong>Crawl Data:</strong> Retained according to service and storage policies</li>
                <li><strong>Support Communications:</strong> Retained for 2 years</li>
              </ul>
              <p className="mt-2">Upon account deletion, all personal data is permanently deleted within 30 days, except where required by law.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our service, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>If you have any questions about this Privacy Policy or your personal data, please contact us:</p>
              <ul className="list-none space-y-1">
                <li><strong>Email:</strong> privacy@seospider.com</li>
                <li><strong>Website:</strong> https://seospider.com</li>
              </ul>
              <p className="mt-2">For GDPR-related requests, please include "GDPR Request" in your subject line.</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
