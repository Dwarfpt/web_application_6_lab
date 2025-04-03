import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmailInbox.css'; // Создайте этот файл для стилей

const EmailInbox = ({ onClose }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [protocol, setProtocol] = useState('imap');
  const [activeTab, setActiveTab] = useState('imap');

  const fetchEmails = async (selectedProtocol = protocol) => {
    setLoading(true);
    setError(null);
    setActiveTab(selectedProtocol.toLowerCase());
    
    try {
      console.log(`Fetching emails via ${selectedProtocol}...`);
      const endpoint = `/api/email/inbox/${selectedProtocol.toLowerCase()}`;
      
      const response = await axios.get(endpoint, { 
        params: { count: 5 },
        timeout: 45000
      });
      
      console.log(`Emails received: `, response.data);
      const formattedEmails = Array.isArray(response.data) 
        ? response.data 
        : (response.data.emails || []);
        
      setEmails(formattedEmails);
    } catch (err) {
      console.error('Email fetch error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
      setError(`Failed to fetch emails via ${selectedProtocol.toUpperCase()}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    setProtocol(tab);
    fetchEmails(tab);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="email-inbox-container">
      <div className="email-inbox-header">
        <h2>Email Inbox</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="email-tabs">
        <button 
          className={`tab-button ${activeTab === 'imap' ? 'active' : ''}`} 
          onClick={() => handleTabClick('imap')}
        >
          IMAP
        </button>
        <button 
          className={`tab-button ${activeTab === 'pop3' ? 'active' : ''}`} 
          onClick={() => handleTabClick('pop3')}
        >
          POP3
        </button>
        <button className="refresh-button" onClick={() => fetchEmails(protocol)}>
          {loading ? 'Loading...' : 'Check Inbox'}
        </button>
      </div>
      
      {error && (
        <div className="email-error">
          <p>{error}</p>
        </div>
      )}
      
      <div className="email-list">
        {emails.length === 0 && !loading && !error ? (
          <div className="no-emails">
            <p>No emails found. Click "Check Inbox" to fetch emails.</p>
          </div>
        ) : (
          emails.map((email, index) => (
            <div key={index} className="email-item">
              <div className="email-header">
                <span className="email-from">{email.from}</span>
                <span className="email-date">{formatDate(email.date)}</span>
              </div>
              <div className="email-subject">{email.subject}</div>
              <div className="email-preview">{truncateText(email.text)}</div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="loading-spinner">
            <p>Loading emails...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailInbox;