# ==========================================================
# 🧬 Biologics Discovery Platform - Production Dockerfile
# ==========================================================

# Use an official Python 3.11 slim image for a lightweight, secure container
FROM python:3.11-slim

# Set environment variables to optimize Python performance inside Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install essential system dependencies, standard build libraries, and dependencies for RDKit/matplotlib
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    libxrender1 \
    libxext6 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Download and install the Linux 64-bit binary of AutoDock Vina for real physics-based docking
RUN wget https://github.com/ccsb-scripps/AutoDock-Vina/releases/download/v1.2.5/vina_1.2.5_linux_x86_64 -O /usr/local/bin/vina && \
    chmod +x /usr/local/bin/vina

# Set container working directory
WORKDIR /app

# Copy python backend requirements file first to maximize Docker layer cache reuse
COPY backend/requirements.txt /app/backend/requirements.txt

# Upgrade pip and install scientific & web dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend and frontend source codes preserving their relative directory structures
COPY backend /app/backend
COPY frontend /app/frontend

# Set working directory to the backend directory
WORKDIR /app/backend

# Pre-train AI Regressors & Classifiers during build phase so the container is ready instantly
RUN python train_ai_model.py && \
    python app/ai_models/train_bbbp.py

# Expose port 8000 for FastAPI Uvicorn server
EXPOSE 8000

# Run Uvicorn asynchronously on all network interfaces
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
