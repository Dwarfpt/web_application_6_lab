import React, { useState } from 'react';
import axios from 'axios';

const EmailForm = ({ taskId, taskTitle, onClose }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: `Task Information: ${taskTitle}`,
    protocol: 'smtp'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/email/send', {
        ...emailData,
        taskId: taskId
      });
      
      setSuccess(true);
      setLoading(false);
      
      setTimeout(() => {
        setSuccess(false);
        if (onClose) onClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send email');
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <div className="email-form">
      <h3>Send Task Information via Email</h3>
      
      {success ? (
        <div className="success-message">
          <p>Email has been sent successfully using {emailData.protocol.toUpperCase()}!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="to">Recipient Email:</label>
            <input
              type="email"
              id="to"
              name="to"
              value={emailData.to}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subject">Subject:</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="protocol">Email Protocol:</label>
            <select
              id="protocol"
              name="protocol"
              value={emailData.protocol}
              onChange={handleChange}
              className="form-control"
            >
              <option value="smtp">SMTP (Send Mail)</option>
              <option value="imap" disabled>IMAP (Retrieve Mail)</option>
              <option value="pop3" disabled>POP3 (Retrieve Mail)</option>
            </select>
            <small className="form-text text-muted">
              Note: Only SMTP is available for sending emails. IMAP and POP3 are for receiving emails.
            </small>
          </div>
          
          <div className="form-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
          
          {error && <div className="error">{error}</div>}
        </form>
      )}
    </div>
  );
};

export default EmailForm;