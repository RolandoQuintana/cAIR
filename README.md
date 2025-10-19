# cAir - AI Concierge MVP

A simplified full-stack web application that provides users with specialized AI-powered concierge services for different domains such as travel planning and wedding coordination.

## Project Structure

```
├── cair_backend/          # Django REST API backend
│   ├── cair/             # Main Django app
│   ├── cair_backend/     # Django project settings
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile        # Backend container config
│   └── .env.template     # Backend environment template
├── cair_frontend/        # React TypeScript frontend
│   ├── src/              # Source code
│   ├── package.json      # Node.js dependencies
│   ├── Dockerfile        # Frontend container config
│   └── .env.template     # Frontend environment template
├── docker-compose.yml    # Development environment
└── .env.template         # Root environment template
```

## Quick Start

1. **Clone and setup environment variables:**
   ```bash
   cp .env.template .env
   cp cair_backend/.env.template cair_backend/.env
   cp cair_frontend/.env.template cair_frontend/.env
   ```

2. **Fill in your OpenAI API key in the .env files**

3. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

## Development Setup

### Backend (Django)

```bash
cd cair_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React)

```bash
cd cair_frontend
npm install
npm run dev
```

## Technology Stack

- **Backend:** Django 4.2+, Django REST Framework, SQLite
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS
- **Deployment:** Docker, Docker Compose

## Features (To be implemented)

- Project management for different concierge types
- AI-powered conversational interface
- Dynamic checklist generation and tracking
- Responsive web interface
- RESTful API architecture

## Environment Variables

See the `.env.template` files in each directory for required environment variables.

## License

This project is for educational/demonstration purposes.