import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Xocial",
  description:
    "Learn how Xocial collects, uses, shares, and protects data for social media management, Meta integrations, AI content generation, analytics, and account security.",
};

const lastUpdated = "May 12, 2026";

const sections = [
  {
    title: "1. Scope",
    body: [
      "This Privacy Policy explains how Xocial collects, uses, discloses, retains, and protects information when you visit our website, create an account, connect social media profiles, use our publishing and analytics tools, or contact us for support.",
      "Xocial is a social media management application for businesses, creators, agencies, and marketing teams. The service supports planning, collaboration, media management, scheduling, publishing, analytics, engagement workflows, and AI-assisted content generation.",
      "This policy is provided for transparency and product compliance purposes. It is not legal advice, and your organization may need additional terms or notices depending on how you use Xocial.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "The information we collect depends on how you use Xocial, what you provide to us, and which integrations you authorize.",
    ],
    list: [
      "Account and profile information, such as name, email address, organization, workspace membership, role, preferences, and authentication identifiers.",
      "Authentication and access information, including session data, OAuth authorization results, integration permissions, and security events. When Clerk authentication is enabled, Clerk may process sign-in, sign-up, session, and identity verification data on our behalf.",
      "Connected social account data from platforms you authorize, including Meta/Facebook Pages, Instagram Business or Creator accounts, account IDs, usernames, profile images, page names, permission scopes, access tokens, token expiration metadata, and related connection status.",
      "Social content and workflow data, including drafts, captions, hashtags, media files, uploaded assets, scheduled times, approvals, comments, replies, post status, publishing logs, templates, campaign data, and workspace collaboration activity.",
      "Analytics and engagement data retrieved through authorized platform APIs, such as reach, impressions, followers, reactions, comments, mentions, saves, clicks, video metrics, demographics where provided by the platform, and other performance statistics.",
      "AI input and output data, such as prompts, uploaded context, brand instructions, generated captions, content ideas, hashtags, rewrites, recommendations, and model responses.",
      "Billing, plan, and usage information, such as subscription status, feature usage, workspace limits, invoices, payment processor references, and usage events.",
      "Device, log, and usage data, such as IP address, browser type, device information, pages viewed, referring URLs, timestamps, error logs, diagnostics, and security telemetry.",
      "Support and communications data, including messages you send to us, attachments, feedback, survey responses, and records of our responses.",
    ],
  },
  {
    title: "3. Meta, Facebook, and Instagram Integrations",
    body: [
      "When you connect Facebook or Instagram through Meta APIs, Xocial only requests permissions needed to provide the features you choose to use, such as account connection, content publishing, comment management, and analytics. The exact permissions available to Xocial depend on Meta approval, platform rules, your account type, and the choices you make during authorization.",
      "We use Meta data to display your connected accounts, schedule and publish approved content, retrieve post status, synchronize comments or engagement where enabled, show analytics, troubleshoot integration issues, and maintain audit records for security and reliability.",
      "We do not ask for or store your Facebook or Instagram password. You can revoke Xocial's access at any time from Xocial account settings, from your Meta account settings, or from Facebook Business Integrations.",
    ],
  },
  {
    title: "4. How We Use Information",
    body: [
      "We use information to operate, secure, improve, and support Xocial. This includes authenticating users, administering workspaces, connecting social accounts, managing scheduled posts, publishing content you approve, syncing analytics, displaying engagement data, enabling team collaboration, generating AI-assisted content, providing customer support, monitoring service health, preventing abuse, enforcing our agreements, and complying with legal and platform requirements.",
      "We may also use aggregated or de-identified information to understand product performance, improve reliability, develop new features, and report usage trends. Aggregated or de-identified information does not identify you or your workspace.",
    ],
  },
  {
    title: "5. AI-Assisted Content Generation",
    body: [
      "Xocial uses AI services to help generate, refine, summarize, and recommend social media content. AI requests may include prompts, selected account context, draft content, uploaded media descriptions, brand instructions, performance context, or other information you choose to provide.",
      "AI requests may be processed through Vercel AI Gateway and model providers such as OpenAI. These providers process data on our behalf to return requested outputs and support service reliability, security, abuse prevention, and debugging according to their applicable service terms and data processing commitments.",
      "Do not submit confidential, regulated, or sensitive personal information into AI prompts unless your organization has determined that this use is appropriate. AI outputs can be inaccurate or incomplete, and you are responsible for reviewing generated content before publishing it.",
    ],
  },
  {
    title: "6. How We Share Information",
    body: [
      "We do not sell personal information. We share information only as needed to provide Xocial, support integrations you authorize, operate our infrastructure, comply with law, or protect rights and safety.",
    ],
    list: [
      "Workspace members: People in your workspace may access shared content, assets, approvals, comments, analytics, and connected account information according to their role and permissions.",
      "Social platforms: When you publish, schedule, reply, sync, or request analytics through an integration, we exchange information with the applicable platform, including Meta/Facebook and Instagram, based on your authorization and platform API requirements.",
      "Infrastructure and service providers: We use providers such as Supabase for database and storage services, Vercel for hosting and deployment infrastructure, Vercel AI Gateway for AI request routing, OpenAI for AI model processing, and current or future authentication providers such as Clerk. These providers may process information only for the services they provide to us.",
      "Payment and business operations providers: Payment processors, analytics, monitoring, email, support, and security vendors may process limited information needed for billing, notifications, diagnostics, and customer support.",
      "Legal and safety disclosures: We may disclose information when required by law, legal process, platform policy enforcement, or when we believe disclosure is necessary to protect users, Xocial, social platforms, or the public.",
      "Business transfers: If Xocial is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction subject to appropriate protections.",
    ],
  },
  {
    title: "7. Data Storage, Security, and Hosting",
    body: [
      "Xocial is hosted on Vercel and uses Supabase for application data, database services, and related backend infrastructure. Information may be processed in the regions where Xocial and our providers operate.",
      "We use administrative, technical, and organizational safeguards designed to protect information, including HTTPS encryption in transit, access controls, environment-based secrets management, restricted administrative access, logging, monitoring, and secure token handling. Access tokens and integration credentials are protected and used only to provide authorized integration features.",
      "No internet service can guarantee absolute security. You should use strong passwords, protect your devices, manage workspace access carefully, and promptly remove users or integrations that no longer need access.",
    ],
  },
  {
    title: "8. Data Retention",
    body: [
      "We retain information for as long as needed to provide Xocial, maintain business records, comply with legal obligations, resolve disputes, enforce agreements, preserve security, and support platform integrations.",
      "Workspace content, scheduled posts, media assets, analytics snapshots, comments, and generated content are generally retained while your account or workspace remains active unless you delete them or request deletion. Some logs, backups, security records, and billing records may be retained for a limited period after deletion where required for security, continuity, legal compliance, or legitimate business operations.",
      "If you disconnect a social account, Xocial will stop using that connection for future API access. Previously synchronized data may remain in your workspace until deleted, unless we are required to retain it or it is preserved in backups for a limited period.",
    ],
  },
  {
    title: "9. Your Choices and Rights",
    body: [
      "Depending on your location, you may have rights to access, correct, export, delete, restrict, or object to certain processing of personal information. You may also have the right to withdraw consent where processing is based on consent.",
      "You can manage many choices directly in Xocial, including editing workspace information, disconnecting integrations, deleting content, managing team access, and changing notification preferences. You can also revoke Meta access from Facebook Business Integrations.",
      "To submit a privacy request, contact us at privacy@xocial.world. We may need to verify your identity or authority before fulfilling a request, especially for workspace or organization data.",
    ],
  },
  {
    title: "10. Account, Integration, and Data Deletion",
    body: [
      "You may request deletion of your account, workspace data, or connected integration data by contacting privacy@xocial.world or support@xocial.world. Please include enough detail for us to identify the relevant account, workspace, and social connection.",
      "For Meta integrations, you can also remove Xocial from Facebook Business Integrations at https://www.facebook.com/settings?tab=business_tools. Revoking access prevents future access to that Meta data through your account, but it does not automatically delete data already stored in Xocial. Contact us if you also want stored data deleted.",
      "We will process deletion requests within the timeframe required by applicable law and platform policies, subject to identity verification, security requirements, legal obligations, backup retention, and records we must keep for legitimate business purposes.",
    ],
  },
  {
    title: "11. Cookies and Similar Technologies",
    body: [
      "We use cookies and similar technologies to keep users signed in, maintain sessions, remember preferences, secure the service, measure performance, diagnose errors, and understand product usage. Some cookies are necessary for the service to work.",
      "You can control cookies through your browser settings. Blocking cookies may affect sign-in, workspace access, integrations, or other app functionality. Xocial does not use cookies to sell personal information.",
    ],
  },
  {
    title: "12. International Data Transfers",
    body: [
      "Xocial and our service providers may process information in countries other than where you live or where your organization is located. Data protection laws in those countries may differ from your local laws.",
      "Where required, we rely on appropriate safeguards for international transfers, such as contractual commitments, data processing agreements, standard contractual clauses, and other lawful transfer mechanisms.",
    ],
  },
  {
    title: "13. Children's Privacy",
    body: [
      "Xocial is intended for business and professional use. We do not knowingly collect personal information from children under 13 or the minimum age required by applicable law. If you believe a child has provided personal information to Xocial, contact us and we will take appropriate steps to delete it.",
    ],
  },
  {
    title: "14. Changes to This Policy",
    body: [
      "We may update this Privacy Policy as Xocial changes, as providers or integrations evolve, or as legal and platform requirements change. The updated version will be posted at https://www.xocial.world/privacy with a new last updated date.",
      "If changes are material, we may provide additional notice through the app, by email, or by another reasonable method.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-secondary-200 bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950 px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-300">
            Privacy Policy
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            How Xocial handles your data
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-secondary-200">
            This policy describes how Xocial protects information used for social
            media scheduling, Meta/Facebook and Instagram integrations,
            analytics, AI-assisted generation, workspace collaboration, and
            account security.
          </p>
          <p className="mt-6 text-sm font-medium text-secondary-300">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 rounded-2xl border border-primary-100 bg-primary-50 p-6 text-sm leading-7 text-secondary-800">
          For privacy questions or data requests, contact{" "}
          <a
            className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            href="mailto:privacy@xocial.world"
          >
            privacy@xocial.world
          </a>
          . For product support, contact{" "}
          <a
            className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
            href="mailto:support@xocial.world"
          >
            support@xocial.world
          </a>
          .
        </div>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.title} className="scroll-mt-28">
              <h2 className="text-2xl font-bold tracking-tight text-secondary-950">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-secondary-700">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.list ? (
                  <ul className="list-disc space-y-3 pl-6">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-secondary-200 bg-secondary-50 p-6">
            <h2 className="text-2xl font-bold tracking-tight text-secondary-950">
              15. Contact Us
            </h2>
            <address className="mt-4 space-y-2 not-italic text-base leading-8 text-secondary-700">
              <p>Xocial</p>
              <p>
                Privacy:{" "}
                <a
                  className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  href="mailto:privacy@xocial.world"
                >
                  privacy@xocial.world
                </a>
              </p>
              <p>
                Support:{" "}
                <a
                  className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  href="mailto:support@xocial.world"
                >
                  support@xocial.world
                </a>
              </p>
              <p>
                Policy URL:{" "}
                <a
                  className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  href="https://www.xocial.world/privacy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  https://www.xocial.world/privacy
                </a>
              </p>
            </address>
          </section>
        </div>
      </article>
    </main>
  );
}
