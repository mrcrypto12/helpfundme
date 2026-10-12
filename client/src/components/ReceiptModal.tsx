import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheck, HiOutlinePrinter, HiOutlineShare, HiOutlineXMark } from 'react-icons/hi2';
import { IReceipt } from '../types';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { createReceiptShareImage } from '../utils/receiptShare';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: IReceipt | null;
  loading: boolean;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receipt, loading }) => {
  const [sharing, setSharing] = useState(false);
  if (!isOpen) return null;

  const handleShare = async () => {
    if (!receipt || sharing) return;
    setSharing(true);
    try {
      const image = await createReceiptShareImage(receipt);
      const file = new File([image], 'helpfundme-donation.png', { type: 'image/png' });
      const shareData: ShareData = {
        files: [file],
        title: 'I supported a HelpFundMe campaign',
        text: `I supported ${receipt.campaignTitle} on HelpFundMe.`,
      };
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        const url = URL.createObjectURL(image);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success('Share image downloaded. Attach it to a post or message.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.error('Could not prepare the share image. Please try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="modal-overlay receipt-modal-overlay" onClick={onClose}>
      <div className="modal receipt-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Donation receipt">
        <div className="modal-header receipt-modal-header">
          <h2>Donation receipt</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close receipt"><HiOutlineXMark /></button>
        </div>
        <div className="receipt-modal-body">
          {loading || !receipt ? (
            <div className="loader-container"><div className="loader" /></div>
          ) : (
            <article className="receipt-sheet" id="receipt-content">
              <header className="receipt-brand">
                <div className="receipt-brand-name"><img src="/logos.png" alt="" /><span>{receipt.platformName}</span></div>
                <span className="receipt-brand-label">Donation receipt</span>
              </header>
              <div className="receipt-sheet-body">
                <div className="receipt-success-icon" aria-hidden="true"><HiCheck /></div>
                <p className="receipt-eyebrow">Payment confirmed</p>
                <h3>Thank you for making a difference.</h3>
                <p className="receipt-intro">Your support helps this cause move forward. Keep this receipt for your records.</p>
                <div className="receipt-total-card">
                  <span>Donation amount</span><strong>{formatCurrency(receipt.amount)}</strong><small>{receipt.currency} · Paid</small>
                </div>
                <div className="receipt-details">
                  <div className="receipt-details-heading"><span>Donation details</span><span>{receipt.receiptNumber}</span></div>
                  <div className="receipt-detail-row"><span>Supporting</span><strong>{receipt.campaignTitle}</strong></div>
                  <div className="receipt-detail-row"><span>Donation type</span><strong>{receipt.type === 'platform' ? 'Platform fund' : 'Campaign donation'}</strong></div>
                  <div className="receipt-detail-row"><span>Donor</span><strong>{receipt.donorName}</strong></div>
                  {receipt.donorEmail && <div className="receipt-detail-row"><span>Email</span><strong>{receipt.donorEmail}</strong></div>}
                  <div className="receipt-detail-row"><span>Recorded on</span><strong>{formatDateTime(receipt.date)}</strong></div>
                  <div className="receipt-detail-row receipt-reference"><span>Payment reference</span><strong>{receipt.paymentRef}</strong></div>
                  <div className="receipt-detail-row receipt-detail-total"><span>Total paid</span><strong>{formatCurrency(receipt.amount)}</strong></div>
                </div>
                <p className="receipt-note">This confirms a successful donation processed through HelpFundMe. It is not a tax-deductibility certificate.</p>
              </div>
              <footer className="receipt-sheet-footer"><strong>HelpFundMe</strong><span>By Forgetech Limited · Thank you for helping someone today.</span></footer>
            </article>
          )}
        </div>
        <div className="modal-footer receipt-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-secondary" onClick={handleShare} disabled={!receipt || loading || sharing}>
            <HiOutlineShare />{sharing ? 'Preparing...' : 'Share image'}
          </button>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!receipt || loading}><HiOutlinePrinter /> Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
