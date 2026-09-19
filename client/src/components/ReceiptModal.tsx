import React from 'react';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { IReceipt } from '../types';
import { HiOutlineXMark, HiOutlinePrinter } from 'react-icons/hi2';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: IReceipt | null;
  loading: boolean;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receipt, loading }) => {
  if (!isOpen) return null;

  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>Donation Receipt</h2>
          <button className="modal-close" onClick={onClose}><HiOutlineXMark /></button>
        </div>
        <div className="modal-body">
          {loading || !receipt ? (
            <div className="loader-container"><div className="loader" /></div>
          ) : (
            <div id="receipt-content">
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    width: 48, height: 48, background: 'var(--gradient-primary)',
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, color: '#fff',
                    margin: '0 auto 8px', fontSize: '1.2rem',
                  }}
                >
                  H
                </div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{receipt.platformName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Official Donation Receipt</div>
              </div>

              <div className="info-box">
                <div className="info-box-row"><span className="info-box-label">Receipt No.</span><span className="info-box-value">{receipt.receiptNumber}</span></div>
                <div className="info-box-row"><span className="info-box-label">Date</span><span className="info-box-value">{formatDateTime(receipt.date)}</span></div>
                <div className="info-box-row"><span className="info-box-label">Donor</span><span className="info-box-value">{receipt.donorName}</span></div>
                {receipt.donorEmail && (
                  <div className="info-box-row"><span className="info-box-label">Email</span><span className="info-box-value">{receipt.donorEmail}</span></div>
                )}
                <div className="info-box-row"><span className="info-box-label">Campaign</span><span className="info-box-value">{receipt.campaignTitle}</span></div>
                <div className="info-box-row"><span className="info-box-label">Type</span><span className="info-box-value">{receipt.type === 'platform' ? 'Platform Fund' : 'Direct Donation'}</span></div>
                <div className="info-box-row"><span className="info-box-label">Transaction Ref</span><span className="info-box-value">{receipt.paymentRef}</span></div>
                <div className="info-box-row">
                  <span className="info-box-label">Amount</span>
                  <span className="info-box-value" style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{formatCurrency(receipt.amount)}</span>
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
                Thank you for your generosity. This receipt confirms your donation via {receipt.platformName}.
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint} disabled={!receipt}>
            <HiOutlinePrinter /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;