# ArkFoundry Platform - Installation Guide (Release 1.7)

**Version**: 1.7
**Last Updated**: {{env.DATE}}

## 1. Introduction

This guide provides comprehensive instructions for installing and deploying the ArkFoundry Sovereign AI Platform, Release 1.7. It covers scenarios ranging from local development setups to production-grade deployments on cloud infrastructure.

ArkFoundry is an enterprise-grade platform. Ensure you have a solid understanding of the technologies involved (Docker, Kubernetes, PostgreSQL, Redis, Python/Flask) before attempting production deployments.

## 2. Prerequisites

Before you begin, ensure you have the following software installed and configured on your local machine or deployment environment:

### 2.1. General Software:
*   **Git**: For cloning the repository. (Version 2.20+)
*   **Python**: Version 3.9 or higher (primarily for running helper scripts or local source installations).
*   **Docker Engine**: Version 20.10 or higher.
*   **Docker Compose**: Version 1.29 or higher (for local development).

### 2.2. For Kubernetes Deployments (Staging/Production):
*   **`kubectl`**: Kubernetes command-line tool (latest stable version).
*   **`helm`**: Helm package manager for Kubernetes (Version 3.x, if using Helm charts).
*   **`terraform`**: Infrastructure as Code tool (Version 1.0.x or higher, if using provided Terraform scripts for cloud).
*   **Cloud Provider CLI**:
    *   **AWS**: AWS CLI v2 configured with appropriate credentials and default region.
    *   **Azure/GCP**: Corresponding CLIs if adapting for these platforms.

### 2.3. Access & Permissions:
*   **Repository Access**: Ability to clone the ArkFoundry GitHub repository.
*   **Docker Registry**: Credentials to push/pull Docker images if using a private registry. For AWS, ECR permissions.
*   **Cloud Provider Account**: Administrator or sufficient IAM permissions on your chosen cloud provider (e.g., AWS) to create and manage resources (VPC, EKS, RDS, S3, IAM roles, etc.).
*   **DNS Management**: Access to manage DNS records for your chosen domain if setting up public access.

## 3. General Configuration (`.env` file)

The ArkFoundry platform uses an `.env` file to manage environment-specific configurations.

1.  **Copy the Example**: After cloning the repository, navigate to the root directory and copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  **Edit `.env`**: Open the `.env` file in a text editor and **carefully review and update all variables** according to your deployment environment. This includes:
    *   `FLASK_ENV` (development, testing, production)
    *   `SECRET_KEY` and `JWT_SECRET_KEY` (generate strong, unique random strings)
    *   `DATABASE_URL` (or individual `POSTGRES_*` variables)
    *   `REDIS_URL`
    *   `MAIL_SERVER` and related mail credentials
    *   `KMS_PROVIDER` and associated KMS configuration (e.g., `AWS_KMS_KEY_ID`)
    *   `VIRUSTOTAL_API_KEY` (if using VirusTotal enrichment)
    *   `OBJECT_STORAGE_TYPE` and related settings (e.g., `S3_BUCKET_NAME`)
    *   Default admin user credentials (change `DEFAULT_ADMIN_PASSWORD` immediately after first login).
    *   Base URLs for API and Website.

**Security Note**: The `.env` file contains sensitive credentials. **NEVER commit your actual `.env` file to version control.** Ensure it is listed in your `.gitignore` file. For production Kubernetes deployments, these configurations should be managed via Kubernetes Secrets.

## 4. Scenario 1: Local Development & Testing (Docker Compose)

This setup is ideal for individual developers, local testing, and quick demonstrations.

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/adikod2025/ArkFoundry.git
    cd ArkFoundry
    ```

2.  **Configure Environment**:
    *   Create and populate your `.env` file as described in Section 3.
    *   Ensure `FLASK_ENV=development`.
    *   Set database and Redis hosts to the service names defined in `docker-compose.yml` (e.g., `postgres` for `POSTGRES_HOST`, `redis` for `REDIS_URL`).

3.  **Build Docker Images**:
    ```bash
    docker-compose build
    ```
    This command builds the Docker images for all services defined in `docker-compose.yml` (e.g., `arkfoundry-api`, `arkfoundry-worker`, `arkfoundry-website`).

4.  **Start Services**:
    ```bash
    docker-compose up -d
    ```
    This starts all services in detached mode. You can view logs using `docker-compose logs -f [service_name]`.

5.  **Database Initialization**:
    Wait for the PostgreSQL container (`postgres`) to be fully initialized (check `docker-compose logs -f postgres`).
    *   **Run Database Migrations**:
        ```bash
        docker-compose exec arkfoundry-api flask db upgrade
        ```
    *   **Seed Initial Data**:
        ```bash
        docker-compose exec arkfoundry-api python init_db.py
        ```
        This script will create default roles, permissions, the initial admin user (credentials from `.env`), and other essential seed data.

6.  **Accessing the Platform**:
    *   **ArkFoundry API**: `http://localhost:5000` (or the port mapped for `arkfoundry-api` in `docker-compose.yml`). API docs at `http://localhost:5000/api/v1/docs`.
    *   **ArkFoundry Website/Portals (Admin, Developer)**: `http://localhost:8080` (or the port mapped for `arkfoundry-website`).
    *   **Admin Login**: `http://localhost:8080/admin`. Use credentials set for `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` in your `.env` file. **Change this password immediately after first login.**
    *   **Flower (Celery Monitoring)**: `http://localhost:5555` (if included in `docker-compose.yml`).

7.  **Stopping Services**:
    ```bash
    docker-compose down
    ```
    To remove volumes (database data, etc.): `docker-compose down -v`.

## 5. Scenario 2: Staging/Production Deployment (AWS EKS with Terraform)

This scenario outlines deployment to a Kubernetes cluster on AWS (Elastic Kubernetes Service - EKS) using the provided Terraform scripts for infrastructure provisioning.

### 5.1. Prerequisites for AWS Deployment:
*   AWS Account with necessary IAM permissions to create EKS, VPC, RDS, ECR, S3, IAM roles, etc.
*   AWS CLI v2 installed and configured with credentials (`aws configure`).
*   Terraform v1.0.x+ installed.
*   `kubectl` configured to interact with your AWS account (Terraform will output a command to update kubeconfig).
*   A Docker image registry (e.g., AWS ECR) to store your built application images.
*   A registered domain name and access to manage its DNS records (e.g., via AWS Route 53).

### 5.2. Deployment Steps:

1.  **Build and Push Docker Images**:
    *   Modify `dockerfiles/production/` if necessary.
    *   Build production-ready Docker images for `arkfoundry-api`, `arkfoundry-worker`, and `arkfoundry-website` (or a single image if structured that way).
        ```bash
        # Example for API image
        docker build -t YOUR_ECR_REPO_URI/arkfoundry-api:v1.7 -f dockerfiles/production/api/Dockerfile .
        ```
    *   Authenticate Docker with your ECR registry:
        ```bash
        aws ecr get-login-password --region YOUR_AWS_REGION | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_AWS_REGION.amazonaws.com
        ```
    *   Push the images:
        ```bash
        docker push YOUR_ECR_REPO_URI/arkfoundry-api:v1.7
        # Repeat for other images (worker, website)
        ```

2.  **Configure Terraform**:
    *   Navigate to `infrastructure/terraform/aws/`.
    *   Create a `terraform.tfvars` file (or modify `variables.tf` defaults). Key variables to set:
        *   `aws_region`
        *   `cluster_name` (for EKS cluster)
        *   `vpc_cidr_block`
        *   Database credentials for RDS (`db_username`, `db_password`) - **store these securely, e.g., using AWS Secrets Manager and reference them, or use tfvars for non-production.**
        *   Docker image URIs (from ECR) for API, worker, website services.
        *   Domain name for public endpoints.
        *   SSL Certificate ARN (if using an existing ACM certificate).
    *   Review all variables in `variables.tf` and customize as needed.

3.  **Provision Infrastructure with Terraform**:
    ```bash
    cd infrastructure/terraform/aws/
    terraform init
    terraform plan -out=tfplan
    terraform apply tfplan
    ```
    This process will take a significant amount of time as it creates the VPC, EKS cluster, RDS instance, ElastiCache (Redis), Load Balancers, IAM roles, etc.

4.  **Update Kubeconfig**:
    After Terraform apply completes, it will output a command to update your `kubectl` configuration to point to the new EKS cluster. Run this command.
    ```bash
    aws eks update-kubeconfig --region YOUR_AWS_REGION --name YOUR_EKS_CLUSTER_NAME
    ```
    Verify `kubectl` access: `kubectl get nodes`.

5.  **Deploy Application to EKS**:
    *   Navigate to the `kubernetes/` directory in the ArkFoundry repository.
    *   **Configure Kubernetes Manifests/Helm Chart**:
        *   Update image tags in `deployment.yaml` files (or Helm `values.yaml`) to point to your pushed ECR images (e.g., `YOUR_ECR_REPO_URI/arkfoundry-api:v1.7`).
        *   Create Kubernetes Secrets for sensitive configurations from your `.env` file (database passwords, JWT secrets, API keys). **Do not hardcode these in manifests.**
            ```bash
            kubectl create secret generic arkfoundry-secrets --from-env-file=path/to/your/production.env
            ```
            Ensure your deployments mount these secrets as environment variables.
    *   **Apply Manifests or Install Helm Chart**:
        *   Using `kubectl`:
            ```bash
            kubectl apply -f kubernetes/namespace.yaml
            kubectl apply -f kubernetes/secrets/ # If you have separate secret manifests
            kubectl apply -f kubernetes/configmaps/
            kubectl apply -f kubernetes/deployments/
            kubectl apply -f kubernetes/services/
            kubectl apply -f kubernetes/ingress/
            ```
        *   Using Helm (if a chart is provided in `kubernetes/helm/arkfoundry`):
            ```bash
            helm install arkfoundry kubernetes/helm/arkfoundry -n arkfoundry --create-namespace -f kubernetes/helm/arkfoundry/values-production.yaml
            ```

6.  **Database Migrations & Seeding (Production)**:
    Once the API pods are running and connected to the RDS instance:
    ```bash
    # Find an API pod name
    kubectl get pods -n arkfoundry -l app=arkfoundry-api
    # Exec into the pod
    kubectl exec -it <your-arkfoundry-api-pod-name> -n arkfoundry -- bash
    # Inside the pod:
    flask db upgrade
    python init_db.py --environment production # Ensure init_db.py can handle a production flag
    exit
    ```

7.  **Configure DNS & SSL**:
    *   The Terraform scripts may set up an Application Load Balancer (ALB) with an Ingress controller.
    *   Update your domain's DNS records (e.g., in Route 53) to point to the ALB's DNS name.
    *   Ensure SSL is configured, either via ACM certificate referenced in Terraform/Ingress or using `cert-manager` in Kubernetes.

8.  **Post-Deployment Checks**:
    *   Verify all pods are running: `kubectl get pods -n arkfoundry`.
    *   Check service logs: `kubectl logs -f <pod-name> -n arkfoundry`.
    *   Test API endpoints and web portals using the public domain name.
    *   Verify monitoring (Prometheus/Grafana) and logging (ELK/CloudWatch) are collecting data.

## 6. Scenario 3: Other Cloud Providers / On-Premise Kubernetes

If deploying to a different cloud provider (Azure AKS, Google GKE) or an on-premise Kubernetes cluster:

1.  **Infrastructure**: You will need to provision the underlying infrastructure manually or using your provider's IaC tools (e.g., Azure ARM templates, Google Cloud Deployment Manager). This includes:
    *   Kubernetes cluster.
    *   Managed PostgreSQL database (or deploy your own).
    *   Managed Redis instance (or deploy your own).
    *   Load balancers / Ingress controller.
    *   Object storage (if used).
2.  **Kubernetes Manifests**:
    *   The provided Kubernetes manifests in `kubernetes/` can be adapted.
    *   Key areas to customize:
        *   **Storage**: Update `PersistentVolumeClaim` definitions to use appropriate `storageClassName` for your environment.
        *   **Ingress**: Modify `Ingress` resources to work with your specific Ingress controller (e.g., Nginx Ingress, Traefik) and DNS/SSL setup.
        *   **LoadBalancer Services**: Ensure `Service` type `LoadBalancer` correctly provisions an external IP/hostname in your environment.
        *   **Secrets Management**: Adapt to your cluster's secrets management solution.
3.  **Docker Images**: Build and push images to a registry accessible by your Kubernetes cluster.
4.  **Configuration**: Manage application configuration (similar to `.env`) using Kubernetes ConfigMaps and Secrets.

## 7. Scenario 4: Installation from Source (Advanced Users / Contributors)

This method is typically for developers contributing to the ArkFoundry platform or those needing a highly customized setup without Docker.

*   Refer to the detailed guide: `docs/DEVELOPMENT_SETUP.md`.
*   This involves setting up a Python virtual environment, installing all dependencies from `requirements.txt`, manually configuring PostgreSQL and Redis instances, setting environment variables, and running Flask development server and Celery workers directly.

## 8. Post-Installation Steps

1.  **Initial Admin Login**: Access the Admin Portal (e.g., `http://yourdomain.com/admin` or `http://localhost:8080/admin`).
2.  **Change Default Admin Password**: Log in with the `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` specified in your environment configuration. **Immediately change this password** via the user profile section in the Admin Portal.
3.  **Verify Service Health**:
    *   Check API health endpoint: `http://yourdomain.com/api/v1/health` (or `/health` if defined).
    *   Check Celery worker status (e.g., via Flower UI or `celery -A platform.app.celery_app status`).
    *   Review logs for any startup errors.
4.  **Review System Settings**: In the Admin Portal, review and adjust `SystemSetting` values as needed for your environment.
5.  **Configure Threat Feeds**: If deploying the Threat Intelligence module, configure initial threat feeds via the Admin Portal.

## 9. Troubleshooting Common Issues

*   **Docker Compose Issues**:
    *   **Service Fails to Start**: Check logs: `docker-compose logs <service_name>`. Often due to incorrect `.env` configuration (DB URL, Redis URL), port conflicts, or missing dependencies during build.
    *   **Database Connection Errors**: Ensure PostgreSQL container is fully running before API/worker services try to connect. Check `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `.env` match `docker-compose.yml` environment for `postgres` service.
    *   **Permission Denied (Volume Mounts)**: Ensure Docker has permission to write to mounted volumes on your host system, especially for database data.
*   **Kubernetes Deployment Issues**:
    *   **Pods Stuck in `Pending`**: Describe pod `kubectl describe pod <pod-name> -n arkfoundry` to see reasons (e.g., insufficient resources, image pull errors, PVC binding issues).
    *   **`ImagePullBackOff` / `ErrImagePull`**: Docker image URI incorrect in deployment manifests, or Kubernetes cluster cannot access the image registry (authentication or network issue).
    *   **`CrashLoopBackOff`**: Pod is starting and then crashing. Check logs: `kubectl logs <pod-name> -n arkfoundry -p` (for previous container) and `kubectl logs -f <pod-name> -n arkfoundry`. Often due to misconfiguration (missing secrets/configmaps, incorrect DB connection string for K8s service names).
    *   **Database Connection from Pods**: Ensure Kubernetes service names for PostgreSQL/Redis are correctly used in connection strings and that network policies allow communication.
*   **Application Errors**:
    *   **500 Internal Server Error**: Check API service logs (`arkfoundry-api`) for detailed Python tracebacks.
    *   **401 Unauthorized / 403 Forbidden**: JWT issues, incorrect API key, or RBAC/ZTA policy denials. Check ZTA audit logs.
    *   **Celery Tasks Not Running**: Ensure Celery workers (`arkfoundry-worker`) are running and connected to the message broker (Redis). Check worker logs. Ensure `CELERY_BROKER_URL` is correct for the K8s/Docker environment.
*   **Log Locations**:
    *   **Docker Compose**: `docker-compose logs <service_name>`
    *   **Kubernetes**: `kubectl logs <pod-name> -n arkfoundry [-c <container_name>]`
    *   **Application Log Files**: If services log to files inside containers, check their configured paths. Production setups should forward logs to a centralized system.

## 10. Security Considerations Post-Installation (Production)

*   **Change ALL Default Credentials**: Especially the initial admin user and any default database/service passwords.
*   **Secure `.env` / Kubernetes Secrets**: Strictly control access to configuration files and Kubernetes Secret objects.
*   **Network Security**: Configure firewall rules (Security Groups, NACLs in AWS) to restrict access to services. Expose only necessary ports externally (e.g., 80/443 for Ingress).
*   **Regular Updates**: Keep all system dependencies, OS, Docker images, and ArkFoundry platform code updated with security patches.
*   **KMS Security**: Ensure your Key Management Service (e.g., AWS KMS) policies are correctly configured to restrict access to Key Encrypting Keys (KEKs).
*   **Monitoring & Alerting**: Actively monitor platform health, security logs (ZTA, Data Sovereignty audits), and set up alerts for suspicious activities.
*   **Backup & Recovery**: Implement and regularly test backup and disaster recovery procedures for databases and critical data.
*   **User Access Reviews**: Periodically review user roles, permissions, and security clearance levels.

This guide provides a comprehensive overview for installing ArkFoundry Platform 1.7. For more detailed information on specific components or advanced configurations, please refer to the respective documents in the `/docs` directory.
