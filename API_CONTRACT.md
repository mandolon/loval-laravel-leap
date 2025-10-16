# Laravel API Contract

This document defines the API endpoints your Laravel backend should implement to integrate with this React frontend.

## Base URL
```
/api
```

## Projects API

### List All Projects
```
GET /api/projects
```
**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "status": "active|archived",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
]
```

### Get Single Project
```
GET /api/projects/{id}
```
**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "status": "active|archived",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

### Create Project
```
POST /api/projects
```
**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "status": "active|archived (optional, defaults to 'active')"
}
```
**Response:** Same as Get Single Project

### Update Project
```
PUT /api/projects/{id}
```
**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "status": "active|archived (optional)"
}
```
**Response:** Same as Get Single Project

### Delete Project
```
DELETE /api/projects/{id}
```
**Response:**
```json
{
  "success": true
}
```
**Note:** Should also delete all tasks associated with this project.

---

## Tasks API

### List All Tasks
```
GET /api/tasks
```
**Query Parameters:**
- `project_id` (optional): Filter tasks by project

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "project_id": "uuid",
    "status": "todo|in_progress|done",
    "priority": "low|medium|high",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
]
```

### Get Single Task
```
GET /api/tasks/{id}
```
**Response:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "project_id": "uuid",
  "status": "todo|in_progress|done",
  "priority": "low|medium|high",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

### Create Task
```
POST /api/tasks
```
**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "project_id": "uuid (required)",
  "status": "todo|in_progress|done (optional, defaults to 'todo')",
  "priority": "low|medium|high (optional, defaults to 'medium')"
}
```
**Response:** Same as Get Single Task

### Update Task
```
PUT /api/tasks/{id}
```
**Request Body:**
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "status": "todo|in_progress|done (optional)",
  "priority": "low|medium|high (optional)"
}
```
**Response:** Same as Get Single Task

### Delete Task
```
DELETE /api/tasks/{id}
```
**Response:**
```json
{
  "success": true
}
```

---

## Integration Instructions

### Step 1: When Ready to Switch to Laravel

1. Build your Laravel API matching the endpoints above
2. Set up CORS in Laravel:
```php
// config/cors.php
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:8080')],
```

### Step 2: Update React App

Replace `src/lib/api/client.ts` with the Laravel API client:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const fetchAPI = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
};

export const api = {
  projects: {
    list: () => fetchAPI('/projects'),
    get: (id: string) => fetchAPI(`/projects/${id}`),
    create: (input) => fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
    update: (id: string, input) => fetchAPI(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    }),
    delete: (id: string) => fetchAPI(`/projects/${id}`, {
      method: 'DELETE'
    }),
  },
  tasks: {
    list: (projectId?: string) => 
      fetchAPI(`/tasks${projectId ? `?project_id=${projectId}` : ''}`),
    get: (id: string) => fetchAPI(`/tasks/${id}`),
    create: (input) => fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
    update: (id: string, input) => fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    }),
    delete: (id: string) => fetchAPI(`/tasks/${id}`, {
      method: 'DELETE'
    }),
  },
};
```

### Step 3: Update Environment Variables

Create `.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### Step 4: Test

Start both servers:
```bash
# Laravel
php artisan serve

# React
npm run dev
```

That's it! Your app is now connected to Laravel with zero component changes needed.

---

## Database Schema Recommendations

### Projects Table
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID NOT NULL,
    status ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```
