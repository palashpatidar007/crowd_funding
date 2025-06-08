# Local Charity Hub

A full-stack web application for managing and supporting local charity campaigns.

## Tech Stack

### Frontend
- React with TypeScript
- Material UI for styling
- React Router for navigation
- Axios for API calls

### Backend
- Node.js with Express
- TypeScript
- CORS support

## 🚀 Quick Start with uv (Python + Node.js)

This project supports [uv](https://github.com/astral-sh/uv) for fast, reproducible installs for both Python and Node.js.

### 1. Install uv (if not already installed)
```sh
curl -Ls https://astral.sh/uv/install.sh | sh
```

### 2. Create and activate a Python virtual environment
```sh
uv venv .venv
source .venv/bin/activate
```

### 3. Install Python dependencies
```sh
uv pip sync  # Installs from requirements.txt into .venv
```

### 4. Install Node.js dependencies (in both client and server)
```sh
cd server
uv npm install

cd ../client
uv npm install
```

### 5. Run the project

#### Backend
```sh
cd server
uv npm run dev
```

#### Frontend
```sh
cd client
uv npm start
```

---

- You get a fully isolated Python environment (`.venv`).
- Node.js dependencies are managed with `uv npm install`.
- All team members can use the same commands for a reproducible setup.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the frontend development server:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

- Homepage with hero section and call-to-action
- Campaigns page displaying active charity campaigns
- Responsive design with Material UI components
- RESTful API endpoints for campaign data 