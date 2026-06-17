# ♟️ Checkmate.io — Real-Time Multiplayer Chess Platform

A full-stack, real-time multiplayer chess application built using modern web technologies and deployed on AWS with a production-grade infrastructure.

---

## 🚀 Live Demo

🔗 https://chess.mayurkumbar.tech

---

## 🧠 Overview

Checkmate.io is a real-time chess platform that allows players to compete with each other instantly over the internet.

The system is designed with **low latency**, **real-time synchronization**, and **scalable backend architecture** using WebSockets and Redis.

This project demonstrates:

* Full-stack development
* Real-time systems
* Cloud deployment
* DevOps & CI/CD

---

## 🏗️ Tech Stack

### Frontend

* Next.js (React)
* Tailwind CSS
* Socket.IO Client

### Backend

* Node.js
* Express.js
* Socket.IO (WebSockets)

### Infrastructure

* Docker & Docker Compose
* Nginx (Reverse Proxy)
* Redis (State + Pub/Sub)
* AWS EC2 (Cloud Hosting)
* Docker Hub (Image Registry)
* GitHub Actions (CI/CD)

### Networking & Security

* Custom Domain (`mayurkumbar.tech`)
* HTTPS via Let's Encrypt (Certbot)
* Nginx routing for API + WebSockets

---

## ⚙️ System Architecture

```
User (Browser)
     │
     ▼
HTTPS (Nginx Reverse Proxy)
     │
     ├── /           → Frontend (Next.js)
     ├── /api        → Backend (Express)
     └── /socket.io  → WebSocket Server
     │
     ▼
   Redis
```

---

## 🔄 Key Features

* ♟️ Real-time multiplayer chess gameplay
* ⚡ Instant move synchronization via WebSockets
* 🧠 Server-managed game state
* 🔁 Redis for fast in-memory state handling
* 🔐 Secure HTTPS deployment
* 🐳 Fully containerized architecture
* 🚀 Automated CI/CD pipeline

---

## 📁 Project Structure

```
Checkmate.io/
├── backend/                 # Express + Socket.IO server
├── frontend/                # Next.js app
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Service orchestration
├── .github/workflows/       # CI/CD pipelines
└── README.md
```

---

## 🐳 Local Development Setup

### 1️⃣ Clone repository

```bash
git clone https://github.com/Mayur-kumbar/Checkmate.io.git
cd Checkmate.io
```

---

### 2️⃣ Run using Docker

```bash
docker compose up -d
```

---

### 3️⃣ Access application

```
http://localhost:3000
```

---

## ☁️ Production Deployment

The application is deployed on AWS EC2 using Docker containers.

### Deployment Flow

1. Build Docker images (frontend + backend)
2. Push images to Docker Hub
3. Pull images on EC2 server
4. Run containers using Docker Compose
5. Route traffic using Nginx
6. Secure with HTTPS (Let's Encrypt)

---

## 🔁 CI/CD Pipeline

Implemented using GitHub Actions.

### Workflow

```
git push → GitHub Actions
        → Build Docker images
        → Push to Docker Hub
        → SSH into EC2
        → Pull latest images
        → Restart containers
```

### Benefits

* Automated deployment
* No manual server updates
* Faster iteration cycle
* Consistent builds

---

## 🔐 HTTPS & SSL

* SSL certificates managed using Let's Encrypt (Certbot)
* Certificates auto-renewed via cron jobs
* Nginx enforces HTTPS redirection

---

## ⚡ Nginx Reverse Proxy

Routes requests:

* `/` → Frontend (Next.js)
* `/api` → Backend (Express)
* `/socket.io` → WebSocket server

Handles:

* HTTPS termination
* Reverse proxy routing
* WebSocket upgrade headers

---

## 🔌 Real-Time Communication

Uses **Socket.IO**:

### Flow:

1. Client connects via WebSocket
2. Server assigns game session
3. Moves are emitted and broadcast
4. Opponent receives updates instantly

---

## 🧠 Redis Usage

* Stores game state temporarily
* Handles pub/sub for real-time updates
* Ensures low latency communication

---

## ⚠️ Challenges Faced

* WebSocket routing through Nginx
* Docker container DNS resolution
* SSL certificate integration with Docker
* Port conflicts between host & containers
* Nginx crash due to misconfigured upstream
* CI/CD pipeline authentication issues

---

## 🧠 Key Learnings

* Docker-based microservices architecture
* Reverse proxy setup with Nginx
* Real-time system design using WebSockets
* CI/CD automation with GitHub Actions
* Debugging production deployment issues
* Managing SSL in containerized environments

---

## 🚧 Future Improvements

* 🧩 Matchmaking queue system
* 📊 ELO rating system
* 💾 Game persistence (PostgreSQL / MongoDB)
* 👀 Spectator mode
* ⚡ Zero-downtime deployments
* 📈 Monitoring (Prometheus + Grafana)
* 📜 Centralized logging (Loki)

---

## 👨‍💻 Author

**Mayur Kumbar**

* GitHub: https://github.com/Mayur-kumbar

---

## 📄 License

This project is licensed under the MIT License.

---

## ⭐ Summary

This project showcases:

* Full-stack engineering
* Real-time systems
* Cloud deployment
* DevOps practices

It reflects the ability to build, deploy, and maintain a production-ready application from scratch.
