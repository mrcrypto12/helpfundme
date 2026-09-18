import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import { GHANA_REGIONS } from '../../types';
import toast from 'react-hot-toast';
import { HiOutlineCloudArrowUp, HiOutlineXMark, HiOutlinePlusCircle } from 'react-icons/hi2';

const STEPS = ['Basic Info', 'Financial', 'Details', 'Location', 'Images', 'Review'];

interface FundBreakdownRow { label: string; amount: string; }

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '', description: '', purpose: '',
    targetAmount: '', severity: 'medium', category: 'medical',
    isSurgery: false,
    surgeryDetails: { hospital: '', duration: '', sessions: '', description: '' },
    location: { city: '', region: 'Greater Accra' },
    beneficiary: { name: '', relationship: '', phone: '' },
    raisingForSelf: true,
  });
  const [fundRows, setFundRows] = useState<FundBreakdownRow[]>([{ label: '', amount: '' }]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
    onDrop: (accepted) => setImages((prev) => [...prev, ...accepted].slice(0, 5)),
    onDropRejected: () => toast.error('Invalid file. Max 5 images, 5MB each.'),
  });

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const update = (field: string, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));
  const updateSurgery = (field: string, value: any) => setFormData((prev) => ({ ...prev, surgeryDetails: { ...prev.surgeryDetails, [field]: value } }));
  const updateLocation = (field: string, value: any) => setFormData((prev) => ({ ...prev, location: { ...prev.location, [field]: value } }));
  const updateBeneficiary = (field: string, value: any) => setFormData((prev) => ({ ...prev, beneficiary: { ...prev.beneficiary, [field]: value } }));

  const updateFundRow = (i: number, field: keyof FundBreakdownRow, value: string) => {
    setFundRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const addFundRow = () => setFundRows((prev) => [...prev, { label: '', amount: '' }]);
  const removeFundRow = (i: number) => setFundRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.purpose || !formData.targetAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('purpose', formData.purpose);
      fd.append('targetAmount', formData.targetAmount);
      fd.append('severity', formData.severity);
      fd.append('category', formData.category);
      fd.append('isSurgery', String(formData.isSurgery));
      if (formData.isSurgery) fd.append('surgeryDetails', JSON.stringify(formData.surgeryDetails));
      fd.append('location', JSON.stringify(formData.location));

      if (!formData.raisingForSelf && formData.beneficiary.name.trim()) {
        fd.append('beneficiary', JSON.stringify({ ...formData.beneficiary, verified: false }));
      }

      const validFundRows = fundRows
        .filter((r) => r.label.trim() && parseFloat(r.amount) > 0)
        .map((r) => ({ label: r.label, amount: parseFloat(r.amount), spent: false }));
      if (validFundRows.length > 0) {
        fd.append('fundBreakdown', JSON.stringify(validFundRows));
      }

      images.forEach((img) => fd.append('images', img));

      await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Post submitted for review!');
      navigate('/my-posts');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return formData.title && formData.description && formData.purpose;
      case 1: return formData.targetAmount && parseFloat(formData.targetAmount) > 0;
      case 3: return formData.location.city && formData.location.region;
      default: return true;
    }
  };

  const fundTotal = fundRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="page-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>Create Help Post</h1>
        <p>Tell people about your situation and how they can help</p>
      </div>

      <div className="form-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`form-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
              <div className="form-step-number">{i < step ? '✓' : i + 1}</div>
              <span className="form-step-label">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`form-step-connector ${i < step ? 'active' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {step === 0 && (
          <>
            <div className="form-group">
              <label className="form-label">Title <span className="required">*</span></label>
              <input className="form-input" placeholder="E.g. Help Ama get her surgery" value={formData.title} onChange={(e) => update('title', e.target.value)} maxLength={200} />
            </div>
            <div className="form-group">
              <label className="form-label">Description <span className="required">*</span></label>
              <textarea className="form-input form-textarea" placeholder="Describe the situation in detail..." value={formData.description} onChange={(e) => update('description', e.target.value)} maxLength={5000} rows={6} />
              <div className="form-helper">{formData.description.length}/5000 characters</div>
            </div>
            <div className="form-group">
              <label className="form-label">Purpose / Reason for Help <span className="required">*</span></label>
              <textarea className="form-input form-textarea" placeholder="Why do you need help? How will the funds be used?" value={formData.purpose} onChange={(e) => update('purpose', e.target.value)} maxLength={2000} rows={4} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label">Target Amount (GHS) <span className="required">*</span></label>
              <input type="number" className="form-input" placeholder="e.g. 5000" value={formData.targetAmount} onChange={(e) => update('targetAmount', e.target.value)} min="1" />
              <div className="form-helper">How much do you need to raise?</div>
            </div>
            <div className="form-group">
              <label className="form-label">Category <span className="required">*</span></label>
              <select className="form-input form-select" value={formData.category} onChange={(e) => update('category', e.target.value)}>
                <option value="medical">Medical</option>
                <option value="education">Education</option>
                <option value="housing">Housing</option>
                <option value="emergency">Emergency</option>
                <option value="funeral">Funeral</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select className="form-input form-select" value={formData.severity} onChange={(e) => update('severity', e.target.value)}>
                <option value="low">Low — Not urgent but needs support</option>
                <option value="medium">Medium — Needs attention soon</option>
                <option value="high">High — Urgent situation</option>
                <option value="critical">Critical — Life-threatening or immediate need</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.isSurgery} onChange={(e) => update('isSurgery', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                <span className="form-label" style={{ margin: 0 }}>This involves a surgical operation</span>
              </label>
            </div>
            {formData.isSurgery && (
              <>
                <div className="form-group">
                  <label className="form-label">Hospital Name</label>
                  <input className="form-input" placeholder="e.g. Korle Bu Teaching Hospital" value={formData.surgeryDetails.hospital} onChange={(e) => updateSurgery('hospital', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Duration per Session</label>
                    <input className="form-input" placeholder="e.g. 3 hours" value={formData.surgeryDetails.duration} onChange={(e) => updateSurgery('duration', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Sessions</label>
                    <input type="number" className="form-input" placeholder="e.g. 2" value={formData.surgeryDetails.sessions} onChange={(e) => updateSurgery('sessions', e.target.value)} min="1" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Surgery Description</label>
                  <textarea className="form-input form-textarea" placeholder="Describe the operation..." value={formData.surgeryDetails.description} onChange={(e) => updateSurgery('description', e.target.value)} rows={3} />
                </div>
              </>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

            {/* Beneficiary */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!formData.raisingForSelf}
                  onChange={(e) => update('raisingForSelf', !e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span className="form-label" style={{ margin: 0 }}>I'm raising funds on behalf of someone else</span>
              </label>
            </div>
            {!formData.raisingForSelf && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Beneficiary's Name</label>
                  <input className="form-input" value={formData.beneficiary.name} onChange={(e) => updateBeneficiary('name', e.target.value)} placeholder="e.g. Ama Serwaa" />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Relationship</label>
                  <input className="form-input" value={formData.beneficiary.relationship} onChange={(e) => updateBeneficiary('relationship', e.target.value)} placeholder="e.g. Daughter, Friend" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Beneficiary's Phone (optional)</label>
                  <input className="form-input" value={formData.beneficiary.phone} onChange={(e) => updateBeneficiary('phone', e.target.value)} placeholder="+233..." />
                </div>
              </div>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

            {/* Fund Breakdown */}
            <label className="form-label">Where Your Money Goes (optional)</label>
            <div className="form-helper" style={{ marginBottom: 12 }}>Break down what the funds will cover — donors trust campaigns with a clear plan.</div>
            {fundRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <input
                  className="form-input"
                  placeholder="e.g. Hospital fees"
                  value={row.label}
                  onChange={(e) => updateFundRow(i, 'label', e.target.value)}
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => updateFundRow(i, 'amount', e.target.value)}
                  style={{ flex: 1 }}
                  min="0"
                />
                {fundRows.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeFundRow(i)}><HiOutlineXMark /></button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addFundRow} style={{ marginTop: 4 }}>
              <HiOutlinePlusCircle /> Add line item
            </button>
            {fundTotal > 0 && (
              <div className="form-helper" style={{ marginTop: 10 }}>
                Breakdown total: GHS {fundTotal.toLocaleString()}
                {formData.targetAmount && fundTotal > parseFloat(formData.targetAmount) && (
                  <span style={{ color: 'var(--red-light)' }}> — exceeds your target amount</span>
                )}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="form-group">
              <label className="form-label">City / Town <span className="required">*</span></label>
              <input className="form-input" placeholder="e.g. Kumasi" value={formData.location.city} onChange={(e) => updateLocation('city', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Region <span className="required">*</span></label>
              <select className="form-input form-select" value={formData.location.region} onChange={(e) => updateLocation('region', e.target.value)}>
                {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps()} />
              <div className="dropzone-icon"><HiOutlineCloudArrowUp /></div>
              <div className="dropzone-text">Drag & drop images here, or click to browse</div>
              <div className="dropzone-hint">Up to 5 images, max 5MB each (JPEG, PNG, GIF, WebP)</div>
            </div>
            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((img, i) => (
                  <div key={i} className="image-preview">
                    <img src={URL.createObjectURL(img)} alt="" />
                    <button className="remove-btn" onClick={() => removeImage(i)}><HiOutlineXMark /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h3 style={{ marginBottom: '16px' }}>Review Your Post</h3>
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <div className="info-box-row"><span className="info-box-label">Title</span><span className="info-box-value">{formData.title}</span></div>
              <div className="info-box-row"><span className="info-box-label">Category</span><span className="info-box-value">{formData.category}</span></div>
              <div className="info-box-row"><span className="info-box-label">Target</span><span className="info-box-value">GHS {formData.targetAmount}</span></div>
              <div className="info-box-row"><span className="info-box-label">Severity</span><span className="info-box-value">{formData.severity}</span></div>
              <div className="info-box-row"><span className="info-box-label">Location</span><span className="info-box-value">{formData.location.city}, {formData.location.region}</span></div>
              <div className="info-box-row"><span className="info-box-label">Surgery</span><span className="info-box-value">{formData.isSurgery ? 'Yes' : 'No'}</span></div>
              {!formData.raisingForSelf && formData.beneficiary.name && (
                <div className="info-box-row"><span className="info-box-label">Beneficiary</span><span className="info-box-value">{formData.beneficiary.name} ({formData.beneficiary.relationship})</span></div>
              )}
              {fundTotal > 0 && (
                <div className="info-box-row"><span className="info-box-label">Fund Breakdown Total</span><span className="info-box-value">GHS {fundTotal.toLocaleString()}</span></div>
              )}
              <div className="info-box-row"><span className="info-box-label">Images</span><span className="info-box-value">{images.length} uploaded</span></div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ⓘ Your post will be reviewed by our team before it goes live. This usually takes 24-48 hours.
            </p>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', gap: '12px' }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Continue
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : '🚀 Submit Post'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;