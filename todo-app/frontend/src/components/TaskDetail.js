import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import EmailForm from './EmailForm';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/tasks/${id}`);
        setTask(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch task details');
        setLoading(false);
        console.error(err);
      }
    };

    fetchTask();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`http://localhost:5000/api/tasks/${id}`);
        navigate('/');
      } catch (err) {
        setError('Failed to delete task');
        console.error(err);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="task-detail">
      <h2>Task Details</h2>
      <div className="task-card">
        <h3>{task.title}</h3>
        <p className="status">Status: <span className={task.status}>{task.status}</span></p>
        <div className="description">
          <h4>Description:</h4>
          <p>{task.description || 'No description provided'}</p>
        </div>
        <div className="task-actions">
          <Link to="/" className="btn btn-secondary">Back to List</Link>
          <Link to={`/task/${task.id}`} className="btn btn-warning">Edit</Link>
          <button onClick={() => setShowEmailForm(true)} className="btn btn-info">Email</button>
          <button onClick={handleDelete} className="btn btn-danger">Delete</button>
        </div>
      </div>
      {showEmailForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <EmailForm 
              taskId={task.id} 
              taskTitle={task.title}
              onClose={() => setShowEmailForm(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;