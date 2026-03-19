import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Legacy",
  description: "Privacy Policy for Legacy: Post-Ramadan Habit Tracker",
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        background: "var(--background)",
        minHeight: "100vh",
        color: "var(--foreground)",
        fontFamily: "var(--font-sans, Inter, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {/* Back link */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            ← Back to Legacy
          </Link>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 42,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "var(--foreground)",
            marginBottom: 12,
          }}
        >
          Privacy Policy
        </h1>

        <p
          style={{
            color: "var(--foreground-muted)",
            fontSize: 14,
            marginBottom: 48,
          }}
        >
          Effective date: March 2026
        </p>

        {/* Section: Introduction */}
        <Section label="Introduction">
          <p>
            Legacy (&#8220;the app&#8221;, &#8220;we&#8221;, &#8220;us&#8221;) is a habit tracker
            that helps Muslims carry the spiritual momentum of Ramadan into their
            daily lives. This Privacy Policy explains what data we collect, how
            we use it, and your rights with respect to that data.
          </p>
          <p style={{ marginTop: 12 }}>
            By creating an account or using Legacy, you agree to the practices
            described in this policy.
          </p>
        </Section>

        {/* Section: Data We Collect */}
        <Section label="Data We Collect">
          <p>We collect the following information when you use Legacy:</p>
          <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>Google account information</strong> — your name, email
              address, and profile picture, provided when you sign in with
              Google OAuth.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Habit data</strong> — the habits you create, your
              Ramadan-era targets, the step-down goals you accept, and your
              daily check-in history.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Streak data</strong> — your current streak, longest
              streak, and total completions.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Shawwal fasting data</strong> — your Shawwal fast
              check-in records, if you use that feature.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Circle membership</strong> — if you join or create a
              private circle (halaqa), we store your membership and the
              circle&#8217;s name.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>AI plan content</strong> — personalized step-down
              suggestions generated for your habits via Google Gemini AI.
            </li>
          </ul>
          <p style={{ marginTop: 16 }}>
            We do not collect location data, contact lists, payment
            information, or any sensitive device permissions.
          </p>
        </Section>

        {/* Section: How We Use Your Data */}
        <Section label="How We Use Your Data">
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>Display your profile</strong> — your name and avatar are
              shown to you and to members of any circle you belong to.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Store your habits and history</strong> — check-in
              records, streaks, and Shawwal fasts are stored so you can track
              progress over time.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Generate AI plans</strong> — your habit names and
              Ramadan targets are sent to Google Gemini to generate
              personalized step-down suggestions. This data is used only to
              generate your plan and is not stored by Google for training
              without your separate consent under their API terms.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Circle activity feed</strong> — circle members can see
              your name, avatar, and whether you completed your habits on a
              given day. Specific habit names and check-in details are not
              visible to other members.
            </li>
          </ul>
        </Section>

        {/* Section: Third-Party Services */}
        <Section label="Third-Party Services">
          <p>Legacy uses the following third-party services:</p>
          <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>Supabase</strong> — database, authentication, and storage.
              Your data is stored in Supabase&#8217;s managed PostgreSQL
              database. See{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                supabase.com/privacy
              </a>
              .
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Google OAuth</strong> — sign-in is handled via Google
              Identity Services. See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)" }}
              >
                policies.google.com/privacy
              </a>
              .
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Google Gemini AI</strong> — your habit names and targets
              are sent to the Gemini API to generate step-down plans. Requests
              are made server-side. See Google&#8217;s API usage policies for
              details.
            </li>
            <li style={{ marginTop: 8 }}>
              <strong>Vercel</strong> — the app is hosted on Vercel&#8217;s
              platform. Standard server access logs may be retained per
              Vercel&#8217;s policy.
            </li>
          </ul>
        </Section>

        {/* Section: Data Sharing */}
        <Section label="Data Sharing">
          <p>
            We do not sell your personal data. We do not share your data with
            advertisers, data brokers, or any third parties for marketing
            purposes.
          </p>
          <p style={{ marginTop: 12 }}>
            Your data is shared only:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              With the infrastructure providers listed above (Supabase, Google,
              Vercel) strictly to operate the app.
            </li>
            <li style={{ marginTop: 8 }}>
              With members of a circle you join — limited to your display name,
              avatar, and daily completion status (not habit details).
            </li>
          </ul>
        </Section>

        {/* Section: Data Retention */}
        <Section label="Data Retention">
          <p>
            Your data is stored for as long as your account is active. If you
            would like to delete your account and all associated data, please
            contact us at{" "}
            <a
              href="mailto:privacy@joinlegacy.app"
              style={{ color: "var(--accent)" }}
            >
              privacy@joinlegacy.app
            </a>{" "}
            and we will delete your records within 30 days.
          </p>
        </Section>

        {/* Section: Your Rights */}
        <Section label="Your Rights">
          <p>You have the right to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Access the personal data we hold about you.</li>
            <li style={{ marginTop: 8 }}>
              Request correction of inaccurate data.
            </li>
            <li style={{ marginTop: 8 }}>
              Request deletion of your account and all data.
            </li>
            <li style={{ marginTop: 8 }}>
              Withdraw consent to AI plan generation (by not using that
              feature).
            </li>
          </ul>
          <p style={{ marginTop: 12 }}>
            To exercise any of these rights, email us at{" "}
            <a
              href="mailto:privacy@joinlegacy.app"
              style={{ color: "var(--accent)" }}
            >
              privacy@joinlegacy.app
            </a>
            .
          </p>
        </Section>

        {/* Section: Children */}
        <Section label="Children's Privacy">
          <p>
            Legacy is not directed at children under the age of 13. We do not
            knowingly collect personal data from children under 13. If you
            believe a child under 13 has provided us with personal information,
            please contact us and we will delete it promptly.
          </p>
        </Section>

        {/* Section: Changes */}
        <Section label="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will post
            any changes on this page with an updated effective date. Continued
            use of Legacy after changes constitutes your acceptance of the
            revised policy.
          </p>
        </Section>

        {/* Section: Contact */}
        <Section label="Contact">
          <p>
            If you have questions about this Privacy Policy or how we handle
            your data, please contact:
          </p>
          <p style={{ marginTop: 12 }}>
            <strong>Legacy</strong>
            <br />
            Email:{" "}
            <a
              href="mailto:privacy@joinlegacy.app"
              style={{ color: "var(--accent)" }}
            >
              privacy@joinlegacy.app
            </a>
          </p>
        </Section>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid var(--surface-border)",
            marginTop: 48,
            paddingTop: 24,
            color: "var(--foreground-muted)",
            fontSize: 13,
          }}
        >
          Legacy — Post-Ramadan Habit Tracker &nbsp;·&nbsp; privacy@joinlegacy.app
        </div>
      </div>
    </div>
  );
}

/* ── helper component ── */
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 10,
        }}
      >
        {label}
      </p>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.75,
          color: "var(--foreground)",
        }}
      >
        {children}
      </div>
    </section>
  );
}
