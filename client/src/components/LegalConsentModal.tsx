import React, { useState } from 'react';

export const TERMS_VERSION = '2026-09-20';

const LegalConsentModal: React.FC<{ onAccept: () => void; onCancel?: () => void }> = ({ onAccept, onCancel }) => {
  const [reachedEnd, setReachedEnd] = useState(false);
  return <div className="modal-overlay">
    <div className="modal" style={{ maxWidth: 650 }}>
      <div className="modal-header"><h2>Terms of Service & Privacy Notice</h2></div>
      <div onScroll={(e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setReachedEnd(true); }} style={{ maxHeight: '55vh', overflowY: 'auto', padding: 20, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        <p><strong>Effective date:</strong> 20 September 2026 · <strong>Operator:</strong> Forgex Company Limited (“HelpFundMe”, “we”, “us”).</p>
        <h3>1. Platform purpose</h3><p>HelpFundMe enables users to submit donation campaigns and donors to make voluntary contributions. Donations are not investments, loans, deposits, or guarantees of a particular outcome.</p>
        <h3>2. Account promises</h3><p>You must provide accurate information, protect your account, be legally capable of agreeing to these terms, and promptly correct information that becomes inaccurate. Impersonation, stolen documents, misleading claims, unlawful activity, harassment, and misuse of funds are prohibited.</p>
        <h3>3. Campaign verification</h3><p>Campaign creators authorize us to review identity, contact, relationship, consent, financial, medical, educational, emergency, community, and other supporting evidence. We may contact issuers, hospitals, schools, witnesses, authorities, beneficiaries, or representatives where lawful and appropriate. A “verified” or “approved” label means specified checks were completed; it is not a guarantee that every statement is true or that a campaign will achieve its goal.</p>
        <h3>4. Sensitive information and consent</h3><p>Do not publish another person’s medical, identity, or private information without their informed authority. A parent or lawful guardian must consent where a child is involved. We may redact or withhold sensitive documents from public display while allowing trained reviewers access.</p>
        <h3>5. Donations, suspension, refunds and disputes</h3><p>Only approved campaigns may receive donations. We may pause, suspend, reject, investigate, or remove a campaign; delay disbursement; preserve evidence; cooperate with payment providers or authorities; and notify affected donors. Refund eligibility depends on payment status, available funds, provider rules, applicable law, and the outcome of review. Contact support promptly about an unauthorized charge or dispute.</p>
        <h3>6. Reports and fair process</h3><p>Users may confidentially report a campaign. We avoid public accusations before review, restrict reports to authorized personnel, and ordinarily give the affected person a reasonable opportunity to respond unless doing so would create legal, safety, or evidence-preservation risk.</p>
        <h3>7. Privacy notice</h3><p>We process account information, identity and verification records, campaign evidence, payment references, communications, device/security logs, reports, and support records to operate the service, prevent fraud, comply with law, protect users, and resolve disputes. Payment-card details are handled by the payment provider rather than stored by HelpFundMe.</p>
        <p>We may share necessary information with payment processors, cloud and security providers, professional advisers, verification sources, regulators, courts, and law-enforcement bodies where lawful. We apply access controls and retention limits, but no online system can promise absolute security.</p>
        <h3>8. Retention and user rights</h3><p>We retain information only as long as reasonably needed for the service, fraud prevention, disputes, financial records, safety, and legal duties. Subject to applicable law, you may request access, correction, objection, restriction, portability, or deletion. Some records may need to be retained despite account closure.</p>
        <h3>9. Content licence and responsibility</h3><p>You remain responsible for campaign content and grant us a limited licence to host, format, review, display, and distribute it for operating and promoting the campaign. You must have rights and consent for all uploaded content.</p>
        <h3>10. Changes and contact</h3><p>Material policy changes will require renewed acceptance where appropriate. These terms are governed by applicable Ghanaian law. Questions, privacy requests, appeals, and complaints should be sent through HelpFundMe support channels.</p>
        <p><strong>Scroll to the end to enable acceptance.</strong></p>
      </div>
      <div className="modal-footer"><button className="btn btn-secondary" onClick={onCancel}>Cancel</button><button className="btn btn-primary" disabled={!reachedEnd} onClick={onAccept}>I have read and accept</button></div>
    </div>
  </div>;
};
export default LegalConsentModal;
