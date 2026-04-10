# Deployment Guide: Google Cloud Run

This guide outlines the steps to deploy GIDE to Google Cloud Run.

## Prerequisites
- A Google Cloud Platform (GCP) project.
- Google Cloud SDK (`gcloud`) installed and configured.
- Docker installed.

## Steps

1. **Build the Docker Image**
   ```bash
   docker build -t gcr.io/[PROJECT_ID]/gide:latest .
   ```

2. **Push the Image to Google Container Registry (GCR)**
   ```bash
   docker push gcr.io/[PROJECT_ID]/gide:latest
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy gide --image gcr.io/[PROJECT_ID]/gide:latest --platform managed --region [REGION] --allow-unauthenticated
   ```

4. **Configure Environment Variables**
   Ensure all required environment variables (e.g., `ADMIN_SECRET_KEY`, `CSRF_SECRET`) are set in the Cloud Run service configuration.
