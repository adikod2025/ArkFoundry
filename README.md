# ArkFoundry Sovereign AI Platform - Release 1.7

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Placeholder, update if different -->
[![Release: 1.7](https://img.shields.io/badge/Release-1.7-blue.svg)](https://github.com/adikod2025/ArkFoundry/releases/tag/v1.7)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/adikod2025/ArkFoundry/actions) <!-- Placeholder -->
[![Documentation](https://img.shields.io/badge/Docs-Read%20Here-orange.svg)](./docs/index.md) <!-- Placeholder -->

**ArkFoundry.ai: Architecting the Future of Sovereign, Conscious AI.**

## 1. Overview

Welcome to ArkFoundry Platform Release 1.7. ArkFoundry is a revolutionary, enterprise-grade platform designed to deliver Sovereign AI and lay the groundwork for AI Consciousness. It provides a comprehensive suite of interconnected modules that empower organizations to build, deploy, and manage advanced AI solutions with unparalleled security, control, and intelligence.

Release 1.7 focuses on establishing a robust, classical AI foundation with seven core Multi-Verse Products (MVPs), delivering significant enterprise capabilities in workflow orchestration, security, data governance, threat intelligence, and developer enablement. This release is built to "NASA and Enterprise grade" standards, ensuring reliability, scalability, and a path towards future AI paradigms.

## 2. Key Features (Release 1.7)

This release includes the full implementation of the following 7 core MVPs:

*   **🧠 ArcFlow Engine (Classical Orchestration)**:
    *   Define, execute, and monitor complex workflows with DAG-based visual (JSON) definitions.
    *   Asynchronous task execution via Celery, supporting sequential, parallel, and conditional branching.
    *   Robust state management, parameter passing, error handling, and retry mechanisms.
    *   Integration points for classical AI model inference tasks.
    *   Comprehensive API for workflow management and real-time execution monitoring.

*   **🛡️ Zero Trust Architecture (ZTA) Engine**:
    *   Dynamic, context-aware access control based on NIST SP 800-207 principles.
    *   Centralized Policy Decision Point (PDP) evaluating user identity, device posture, resource sensitivity, and behavioral analytics.
    *   AI-enhanced behavioral risk scoring and anomaly detection.
    *   Device trust registration and management.
    *   Granular policy definition and enforcement across all platform APIs.
    *   Comprehensive ZTA audit logging for all access decisions.

*   **🔒 Data Sovereignty Module**:
    *   AI-assisted data classification (Public, Internal, Confidential, PII, etc.).
    *   Robust encryption for data at rest and in transit (crypto-agile design for future Post-Quantum Cryptography).
    *   Data residency policy definition and enforcement (conceptual for Phase 1, full enforcement in later phases).
    *   Consent management framework for GDPR and other regulatory compliance.
    *   Immutable audit trails for all data lifecycle events and sovereignty operations.

*   **👁️ Threat Intelligence Engine (Classical AI)**:
    *   Ingestion from STIX/TAXII feeds and OSINT sources (RSS, APIs).
    *   Automated IOC (Indicators of Compromise) extraction, normalization, and enrichment (GeoIP, WHOIS, VirusTotal).
    *   Rule-based correlation of IOCs, TTPs, Threat Actors, and Campaigns.
    *   AI-driven source reliability scoring and NLP for IOC extraction from unstructured reports.
    *   Threat scoring, prioritization, and alerting mechanisms.

*   **⚙️ Admin Platform**:
    *   Centralized web-based interface for managing all ArkFoundry platform components and entities.
    *   Full CRUD (Create, Read, Update, Delete) capabilities for Users, Roles, Permissions, Workflow Definitions, ZTA Policies, Data Assets, Threat Feeds, Developer Accounts, API Applications, and more.
    *   Unified audit log viewer for all platform activities.
    *   Basic platform health monitoring dashboard.

*   **🧩 Developer Portal**:
    *   Self-service registration and account management for developers.
    *   Creation and management of API Applications.
    *   Secure generation, viewing (once), and revocation of API keys.
    *   Access to live, interactive API documentation (Swagger/OpenAPI).
    *   Links to SDKs and developer guides.
    *   Basic API usage monitoring (mocked for Phase 1, full integration later).

*   **🏛️ Government Solutions (Secure Document Processing Workflow)**:
    *   End-to-end solution demonstrating secure document ingestion, AI-assisted classification (e.g., KSA-OFFICIAL, KSA-SECRET), and officer confirmation.
    *   Orchestration of document processing steps (mocked OCR, PII redaction, summarization) via ArcFlow.
    *   Zero Trust access control to documents based on user security clearance levels and document classification.
    *   Comprehensive audit trail for the entire document lifecycle.

## 3. Architecture Overview

ArkFoundry Platform 1.7 is built upon a modern, scalable, and secure microservices-oriented architecture. Key components and technologies include:

*   **Backend**: Python (Flask framework) for API and service development.
*   **Database**: PostgreSQL for primary relational data, Redis for caching and Celery message broking.
*   **Task Queuing**: Celery with RabbitMQ/Redis for asynchronous task execution in ArcFlow and other modules.
*   **Containerization**: Docker for packaging all services.
*   **Orchestration**: Kubernetes (EKS on AWS) for deployment, scaling, and management of containerized services.
*   **Infrastructure as Code (IaC)**: Terraform for provisioning and managing AWS infrastructure.
*   **Frontend**: Server-side rendered Flask templates (Jinja2) with HTML, CSS, and JavaScript for Admin, Developer, and Government Solution portals.
*   **Security**: JWT for API authentication, RBAC for authorization, integrated ZTA engine, TLS for data in transit, AES-256 (mock KMS) for data at rest.

## 4. System Requirements

### Software:
*   Python 3.9+
*   Docker Engine 20.10+
*   Docker Compose 1.29+ (for local development)
*   `kubectl` (for Kubernetes deployments)
*   `helm` (optional, for Kubernetes deployments if Helm charts are provided)
*   `terraform` (for AWS IaC deployment)
*   Node.js & npm (if modifying/building frontend assets directly)

### Hardware (Minimum for Local Development/Small Staging):
*   CPU: 4 cores
*   RAM: 16 GB
*   Disk: 50 GB free space

### Hardware (Recommended for Production):
*   Refer to detailed deployment guides for specific cloud provider configurations (e.g., AWS EKS node sizes, RDS instance types). Scalability is horizontal.

## 5. Installation Instructions

### Prerequisites
*   Ensure all software listed under System Requirements is installed.
*   Git for cloning the repository.
*   AWS CLI configured (if deploying to AWS).

### Option 1: Local Development/Testing via Docker Compose
This is the recommended way to get started quickly.

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/adikod2025/ArkFoundry.git
    cd ArkFoundry
    ```

2.  **Configure Environment**:
    *   Copy the example environment file: `cp .env.example .env`
    *   Edit `.env` and provide necessary configurations (database credentials, API keys for external services like VirusTotal, JWT secret, etc.).
    *   Ensure `FLASK_ENV=development`.

3.  **Build and Run Services**:
    ```bash
    docker-compose build
    docker-compose up -d
    ```
    This will start all services: Flask API, Celery workers, PostgreSQL, Redis.

4.  **Initialize Database & Seed Data**:
    Wait for the database container to be fully up and running.
    ```bash
    docker-compose exec arkfoundry-api flask db upgrade
    docker-compose exec arkfoundry-api python init_db.py
    ```

5.  **Access the Platform**:
    *   **API**: `http://localhost:5000/api/v1/` (or as configured)
    *   **Admin Portal**: `http://localhost:8080/admin` (or as configured for the website/admin UI service)
    *   **Developer Portal**: `http://localhost:8080/developer`
    *   Default Admin User (from `init_db.py`): `admin@arkfoundry.ai` / `SovereignPassword2025!`

### Option 2: Kubernetes Deployment (Staging/Production)
Refer to the detailed deployment guide: `docs/DEPLOYMENT_KUBERNETES.md` (Link to be updated).
This typically involves:
1.  Building and pushing Docker images to a container registry (e.g., ECR, Docker Hub).
2.  Configuring Kubernetes secrets for sensitive data.
3.  Applying Kubernetes manifest files (YAML) or Helm charts located in the `kubernetes/` directory.
4.  Using Terraform scripts in `infrastructure/terraform/aws/` for provisioning AWS EKS and related resources.

### Option 3: From Source (Advanced Users)
Refer to `docs/DEVELOPMENT_SETUP.md` for instructions on setting up a local Python virtual environment and running services manually.

## 6. Quick Start Guide

1.  **Follow Installation Option 1 (Docker Compose)** above.
2.  **Access Admin Portal**: Open `http://localhost:8080/admin` in your browser. Log in with `admin@arkfoundry.ai` / `SovereignPassword2025!`.
3.  **Explore**:
    *   Navigate to "Users" and observe the seeded admin user.
    *   Go to "ArcFlow Engine" > "Workflow Definitions" to see any seeded workflows.
    *   Review "Zero Trust" > "ZTA Policies".
4.  **Register as a Developer**:
    *   Navigate to `http://localhost:8080/developer/register`.
    *   Create a new developer account. (Email verification might be mocked or require mail server setup for local dev).
5.  **Create an API Application & Key**:
    *   Log in to the Developer Portal.
    *   Create a new API Application.
    *   Generate an API key for this application. **Copy the full API key immediately.**
6.  **Make an API Call**:
    Using a tool like `curl` or Postman:
    ```bash
    curl -X GET http://localhost:5000/api/v1/arcflow/workflows \
      -H "Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>" \
      -H "X-API-Key: <YOUR_DEVELOPER_API_KEY>" # If endpoint also checks API key
    ```
    *(Note: Admin JWT token can be obtained after admin login via API, or use API key for developer-accessible endpoints).*

## 7. API Documentation

Comprehensive, interactive API documentation (Swagger UI / Redoc) is available once the platform is running:

*   **Main API Documentation**: `http://localhost:5000/api/v1/docs` (or your configured API host/port)

This documentation is auto-generated from the OpenAPI 3.0 specifications defined within the code.

## 8. Deployment Options

*   **Local Development**: Using `docker-compose` as described in Installation.
*   **Staging/Production on AWS**: Recommended using the provided Terraform scripts for AWS EKS. See `infrastructure/terraform/aws/README.md`.
*   **Other Cloud Providers/On-Premise Kubernetes**: Adapt the Kubernetes manifests or Helm charts.
*   **Serverless (Future Consideration)**: Some components might be adaptable to serverless functions for specific use cases.

## 9. Configuration

Key platform configurations are managed via:

*   **Environment Variables**: Loaded from `.env` file in development (via Docker Compose) or set directly in Kubernetes deployments. See `.env.example` for a list of variables.
*   **`platform/config.py`**: Defines different configuration classes (Development, Testing, Production).
*   **System Settings (Admin UI)**: Some operational parameters can be configured dynamically via the Admin Portal (`SystemSetting` model).

## 10. Running Tests

The platform includes a comprehensive suite of tests:

1.  **Unit Tests**:
    ```bash
    docker-compose exec arkfoundry-api pytest tests/unit
    ```
2.  **Integration Tests**:
    ```bash
    docker-compose exec arkfoundry-api pytest tests/integration
    ```
3.  **End-to-End (E2E) Tests**:
    Requires the full suite of services to be running.
    ```bash
    docker-compose exec arkfoundry-api pytest tests/e2e 
    # Or run the dedicated E2E test runner script if provided.
    ```
    Ensure the testing database is properly configured and seeded if necessary for E2E tests.

## 11. Contributing

We welcome contributions to ArkFoundry! Please see our `CONTRIBUTING.md` file for guidelines on:
*   Reporting bugs
*   Suggesting features
*   Code submission process (fork, branch, PR)
*   Coding standards
*   Developer Certificate of Origin (DCO)

*(CONTRIBUTING.md to be created)*

## 12. License

ArkFoundry Platform Release 1.7 is released under the [MIT License](LICENSE.md).
*(LICENSE.md to be created with MIT License text or updated if proprietary)*

## 13. Support & Contact

*   **Community Support**: Join our Discord server or GitHub Discussions (Links to be added).
*   **Reporting Issues**: Please use the GitHub Issues tracker for the ArkFoundry repository.
*   **Enterprise Support**: For dedicated enterprise support, please contact `support@arkfoundry.ai` (Placeholder).
*   **General Inquiries**: `info@arkfoundry.ai` (Placeholder).

---

Thank you for choosing ArkFoundry. We are excited to build the future of AI with you.
