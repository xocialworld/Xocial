import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Xocial",
  description:
    "Review the terms for using Xocial, a social media management app for planning, scheduling, publishing, collaboration, and analytics.",
};

const lastUpdated = "May 13, 2026";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <article className="space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Terms of Service
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Xocial Terms of Service
          </h1>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          <p className="text-base leading-7">
            These Terms of Service (&ldquo;Terms&rdquo;) explain the rules for
            using Xocial (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;),
            a social media management app that helps teams plan, create,
            schedule, publish, collaborate on, and analyze social media content.
            By creating an account, connecting a social profile, or using
            Xocial, you agree to these Terms.
          </p>
          <p className="text-base leading-7">
            These Terms are written to support a trustworthy social media
            management product and to make clear that use of Facebook,
            Instagram, and other connected platforms remains subject to those
            platforms&apos; own terms, developer policies, community standards,
            and API rules.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            1. Using Xocial
          </h2>
          <p className="leading-7">
            You may use Xocial only if you can form a binding agreement and are
            allowed to use the service under applicable law. You are responsible
            for keeping your account information accurate, protecting your login
            credentials, and managing access for any team members in your
            workspace.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            2. Workspaces and Team Access
          </h2>
          <p className="leading-7">
            Xocial workspaces may include multiple users, roles, connected
            accounts, drafts, media assets, comments, approvals, and analytics.
            Workspace owners and administrators are responsible for inviting the
            right people, assigning appropriate permissions, and reviewing
            activity performed by their team.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            3. Connected Social Accounts
          </h2>
          <p className="leading-7">
            Xocial lets you connect supported social media accounts, including
            Facebook Pages and Instagram professional accounts through Meta
            permissions. When you connect an account, you authorize Xocial to
            access only the data and actions allowed by the permissions you grant,
            such as reading account information, publishing approved content,
            retrieving comments, and showing analytics.
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>
              You must have the authority to connect and manage each social
              account you add to Xocial.
            </li>
            <li>
              You remain responsible for the content you publish or schedule
              through Xocial.
            </li>
            <li>
              Your use of connected platforms must also follow their applicable
              terms, developer policies, community standards, and platform rules.
            </li>
            <li>
              You can disconnect social accounts in Xocial or revoke access from
              the relevant social platform settings.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            4. Meta Platform Data
          </h2>
          <p className="leading-7">
            If you connect Facebook or Instagram, Xocial may receive data from
            Meta APIs, including Page identifiers, Instagram professional account
            identifiers, account names, usernames, profile images, permission
            scopes, access tokens, post status, comments, engagement metrics, and
            analytics made available by Meta for your authorized account.
          </p>
          <p className="leading-7">
            Xocial uses this Meta Platform Data only to provide the features you
            request: account connection, scheduling, publishing, comments,
            analytics, troubleshooting, security, and compliance. We do not sell,
            license, purchase, rent, or transfer Meta Platform Data except as
            needed to provide Xocial to you, to service providers acting on our
            behalf, to comply with law, or as otherwise permitted by Meta&apos;s
            terms.
          </p>
          <p className="leading-7">
            We do not use Meta Platform Data to train, fine-tune, or improve AI
            models. You must not use Xocial to collect, store, or process Meta
            data in ways that violate Meta Platform Terms, Meta Developer
            Policies, or applicable law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            5. Your Content
          </h2>
          <p className="leading-7">
            You keep ownership of the posts, captions, media, brand materials,
            comments, and other content you upload or create in Xocial. You give
            Xocial permission to host, process, display, analyze, and transmit
            that content only as needed to provide the service, including
            scheduling posts, publishing to connected accounts, generating
            previews, supporting approvals, and showing analytics.
          </p>
          <p className="leading-7">
            Please do not upload content unless you have the rights and
            permissions needed to use it. Xocial does not review every item of
            user content before it is scheduled or published.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            6. Acceptable Use
          </h2>
          <p className="leading-7">You agree not to use Xocial to:</p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Break applicable laws or regulations.</li>
            <li>
              Violate the rights of others, including privacy, publicity,
              intellectual property, or contractual rights.
            </li>
            <li>
              Publish spam, deceptive content, malware, or content intended to
              manipulate platform systems.
            </li>
            <li>
              Scrape, resell, broker, enrich, or build independent profiles from
              data obtained through connected platform APIs.
            </li>
            <li>
              Use Meta Platform Data for surveillance, eligibility decisions,
              credit decisions, employment decisions, or advertising targeting
              outside authorized Xocial functionality.
            </li>
            <li>
              Interfere with, probe, overload, reverse engineer, or bypass the
              security or access controls of Xocial.
            </li>
            <li>
              Use connected platform APIs in a way that violates the policies of
              Meta, Facebook, Instagram, or any other integrated service.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            7. AI-Assisted Features
          </h2>
          <p className="leading-7">
            Xocial may offer AI-assisted captions, content ideas, recommendations,
            and analytics summaries. AI output can be incomplete, inaccurate, or
            unsuitable for your brand or audience. You are responsible for
            reviewing and approving AI-assisted content before publishing it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            8. Plans, Billing, and Changes
          </h2>
          <p className="leading-7">
            Some Xocial features may require a paid plan. Pricing, usage limits,
            billing cycles, and included features are shown at sign-up, checkout,
            or inside the product. We may update plans or features over time, and
            we will try to give reasonable notice when a material change affects
            an active paid subscription.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            9. Service Availability
          </h2>
          <p className="leading-7">
            We work to keep Xocial reliable, but the service may occasionally be
            unavailable because of maintenance, updates, incidents, or outages at
            connected platforms and service providers. Publishing, analytics, and
            comments may also depend on third-party APIs that can change or become
            temporarily unavailable.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            10. Privacy and Data Deletion
          </h2>
          <p className="leading-7">
            Our Privacy Policy explains how we collect, use, and protect
            information when you use Xocial or connect social accounts. Please
            review it at
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="https://www.xocial.world/privacy"
            >
              https://www.xocial.world/privacy
            </a>
            .
          </p>
          <p className="leading-7">
            You can request deletion of your Xocial account data or connected
            Meta data at
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="mailto:support@xocial.world"
            >
              support@xocial.world
            </a>
            , or follow the instructions at
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="https://www.xocial.world/data-deletion"
            >
              https://www.xocial.world/data-deletion
            </a>
            . If you remove Xocial from Facebook or Instagram settings, we will
            stop future API access for that connection and delete or anonymize
            eligible Meta Platform Data according to our Privacy Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            11. Suspension and Termination
          </h2>
          <p className="leading-7">
            You may stop using Xocial at any time. We may suspend or limit access
            if we reasonably believe an account is being used in a way that
            violates these Terms, creates risk for Xocial or other users, or could
            violate connected platform policies. When practical, we will provide
            notice and an opportunity to resolve the issue.
          </p>
          <p className="leading-7">
            If your account is terminated or a connected platform requires us to
            remove data, we may delete or disable the affected connection, tokens,
            records, scheduled posts, analytics, or other data as needed to
            comply with platform policy, law, or these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            12. Disclaimers and Responsibility
          </h2>
          <p className="leading-7">
            Xocial is provided as a business software service. We do not promise
            that every post will publish at an exact time, that every third-party
            platform feature will remain available, or that analytics from
            connected platforms will always be complete or error-free. To the
            extent allowed by law, Xocial is not responsible for indirect,
            incidental, or consequential losses arising from use of the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            13. Updates to These Terms
          </h2>
          <p className="leading-7">
            We may update these Terms as Xocial changes. The updated version will
            be posted at
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="https://www.xocial.world/terms"
            >
              https://www.xocial.world/terms
            </a>
            with a revised effective date. If a change is material, we will make
            reasonable efforts to notify account owners or administrators.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            14. Contact Us
          </h2>
          <p className="leading-7">
            If you have questions about these Terms or Xocial, please contact us
            at:
          </p>
          <address className="not-italic leading-7 text-gray-700">
            Xocial
            <br />
            Email:
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="mailto:support@xocial.world"
            >
              support@xocial.world
            </a>
          </address>
        </section>
      </article>
    </main>
  );
}
