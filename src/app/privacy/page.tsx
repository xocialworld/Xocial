import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Xocial",
  description:
    "Learn how Xocial collects, uses, and protects your data while providing social media management, publishing, and analytics services.",
};

const lastUpdated = "November 05, 2025";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <article className="space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Xocial Privacy Policy
          </h1>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          <p className="text-base leading-7">
            Xocial (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) helps teams manage their social media
            presence across Facebook, Instagram, and other platforms through
            scheduling, analytics, collaboration, and AI-assisted content
            creation. This Privacy Policy explains how we collect, use, share,
            and safeguard personal information when you use the Xocial platform,
            visit our website, or connect your social media accounts. It is
            designed to satisfy Meta Platform&rsquo;s requirements for Facebook and
            Instagram integrations as well as other applicable privacy laws.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="leading-7">
            The information we collect depends on how you interact with Xocial and
            the permissions you grant. We limit data collection to what is needed
            to deliver our services.
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              <strong>Account Information:</strong> Name, email address, password
              (hashed), workspace and team details created during sign-up or
              provided via OAuth providers such as Google.
            </li>
            <li>
              <strong>Connected Social Accounts:</strong> When you authorize
              Facebook or Instagram via Meta, we receive access tokens and the
              associated Page or Business Account IDs, Page names, profile
              pictures, and permissions you grant. We do <span className="font-semibold">not</span> store
              personal login credentials.
            </li>
            <li>
              <strong>Content &amp; Scheduling Data:</strong> Posts, captions,
              media files, drafts, scheduled times, comments, and brand assets
              you upload to Xocial.
            </li>
            <li>
              <strong>Engagement &amp; Analytics Data:</strong> Metrics and
              insights (impressions, reach, reactions, comments, mentions, and
              other performance statistics) retrieved from authorized social
              platforms for your connected accounts.
            </li>
            <li>
              <strong>Usage Data:</strong> Log data, device/browser
              characteristics, IP address, and feature usage necessary for
              security, debugging, and service improvement.
            </li>
            <li>
              <strong>Support Communications:</strong> Information you provide
              when contacting us for assistance or feedback.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">2. How We Use Information</h2>
          <p className="leading-7">
            We process personal information only for legitimate business purposes,
            including:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Authenticating users and securing accounts.</li>
            <li>Connecting and managing social media Pages/Accounts you authorize.</li>
            <li>
              Scheduling, publishing, and monitoring social media content on your
              behalf according to the permissions you have granted.
            </li>
            <li>
              Providing engagement insights, analytics dashboards, and reports.
            </li>
            <li>
              Facilitating collaboration within your workspace (e.g., team roles,
              approvals, shared assets).
            </li>
            <li>Offering AI-assisted captions, recommendations, and content ideas.</li>
            <li>
              Sending service-related communications, security alerts, and support
              messages.
            </li>
            <li>Improving and personalizing the platform experience.</li>
            <li>Complying with legal, regulatory, or enforcement obligations.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            3. Legal Bases for Processing
          </h2>
          <p className="leading-7">
            We rely on one or more of the following legal grounds when processing
            personal information:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Your consent, which you may withdraw at any time.</li>
            <li>
              Performance of a contract, such as delivering the Xocial services to
              you and your organization.
            </li>
            <li>
              Legitimate interests, including securing our platform, preventing
              misuse, and improving core functionality.
            </li>
            <li>Compliance with applicable laws and platform policies.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">4. How We Share Information</h2>
          <p className="leading-7">
            We do not sell personal information. We may share data with:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              <strong>Authorized Team Members:</strong> Workspace collaborators
              can access shared content, analytics, and connected account data as
              controlled by workspace roles.
            </li>
            <li>
              <strong>Service Providers:</strong> Third-party vendors that help us
              operate Xocial, such as Supabase (database and authentication),
              Vercel (hosting and AI Gateway), and AI model providers accessed 
              through Vercel AI Gateway (AI-assisted content generation). These
              providers are contractually obligated to handle data securely and
              only for the purpose of delivering the contracted service.
            </li>
            <li>
              <strong>Integrated Platforms:</strong> Social networks you connect
              (Meta/Facebook, Instagram) receive the content you publish and may
              return analytics data per their APIs and your permissions.
            </li>
            <li>
              <strong>Legal Disclosures:</strong> We may disclose information if
              required to comply with applicable law, regulation, legal process,
              or enforceable governmental request.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            5. Data Retention &amp; Deletion
          </h2>
          <p className="leading-7">
            We retain information for as long as your account is active or as
            needed to deliver services, comply with legal obligations, resolve
            disputes, and enforce agreements. Access tokens are stored securely and
            rotated according to Meta&rsquo;s requirements. You may request deletion of
            your account or specific content at any time by contacting
            <a className="ml-1 text-blue-600 hover:underline" href="mailto:support@xocial.world">
              support@xocial.world
            </a>
            . Disconnecting a social account inside Xocial or revoking permissions
            directly at
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="https://www.facebook.com/settings?tab=business_tools"
              rel="noopener noreferrer"
              target="_blank"
            >
              Facebook&rsquo;s Business Integrations
            </a>
            will remove our ability to access future data from that account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            6. Data Security
          </h2>
          <p className="leading-7">
            We implement industry-standard safeguards to protect personal
            information, including encryption in transit, secure credential
            storage, access controls, monitoring, and regular security reviews.
            Despite these efforts, no online service can guarantee perfect
            security, so please use strong passwords and enable additional
            safeguards where available.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            7. Your Rights &amp; Choices
          </h2>
          <p className="leading-7">
            Depending on your jurisdiction, you may have the right to access,
            correct, update, export, or delete your personal information, as well
            as object to or restrict certain processing. You may exercise these
            rights by contacting us at
            <a className="ml-1 text-blue-600 hover:underline" href="mailto:privacy@xocial.world">
              privacy@xocial.world
            </a>
            . We will respond within the timeframe required by applicable law.
            You can also manage many permissions directly:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Disconnect social profiles within Xocial&rsquo;s account settings.</li>
            <li>
              Remove Xocial&rsquo;s access from Meta at
              <a
                className="ml-1 text-blue-600 hover:underline"
                href="https://www.facebook.com/settings?tab=business_tools"
                rel="noopener noreferrer"
                target="_blank"
              >
                facebook.com/settings?tab=business_tools
              </a>
              .
            </li>
            <li>Adjust email notification preferences inside your workspace.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            8. Children&rsquo;s Privacy
          </h2>
          <p className="leading-7">
            Xocial is intended for businesses and professionals. We do not
            knowingly collect or solicit personal data from anyone under the age of
            13 (or the minimum age required in your jurisdiction). If you believe a
            minor has provided us with personal information, please contact us and
            we will take appropriate action to remove the data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            9. International Data Transfers
          </h2>
          <p className="leading-7">
            Xocial operates globally. Your information may be stored and processed
            in the United States or other countries where our service providers are
            located. We rely on appropriate safeguards, such as Standard Contractual
            Clauses, when transferring personal data across borders.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            10. Cookies &amp; Tracking Technologies
          </h2>
          <p className="leading-7">
            We use cookies and similar technologies to keep you signed in, remember
            preferences, and analyze platform usage. You can control cookies through
            your browser settings; however, disabling cookies may affect certain
            features. We do not use third-party advertising cookies within the
            Xocial app.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">11. Updates to This Policy</h2>
          <p className="leading-7">
            We may update this Privacy Policy to reflect changes in our practices,
            services, or legal requirements. We will notify you of material changes
            by email or through in-app notices, and the updated policy will be
            posted at
            <a className="ml-1 text-blue-600 hover:underline" href="https://www.xocial.world/privacy">
              https://www.xocial.world/privacy
            </a>
            with a revised effective date.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">12. Contact Us</h2>
          <p className="leading-7">
            If you have questions about this Privacy Policy or how we handle your
            information, please contact us at:
          </p>
          <address className="not-italic leading-7 text-gray-700">
            Xocial<br />
            Email:
            <a className="ml-1 text-blue-600 hover:underline" href="mailto:privacy@xocial.world">
              privacy@xocial.world
            </a>
            <br />
            Support:
            <a className="ml-1 text-blue-600 hover:underline" href="mailto:support@xocial.world">
              support@xocial.world
            </a>
          </address>
        </section>
      </article>
    </main>
  );
}

