# Production Deployment Guide (Vercel & Render)

This document provides step-by-step instructions to deploy the **Spurly** application to production using **Vercel** for the Next.js frontend and **Render** for the Express backend and PostgreSQL database.

---

## 🏗️ Architecture Overview

* **Frontend**: Next.js 16 (React 19) hosted on **Vercel**.
* **Backend**: Express (TypeScript) server hosted on **Render** (Web Service).
* **Database**: PostgreSQL database hosted on **Render** (Managed Database).

---

## 1. Deploying the Backend & Database to Render

You can deploy the backend to Render either using the automated **Render Blueprint** (recommended) or via **Manual Setup**.

### Option A: Using Render Blueprint (Recommended)

Spurly includes a `render.yaml` blueprint file at the root directory, which configures the Postgres database and backend web service automatically.

1. Go to the [Render Dashboard](https://dashboard.render.com/) and log in.
2. Click **New** (top right) and select **Blueprint**.
3. Connect your GitHub repository containing the Spurly codebase.
4. Render will read `render.yaml` and prompt you for the required configurations:
   * **Service Group Name**: e.g., `spurly-app`
   * **FRONTEND_URL**: Leave blank or set to a placeholder (e.g. `https://localhost:3000`). *You will update this once the Vercel URL is generated.*
   * **OPENROUTER_API_KEY**: Your OpenRouter API Key.
5. Click **Approve**. Render will automatically provision:
   * A managed PostgreSQL database (`spurly-db`).
   * A Web Service for the Express backend (`spurly-backend`).
   * It will link `DATABASE_URL` between them automatically.

### Option B: Manual Setup

If you prefer to configure the services manually on the Render Dashboard:

#### Step 1: Create a PostgreSQL Database
1. Click **New** -> **Database**.
2. Name it `spurly-db`, choose a region, and choose the **Free** plan.
3. Click **Create Database**.
4. Once active, copy the **Internal Database URL** (for backend communication inside Render) or **External Database URL** (to connect from outside Render).

#### Step 2: Create a Web Service for the Backend
1. Click **New** -> **Web Service**.
2. Select your repository.
3. Configure the service settings:
   * **Name**: `spurly-backend`
   * **Root Directory**: `backend` *(Ensure this points to the backend folder)*
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
   * **Plan**: `Free`
4. Add the following **Environment Variables**:
   * `NODE_ENV`: `production`
   * `PORT`: `10000` (or leave empty to let Render handle it)
   * `DATABASE_URL`: *Paste the Internal Database URL copied from the database setup step.*
   * `STREAM_ENABLED`: `true`
   * `OPENROUTER_API_KEY`: *Your OpenRouter API Key.*
   * `FRONTEND_URL`: *The URL of your Vercel frontend (you will update this after Vercel deployment).*
5. Expand the **Advanced** section and configure the **Health Check Path**:
   * **Path**: `/health`
6. Click **Create Web Service**.

---

## 2. Running Database Migrations in Production

To initialize your production database schema, you must run the Prisma migrations. 

### Option A: Configure a Release Command on Render (Recommended)
Render supports executing a command before starting a deployment. If this command fails, the deployment is aborted, preventing downtime.

1. Go to your backend Web Service in the Render Dashboard.
2. Go to **Settings** -> **Build & Deploy** -> **Release Command**.
3. Set the command to:
   ```bash
   cd backend && npx prisma migrate deploy
   ```
4. During subsequent deploys, Render will run migrations automatically.

### Option B: Run Migrations Locally
Alternatively, you can run the migration command from your local machine, pointing to the external production database:

1. Retrieve the **External Database URL** from your Render Database settings.
2. In your local `backend/.env` file, temporarily set `DATABASE_URL` to this external URL.
3. Run the following command from the `backend/` directory:
   ```bash
   npx prisma migrate deploy
   ```
4. Revert your local `backend/.env` to the local database URL after success.

---

## 3. Deploying the Frontend to Vercel

1. Log in to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository containing the Spurly codebase.
4. Configure the Project Settings:
   * **Project Name**: `spurly-frontend`
   * **Framework Preset**: `Next.js`
   * **Root Directory**: Click *Edit* and select the `frontend` directory.
5. In the **Environment Variables** section, add the backend connection variable:
   * **Key**: `NEXT_PUBLIC_API_URL`
   * **Value**: *The URL of your deployed Render Web Service (e.g. `https://spurly-backend.onrender.com`)*
6. Click **Deploy**. Vercel will build and host your Next.js application, providing a production domain (e.g., `https://spurly-frontend.vercel.app`).

---

## 4. Closing the Loop: Link Frontend CORS

Once your Vercel frontend is deployed:

1. Copy your Vercel app URL (e.g. `https://spurly-frontend.vercel.app`).
2. Go to your **Render Dashboard** and select your backend Web Service (`spurly-backend`).
3. Click **Environment** and update the `FRONTEND_URL` variable to your Vercel URL.
4. Save the changes. Render will automatically redeploy the service with the updated CORS policy.

---

## 5. Post-Deployment Verification

1. **Verify Backend Health**: Visit `https://your-backend-url.onrender.com/health` in your browser. It should respond with:
   ```json
   {
     "status": 200,
     "message": "Health check successful",
     "data": {
       "status": "ok",
       "timestamp": "..."
     }
   }
   ```
2. **Verify Frontend UI**: Visit your Vercel app URL, click the chat widget, and try starting a chat conversation. Watch the network tab to ensure CORS headers (`Access-Control-Allow-Origin`) are present and match your Vercel domain.
