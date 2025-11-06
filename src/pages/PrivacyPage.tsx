export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>Effective date:</strong> November 6, 2025
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          <strong>Website/App:</strong> Rehome (https://rehome.build and https://app.rehome.build)<br />
          <strong>Contact:</strong> <a href="mailto:armando@rehome.build" className="text-primary hover:underline">armando@rehome.build</a>
        </p>
        
        <p className="mb-8 text-foreground">
          Rehome helps architecture teams collaborate during preconstruction. This Privacy Policy explains what we collect, how we use it, and the choices you have.
        </p>

        <div className="space-y-6 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1) What we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account & OAuth data:</strong> name, email, and basic profile information provided by Google Sign-In (scopes: <code>openid</code>, <code>email</code>, <code>profile</code>).</li>
              <li><strong>Workspace & project content:</strong> files, notes, messages, and other content you add or upload.</li>
              <li><strong>Technical data:</strong> device/browser type, IP address, pages/actions, and cookies or similar technologies used for session management and security.</li>
              <li><strong>Support communications:</strong> messages and attachments you send to support.</li>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> request or access your Gmail contents, contacts, calendar, or other sensitive Google data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2) How we use data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate you and create/manage your account and workspaces.</li>
              <li>Provide, maintain, and improve features (projects, files, collaboration).</li>
              <li>Secure the service, prevent abuse, and troubleshoot.</li>
              <li>Communicate about updates, security notices, and support.</li>
              <li>Meet legal, safety, and compliance obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3) Legal bases (EEA/UK users)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contract (to provide the service),</li>
              <li>Legitimate interests (security, improvement),</li>
              <li>Consent where required,</li>
              <li>Legal obligation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4) Sharing</h2>
            <p className="mb-4">We share data only with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service providers</strong> that help us operate the app (e.g., authentication, databases, hosting, analytics, email). This includes <strong>Google</strong> (OAuth) and <strong>Supabase</strong> (authentication/database).</li>
              <li><strong>Legal and safety</strong> recipients if required by law or to protect rights.</li>
              <li><strong>Business transfers</strong> (e.g., merger or acquisition) with appropriate protections.</li>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> sell personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5) International transfers</h2>
            <p className="mb-4">
              We may process data in countries outside your own. When we do, we use appropriate safeguards (e.g., Standard Contractual Clauses where applicable).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6) Retention</h2>
            <p className="mb-4">
              We keep data while you have an account and as needed for legitimate business or legal purposes. When no longer required, we delete or anonymize it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7) Your choices & rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access/Update/Delete:</strong> You can request access, correction, portability, or deletion of your data.</li>
              <li><strong>Opt-out of non-essential emails:</strong> Use unsubscribe links or contact us.</li>
              <li><strong>Cookies:</strong> You can control cookies through your browser settings (disabling some cookies may affect sign-in/session).</li>
              <li><strong>EEA/UK/California rights:</strong> You may have additional rights under GDPR/UK GDPR/CPRA. Contact us to exercise them.</li>
            </ul>
            <p className="mt-4">
              To delete your account or request a copy of your data, email <strong>armando@rehome.build</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8) Security</h2>
            <p className="mb-4">
              We use administrative, technical, and physical safeguards appropriate to the risk (encryption in transit, access controls, logging). No method is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9) Children</h2>
            <p className="mb-4">
              Rehome is not intended for children under 16 and we do not knowingly collect their data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10) Changes</h2>
            <p className="mb-4">
              We may update this Policy. We'll post the new date above and, if changes are material, notify you in-app or by email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11) Contact</h2>
            <p className="mb-4">
              Questions or requests:{" "}
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
