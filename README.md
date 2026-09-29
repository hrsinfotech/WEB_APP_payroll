# HRS Tech Security Dashboard

HRS Tech Security Dashboard is a cross-platform application for access control, attendance, visitor, credential, and security operations. Supports:
- **Windows Desktop** - Electron-based native application
- **Android Mobile** - Capacitor-based native app (Android 6+)
- **Web Browser** - React/Vite web application

The current migrated workflow is User Management, backed by a Spring Boot API and PostgreSQL.

## Prerequisites

### For All Platforms (Windows, Android, Web)
- **Git** 2.40 or newer
- **Node.js** 20 LTS or newer
- **pnpm** 10 or newer (`corepack enable`, then `corepack prepare pnpm@latest --activate`)
- **Java JDK** 17 or newer (`java -version`)
- **Apache Maven** 3.9 or newer (`mvn -version`)
- **Docker Desktop** with Linux containers enabled, for PostgreSQL (optional - use external PostgreSQL 16+ instead if preferred)

### Additional Prerequisites for Android App
- **Android SDK** (minimum API level 24, Android 6+)
- **Gradle** 8.5 or newer (usually bundled with Android Studio)
- **Android Studio** (recommended for building and testing)
- **Capacitor CLI** (`npm install -g @capacitor/cli` or use `npx`)

### Additional Prerequisites for Windows Desktop App
- **Windows** 7 or newer
- **Electron** and **electron-builder** (installed via `pnpm install`)

## Quick Start on Windows

Open PowerShell in the repository root:

```powershell
git clone https://github.com/hrsinfotech/WEB_APP_payroll.git
cd WEB_APP_payroll
corepack enable
pnpm install
docker compose up -d
```

In a second PowerShell window, start the React frontend:

```powershell
pnpm --filter @workspace/hrs-tech-dashboard run dev
```

Open the dashboard at [http://localhost:8087](http://localhost:8087). The backend health check is available at [http://localhost:8086/api/healthz](http://localhost:8086/api/healthz).

## Windows Desktop App

Build and open the Electron desktop shell after the backend and PostgreSQL are running:

```powershell
pnpm --filter @workspace/hrs-tech-dashboard run desktop:dev
```

Create a Windows installer (.exe):

```powershell
pnpm --filter @workspace/hrs-tech-dashboard run build:windows
```

The installer is created under `artifacts/hrs-tech-dashboard/release/`.

The installer includes the Java API source and Compose configuration. During setup it checks for Docker Desktop and downloads the official Docker Desktop installer when it is missing. Java and PostgreSQL run inside the application-managed containers, so they do not need separate client installations. Docker Desktop may require administrator approval and a Windows restart for WSL 2.

## Android Mobile App

### Prerequisites
Ensure Android SDK and Android Studio are installed with the required API level (minimum 24).

### Build for Android

From the repository root:

```powershell
# Build the web assets
pnpm --filter @workspace/hrs-tech-dashboard run build

# Initialize and sync Capacitor (first time only)
npx cap add android
npx cap sync android

# Open Android Studio (optional - for development/testing)
npx cap open android
```

### Create Android APK

```powershell
# Build release APK
pnpm --filter @workspace/hrs-tech-dashboard run build:android:apk
```

The APK file is generated in `artifacts/hrs-tech-dashboard/android/app/build/outputs/apk/release/`.

### Install on Android Device

1. Connect your Android device via USB (Developer Mode enabled)
2. Allow USB debugging on the device
3. Use Android Studio's device manager, or:
   ```bash
   adb install -r <path-to-apk>
   ```

## Configuration

Copy `.env.example` to `.env` when custom values are needed. The defaults are suitable for the included Docker Compose database.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8086` | Java API URL used by React and Electron |
| `PORT` | `8086` | Spring Boot HTTP port |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5435/hrs_tech` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `hrs` | PostgreSQL username |
| `SPRING_DATASOURCE_PASSWORD` | `hrs` | PostgreSQL password |

## Project Structure

- `backend-java/` - Spring Boot REST API (Java 25), JPA entities, and PostgreSQL integration
- `artifacts/hrs-tech-dashboard/` - React/Vite frontend with Electron (Windows), Capacitor (Android), and web builds
- `docker-compose.yml` - PostgreSQL 16, Spring Boot API, and web service containers
- `artifacts/hrs-tech-dashboard/src/lib/users-api.ts` - frontend API adapter
- `.env.example` - environment variable template

## API Endpoints

- `GET /api/healthz` - service health check
- `GET /api/users` - list users
- `POST /api/users` - create a user
- `PATCH /api/users/{id}/status` - activate or suspend a user

## Development Commands

```powershell
pnpm run typecheck
pnpm run build
mvn -f backend-java/pom.xml -DskipTests package
docker compose down
```

The Compose stack exposes PostgreSQL on `5435`, the Java API on `8086`, and the web application on `8087`. The database must be healthy before the API starts. The React frontend keeps a local fallback directory when the API is unavailable, but changes are persisted only when the backend and PostgreSQL are running.

## Current Scope

User Management is currently connected end to end to Java and PostgreSQL. The remaining dashboard modules are prototype screens and are ready for subsequent API migrations.
