export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>Effective date:</strong> November 6, 2025
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Website/App:</strong> Rehome (https://rehome.build and https://app.rehome.build)<br />
          <strong>Contact:</strong> <a href="mailto:armando@rehome.build" className="text-primary hover:underline">armando@rehome.build</a>
        </p>

        <p className="mb-8 text-foreground">
          These Terms govern your use of Rehome. By accessing or using the Service, you agree to these Terms.
        </p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1) The Service</h2>
            <p className="mb-4">
              Rehome is a collaboration platform for architecture teams to manage preconstruction work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2) Accounts</h2>
            <p className="mb-4">
              You must be capable of forming a contract and provide accurate information. You're responsible for your credentials and all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3) Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Break the law or infringe others' rights.</li>
              <li>Upload malicious code or attempt to disrupt the Service.</li>
              <li>Misuse, reverse engineer, or try to bypass security or rate limits.</li>
              <li>Upload content you don't have the right to share.</li>
            </ul>
            <p className="mt-4">
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4) Your Content</h2>
            <p className="mb-4">
              You retain ownership of content you upload. You grant Rehome a worldwide, non-exclusive license to host, process, display, and create backups of your content solely to provide the Service and support you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5) Privacy</h2>
            <p className="mb-4">
              Our <strong>Privacy Policy</strong> (https://rehome.build/privacy) explains how we handle personal data and is part of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6) Third-Party Services</h2>
            <p className="mb-4">
              The Service may rely on third-party providers (e.g., Google Sign-In, Supabase). Your use of those services may be subject to their terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7) Intellectual Property</h2>
            <p className="mb-4">
              The Service, software, and branding are owned by Rehome or its licensors. These Terms don't grant you any rights to our trademarks or code except as needed to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8) Beta / Changes</h2>
            <p className="mb-4">
              We may add, change, or remove features at any time. Some features may be labeled beta or preview and may be less stable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9) Disclaimers</h2>
            <p className="mb-4">
              The Service is provided <strong>"as is" and "as available."</strong> We disclaim all warranties to the fullest extent permitted by law, including fitness for a particular purpose and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10) Limitation of Liability</h2>
            <p className="mb-4">
              To the fullest extent permitted by law, Rehome and its affiliates will not be liable for indirect, incidental, special, consequential, or exemplary damages. Our total liability for any claim related to the Service will not exceed the greater of <strong>$100</strong> or the amount you paid to us in the 12 months before the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11) Indemnification</h2>
            <p className="mb-4">
              You will defend and indemnify Rehome against claims arising from your content or your violation of these Terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12) Termination</h2>
            <p className="mb-4">
              You may stop using the Service at any time. We may suspend or terminate access for violations or risks to the Service. Upon termination, your right to use the Service ends, but Sections 4–13 survive.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13) Governing Law & Disputes</h2>
            <p className="mb-4">
              These Terms are governed by the laws of <strong>California, USA</strong>, excluding conflict-of-law rules. Disputes will be resolved in the state or federal courts located in <strong>Sacramento County, California</strong>, unless otherwise required by law. Each party consents to that jurisdiction and venue. You and Rehome may still seek equitable relief or use small-claims court.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14) Changes to Terms</h2>
            <p className="mb-4">
              We may update these Terms. If changes are material, we'll notify you in-app or by email. Continued use after the effective date means you accept the changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15) Contact</h2>
            <p className="mb-4">
              Questions about these Terms:{" "}
              <a href="mailto:armando@rehome.build" className="text-primary hover:underline">
                armando@rehome.build
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
