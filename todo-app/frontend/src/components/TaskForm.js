import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { isConnected } = useSocket();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending'
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (isEditMode) {
        try {
          const response = await axios.get(`/api/tasks/${id}`);
          setFormData({
            title: response.data.title,
            description: response.data.description || '',
            status: response.data.status
          });
          setLoading(false);
        } catch (err) {
          setError('Failed to fetch task details');
          setLoading(false);
          console.error(err);
        }
      }
    };

    fetchTask();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditMode) {
        await axios.put(`/api/tasks/${id}`, formData);
      } else {
        await axios.post('/api/tasks', formData);
      }
      navigate('/');
    } catch (err) {
      setError('Failed to save task');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="task-form-container">
      <h2>{isEditMode ? 'Edit Task' : 'Create New Task'}</h2>
      
      <div className={`socket-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Live' : '🔴 Offline'}
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div className="form-footer">
          <Link to="/" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary">{isEditMode ? 'Update' : 'Create'}</button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;