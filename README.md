# Impera Server

Backend API server for Impera Design interior design studio. Processes website inquiries and sends email notifications.

## Features

- **Contact forms** — handles callback requests
- **Cost calculator** — collects data from service calculator and sends estimates
- **Questions** — handles inquiries through modal window

All submissions are sent to the administrator via email using SMTP

## Technologies

- Node.js (ES Modules)
- Express.js
- Nodemailer
- CORS

The server will start on port `3001` (or from the `PORT` environment variable).

## API Endpoints

- `GET /health` — server health check
- `GET /api/health/email` — email configuration check
- `POST /api/contact/submit` — submit contact form
- `POST /api/calculator/submit` — submit calculator data
- `POST /api/question/submit` — submit question

## Deployment

The server is configured for deployment on Vercel via `vercel.json` in the project root.
