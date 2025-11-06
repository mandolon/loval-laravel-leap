export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using Rehome's services, you accept and agree to be bound by the terms and 
              provisions of this agreement. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
            <p className="mb-4">
              We grant you a limited, non-exclusive, non-transferable license to access and use our services 
              for your personal or business purposes, subject to these terms.
            </p>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use our services for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt our services</li>
              <li>Reproduce, duplicate, or copy any part of our services without permission</li>
              <li>Use our services to transmit malicious code or spam</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all 
              activities that occur under your account. You agree to notify us immediately of any unauthorized 
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
            <p className="mb-4">
              You retain all rights to any content you submit, post, or display through our services. By 
              submitting content, you grant us a worldwide, non-exclusive license to use, reproduce, and 
              display your content as necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="mb-4">
              All content, features, and functionality of our services are owned by Rehome and are protected 
              by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your access to our services immediately, without prior notice, for 
              any reason, including if you breach these terms. Upon termination, your right to use our services 
              will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
            <p className="mb-4">
              Our services are provided "as is" and "as available" without warranties of any kind, either express 
              or implied. We do not warrant that our services will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="mb-4">
              To the maximum extent permitted by law, Rehome shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages resulting from your use of or inability to use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes 
              by posting the new terms on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
            <p className="mb-4">
              These terms shall be governed by and construed in accordance with applicable laws, without regard 
              to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <p className="mb-4">
              For questions about these terms, please contact us at{" "}
              <a href="mailto:support@rehome.build" className="text-primary hover:underline">
                support@rehome.build
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
