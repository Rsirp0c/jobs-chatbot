# Jobs Chatbot

## Introduction

Welcome to the **Jobs Chatbot** project! This application is designed to assist users in finding job opportunities through an interactive chatbot interface. Built using **Next.js** for the frontend and **FastAPI** for the backend, this project leverages modern web technologies to provide a seamless user experience.

## Basic Architecture

The architecture of the Jobs Chatbot is divided into two main components: the **Frontend** and the **Backend**.

### Frontend

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS

The frontend is responsible for rendering the user interface and handling user interactions. It consists of several key components:

- **Chat Interface**: The main component where users can interact with the chatbot.
- **Job Matches**: Displays job listings based on user queries.
- **UI Components**: Reusable components such as buttons, modals, and tooltips are built using Radix UI and styled with Tailwind CSS.

### Backend

- **Framework**: FastAPI
- **Language**: Python

The backend handles API requests and responses. It is responsible for:

- **Job Search Logic**: Processes user queries and fetches job listings from external sources.
- **CORS Middleware**: Allows cross-origin requests from the frontend.
- **API Endpoints**: Provides endpoints for the frontend to interact with, including job search and user interactions.

### Highlights Features
- **Agentic**: use different response formats for different user queries
- **Job search**: fetch job listings from external sources
- **Citation**: provide citation in LLM response

### Project Structure

The project is organized as follows:

```
frontend/
├── components/          # Reusable UI components
├── pages/               # Next.js pages
├── styles/              # Global styles
├── public/              # Static assets
└── utils/               # Utility functions

backend/
├── app/
│   ├── api/            # API routes
│   ├── core/           # Core application logic
│   └── schemas/        # Data models and schemas
└── main.py             # Entry point for the FastAPI application
```

## Getting Started

To get started with the Jobs Chatbot project, follow these steps:

1. **Clone the repository**:
   ```
   git clone https://github.com/Rsirp0c/jobs-chatbot
   ```

2. **Navigate to the frontend directory** and install dependencies:
   ```
   cd frontend
   npm install
   ```

3. **Navigate to the backend directory** and install dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```

4. **Run the frontend**:
   ```
   npm run dev
   ```

5. **Run the backend**:
   ```
   uvicorn app.main:app --reload
   ```

Now you can access the application at `http://localhost:3000`!

