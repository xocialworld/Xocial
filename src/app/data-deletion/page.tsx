import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Data Deletion Instructions | Xocial",
  description:
    "Instructions for disconnecting Facebook or Instagram from Xocial and requesting deletion of data associated with Meta integrations.",
};

const lastUpdated = "May 13, 2026";
const supportEmail = "support@xocial.world";

export default function DataDeletionInstructionsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <article className="space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            User Data Deletion
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Xocial User Data Deletion Instructions
          </h1>
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
          <p className="text-base leading-7">
            This page explains how Xocial users can disconnect Facebook or
            Instagram integrations and request deletion of data associated with
            those connected Meta accounts. It is provided as Xocial&apos;s Meta
            Data Deletion Instructions URL for users and for Meta App Review.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            1. Disconnect Facebook or Instagram from Xocial
          </h2>
          <p className="leading-7">
            If you want Xocial to stop accessing a Facebook Page, Instagram
            Business account, or related Meta account, remove the integration
            from your Xocial account settings:
          </p>
          <ol className="list-decimal space-y-2 pl-6 leading-7">
            <li>Sign in to your Xocial account.</li>
            <li>Open Settings and go to Connected Accounts or Integrations.</li>
            <li>Find the connected Facebook or Instagram account.</li>
            <li>Select Disconnect, Remove, or Revoke access.</li>
          </ol>
          <p className="leading-7">
            You can also revoke Xocial&apos;s Meta permissions directly from
            Facebook. When signed in to Facebook, go to Settings and privacy,
            then Settings, then Apps and Websites or Business Integrations. You
            may also use this direct link:
            <a
              className="ml-1 text-blue-600 hover:underline"
              href="https://www.facebook.com/settings?tab=business_tools"
              rel="noopener noreferrer"
              target="_blank"
            >
              facebook.com/settings?tab=business_tools
            </a>
            . If the app appears under Apps and Websites instead, remove Xocial
            there. After access is revoked, Xocial can no longer retrieve new
            data from that Facebook or Instagram connection.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            2. Request Deletion of Your Data
          </h2>
          <p className="leading-7">
            To request deletion of data stored by Xocial, send a deletion
            request from the email address associated with your Xocial account.
            Send your request to
            <a
              className="ml-1 font-semibold text-blue-600 hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
          <p className="leading-7">
            Include the following details so we can locate the correct records:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Your Xocial account email address.</li>
            <li>The workspace name, if applicable.</li>
            <li>
              The Facebook Page, Instagram Business account, or Meta Business
              account you want removed.
            </li>
            <li>
              Whether you want only the Meta-connected account data deleted or
              the full Xocial account deleted.
            </li>
          </ul>
          <p className="leading-7">
            We will verify ownership before deleting data. Deletion requests are
            normally processed within 30 days and no later than 90 days for
            Meta Platform Data unless a shorter period is required by applicable
            law or retention is permitted because the data is required for legal,
            security, fraud-prevention, dispute-resolution, or billing purposes,
            or has been aggregated or anonymized so it can no longer reasonably
            identify you or your connected account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            3. Requests Sent Through Meta
          </h2>
          <p className="leading-7">
            If you remove Xocial from your Facebook or Instagram settings or use
            Meta tools to request deletion, Meta may notify Xocial that deletion
            is required for the app-scoped user or connected account. When we
            receive a valid deletion request through Meta tools, developer
            notifications, or a configured data deletion callback, we identify
            the matching Xocial records and delete or anonymize eligible
            Meta-connected data according to this page and our Privacy Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            4. Data We Delete
          </h2>
          <p className="leading-7">
            When you disconnect a Meta account or request deletion of
            Meta-connected data, Xocial deletes or anonymizes data we store for
            that connection, including:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Facebook or Instagram access tokens and refresh credentials.</li>
            <li>
              Connected Page, profile, account, and business identifiers stored
              for integration purposes.
            </li>
            <li>
              Imported profile details such as account names, usernames, avatars,
              and granted permission metadata.
            </li>
            <li>
              Cached analytics, insights, comments, mentions, engagement
              records, and synchronization history retrieved through Meta APIs.
            </li>
            <li>
              Drafts, scheduled posts, media references, or publishing records
              that are specifically tied to the disconnected Meta account, when
              deletion of those records is requested.
            </li>
            <li>
              OAuth state, connection logs, and permission records that are no
              longer needed for security, troubleshooting, or compliance.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            5. Data We May Retain
          </h2>
          <p className="leading-7">
            Some information may be retained when required for security, legal,
            billing, fraud prevention, dispute resolution, or audit purposes.
            Retained records are limited to what is necessary and are no longer
            used to access your Facebook or Instagram account. Examples include:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Billing, invoice, payment, or subscription records.</li>
            <li>Security logs and abuse-prevention records.</li>
            <li>Support communications related to the deletion request.</li>
            <li>
              Aggregated or anonymized analytics that cannot reasonably identify
              you or your Meta account.
            </li>
            <li>
              Content that has already been published to Facebook or Instagram,
              which must be removed directly on those platforms unless Xocial
              still has permission and the feature is available.
            </li>
          </ul>
          <p className="leading-7">
            Retained information is not used to continue accessing your Facebook
            or Instagram account after the integration is disconnected or
            revoked.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            6. Confirmation
          </h2>
          <p className="leading-7">
            After your deletion request is completed, we will send confirmation
            to the email address associated with your Xocial account. If we need
            more information to verify the request, we will contact you before
            taking action.
          </p>
          <p className="leading-7">
            For questions about this deletion process, contact
            <a
              className="ml-1 font-semibold text-blue-600 hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
