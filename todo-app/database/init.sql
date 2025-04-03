CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, description, status) VALUES
    ('Learn Docker', 'Understand the basics of Docker and Docker Compose', 'in-progress'),
    ('Create ToDo App', 'Develop a web application for task management', 'pending'),
    ('Prepare Presentation', 'Prepare a presentation on application containerization', 'completed');