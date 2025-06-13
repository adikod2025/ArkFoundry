#!/bin/bash
#
# ArkFoundry Sovereign AI Platform - Installation Script
# Release 1.7
#
# This script automates the setup process for the ArkFoundry Platform,
# including environment checks, dependency validation, and guided setup options.
#

# --- Script Configuration ---
SET_X=${SET_X:-false}
if [[ "$SET_X" == "true" ]]; then
    set -x # Enable debugging if SET_X is true
fi

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Colors and Logging ---
COLOR_RESET='\033[0m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'

log_info() {
    echo -e "${COLOR_BLUE}[INFO] ${1}${COLOR_RESET}"
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS] ${1}${COLOR_RESET}"
}

log_warning() {
    echo -e "${COLOR_YELLOW}[WARNING] ${1}${COLOR_RESET}"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR] ${1}${COLOR_RESET}" >&2
}

log_debug() {
    if [[ "$SET_X" == "true" ]]; then
        echo -e "${COLOR_CYAN}[DEBUG] ${1}${COLOR_RESET}"
    fi
}

# --- Helper Functions ---
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_dependency() {
    local cmd="$1"
    local purpose="$2"
    log_info "Checking for ${cmd}..."
    if command_exists "${cmd}"; then
        log_success "${cmd} is installed."
    else
        log_error "${cmd} is not installed. ${purpose} Please install it and re-run the script."
        exit 1
    fi
}

prompt_yes_no() {
    local prompt_message="$1"
    local default_value="${2:-yes}" # Default to 'yes' if not specified
    local input

    while true; do
        read -r -p "$(echo -e "${COLOR_YELLOW}${prompt_message} (yes/no) [${default_value}]: ${COLOR_RESET}")" input
        input="${input:-${default_value}}" # Use default if input is empty
        input=$(echo "$input" | tr '[:upper:]' '[:lower:]') # Convert to lowercase

        if [[ "$input" == "yes" || "$input" == "y" ]]; then
            return 0 # True
        elif [[ "$input" == "no" || "$input" == "n" ]]; then
            return 1 # False
        else
            log_warning "Invalid input. Please enter 'yes' or 'no'."
        fi
    done
}

# --- Environment Checks ---
perform_environment_checks() {
    log_info "Performing environment checks..."
    check_dependency "git" "Git is required to clone the repository."
    check_dependency "python3" "Python 3.9+ is required."
    check_dependency "pip3" "pip3 is required for Python package management (if setting up from source)."
    check_dependency "docker" "Docker Engine is required to run containerized services."
    check_dependency "docker-compose" "Docker Compose is required for local development setup."
    log_success "Core dependencies are installed."

    if command_exists "aws"; then
        log_info "AWS CLI found. Version: $(aws --version)"
    else
        log_warning "AWS CLI not found. It will be required for AWS EKS deployments using Terraform."
    fi

    if command_exists "kubectl"; then
        log_info "kubectl found. Version: $(kubectl version --client --short)"
    else
        log_warning "kubectl not found. It will be required for Kubernetes deployments."
    fi

    if command_exists "terraform"; then
        log_info "Terraform found. Version: $(terraform --version)"
    else
        log_warning "Terraform not found. It will be required for AWS infrastructure provisioning."
    fi
    log_success "Environment checks completed."
}

# --- Configuration Setup (.env file) ---
setup_env_file() {
    log_info "Setting up environment configuration (.env file)..."
    if [ -f ".env" ]; then
        log_success ".env file already exists."
        if prompt_yes_no "Do you want to overwrite the existing .env file with the template?" "no"; then
            log_info "Keeping existing .env file."
        else
            cp .env.example .env
            log_success ".env file created from .env.example."
            edit_env_file_guided
        fi
    else
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success ".env file created from .env.example."
            edit_env_file_guided
        else
            log_error ".env.example not found. Cannot create .env file. Please ensure the repository is complete."
            exit 1
        fi
    fi
}

edit_env_file_guided() {
    log_info "Please review and edit the .env file with your specific configurations."
    log_warning "CRITICAL: Ensure you set strong, unique values for FLASK_ENV (production for live), SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, REDIS_URL, and MAIL_PASSWORD."
    log_warning "For local Docker Compose, DATABASE_URL should typically use 'postgres' as hostname, and REDIS_URL use 'redis'."
    log_warning "Example: DATABASE_URL=postgresql://arkfoundry_user:arkfoundry_password@postgres:5432/arkfoundry_db"
    log_warning "Example: REDIS_URL=redis://redis:6379/0"

    if prompt_yes_no "Do you want to open .env for editing now (using default editor \$EDITOR, or nano/vi)?" "yes"; then
        if [ -n "$EDITOR" ]; then
            "$EDITOR" .env
        elif command_exists "nano"; then
            nano .env
        elif command_exists "vi"; then
            vi .env
        else
            log_warning "No standard editor found. Please edit .env manually."
        fi
        log_info "Ensure you have saved your changes to .env if you edited it."
    else
        log_info "Please edit the .env file manually before proceeding with service startup."
    fi

    # Validate some critical keys are not default placeholders
    if grep -q "your_super_secret_and_long_random_string_here" .env || grep -q "another_very_strong_and_random_jwt_secret_key" .env; then
        log_error "CRITICAL: Default placeholder values found for SECRET_KEY or JWT_SECRET_KEY in .env. Please update them with strong, unique random strings."
        if prompt_yes_no "Continue anyway (NOT RECOMMENDED for production)?" "no"; then
            exit 1
        fi
    fi
    if grep -q "SovereignPassword2025!_ChangeMe!" .env; then
        log_warning "WARNING: Default admin password placeholder found in .env. Remember to change it immediately after first login."
    fi
}

# --- Local Docker Compose Installation ---
install_local_docker_compose() {
    log_info "Starting Local Development/Testing Setup via Docker Compose..."

    setup_env_file

    log_info "Building Docker images (this may take some time)..."
    if docker-compose build; then
        log_success "Docker images built successfully."
    else
        log_error "Docker image build failed. Please check the output above for errors."
        exit 1
    fi

    log_info "Starting ArkFoundry services in detached mode..."
    if docker-compose up -d; then
        log_success "ArkFoundry services started successfully."
    else
        log_error "Failed to start services with docker-compose. Check logs with 'docker-compose logs'."
        exit 1
    fi

    log_info "Waiting for PostgreSQL database to be ready (up to 60 seconds)..."
    local db_ready_attempts=0
    local max_db_attempts=60 # 60 seconds
    while ! (docker-compose exec -T postgres pg_isready -U "$(grep POSTGRES_USER .env | cut -d '=' -f2)" -d "$(grep POSTGRES_DB .env | cut -d '=' -f2)" -q); do
        db_ready_attempts=$((db_ready_attempts + 1))
        if [ "$db_ready_attempts" -ge "$max_db_attempts" ]; then
            log_error "PostgreSQL database did not become ready in time. Check 'docker-compose logs postgres'."
            exit 1
        fi
        log_debug "Database not ready yet, waiting 1 second... (Attempt ${db_ready_attempts}/${max_db_attempts})"
        sleep 1
    done
    log_success "PostgreSQL database is ready."

    log_info "Running database migrations..."
    if docker-compose exec -T arkfoundry-api flask db upgrade; then
        log_success "Database migrations applied successfully."
    else
        log_error "Database migration failed. Check 'docker-compose logs arkfoundry-api'."
        exit 1
    fi

    log_info "Seeding initial database data..."
    if docker-compose exec -T arkfoundry-api python init_db.py; then
        log_success "Initial data seeded successfully."
    else
        log_error "Database seeding failed. Check 'docker-compose logs arkfoundry-api'."
        # This might not be critical for startup, so continue with a warning.
        log_warning "Continuing despite seeding failure. Some functionalities might be affected."
    fi

    log_success "ArkFoundry Platform (Local Docker Compose) setup complete!"
    echo -e "${COLOR_CYAN}-------------------------------------------------------------------${COLOR_RESET}"
    echo -e "${COLOR_CYAN} Access URLs:${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   - API Base:           http://localhost:5000/api/v1/ ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   - API Docs (Swagger): http://localhost:5000/api/v1/docs ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   - Admin Portal:       http://localhost:8080/admin ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   - Developer Portal:   http://localhost:8080/developer ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   - Celery Monitor:     http://localhost:5555 (Flower) ${COLOR_RESET}"
    echo -e "${COLOR_CYAN} Default Admin Credentials (from .env, change immediately!):${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   Email:    $(grep DEFAULT_ADMIN_EMAIL .env | cut -d '=' -f2) ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}   Password: $(grep DEFAULT_ADMIN_PASSWORD .env | cut -d '=' -f2) ${COLOR_RESET}"
    echo -e "${COLOR_CYAN}-------------------------------------------------------------------${COLOR_RESET}"
    log_info "To stop services: docker-compose down"
    log_info "To stop and remove data volumes: docker-compose down -v"
}

# --- Prepare for Kubernetes ---
prepare_for_kubernetes() {
    log_info "Preparing for Kubernetes Deployment..."
    log_info "This script will not perform the Kubernetes deployment itself but will guide you on next steps."

    check_dependency "kubectl" "kubectl is required to interact with Kubernetes clusters."
    check_dependency "terraform" "Terraform is required if using provided AWS IaC scripts."
    check_dependency "aws" "AWS CLI is required for AWS EKS deployments."

    log_info "Key steps for Kubernetes deployment:"
    echo "1.  ${COLOR_YELLOW}Build and Push Docker Images:${COLOR_RESET}"
    echo "    - Modify Dockerfiles in 'dockerfiles/production/' if needed."
    echo "    - Build production-ready images for 'arkfoundry-api', 'arkfoundry-worker', 'arkfoundry-website'."
    echo "    - Example: docker build -t YOUR_REGISTRY/arkfoundry-api:v1.7 -f dockerfiles/production/api/Dockerfile ."
    echo "    - Push these images to your container registry (e.g., AWS ECR, Docker Hub, GCR)."

    echo "2.  ${COLOR_YELLOW}Configure Infrastructure (if using Terraform for AWS EKS):${COLOR_RESET}"
    echo "    - Navigate to 'infrastructure/terraform/aws/'."
    echo "    - Create 'terraform.tfvars' and customize variables (region, cluster name, DB credentials, image URIs, domain)."
    echo "    - Run 'terraform init', 'terraform plan', and 'terraform apply'."
    echo "    - Update your kubeconfig using the command output by Terraform."
    echo "    - Refer to 'infrastructure/terraform/aws/README.md' for detailed instructions."

    echo "3.  ${COLOR_YELLOW}Prepare Kubernetes Manifests/Helm Chart:${COLOR_RESET}"
    echo "    - Navigate to the 'kubernetes/' directory."
    echo "    - Update image tags in deployment YAMLs or Helm 'values.yaml' to your pushed image URIs."
    echo "    - Create Kubernetes Secrets for sensitive configurations (from your production .env file)."
    echo "      Example: kubectl create secret generic arkfoundry-secrets --from-env-file=path/to/production.env -n arkfoundry-production"
    echo "    - Review and customize ConfigMaps, Deployments, Services, and Ingress resources."

    echo "4.  ${COLOR_YELLOW}Deploy to Kubernetes:${COLOR_RESET}"
    echo "    - Using kubectl: Apply the manifests in order (namespace, secrets, configmaps, deployments, services, ingress)."
    echo "      Example: kubectl apply -f kubernetes/namespace.yaml"
    echo "    - Using Helm (if chart available): helm install arkfoundry ./kubernetes/helm/arkfoundry -n arkfoundry-production -f values-production.yaml"

    echo "5.  ${COLOR_YELLOW}Database Initialization (Production):${COLOR_RESET}"
    echo "    - Once API pods are running and connected to RDS/managed DB:"
    echo "      kubectl exec -it <arkfoundry-api-pod-name> -n arkfoundry-production -- bash"
    echo "      # Inside pod: flask db upgrade"
    echo "      # Inside pod: python init_db.py --environment production"

    echo "6.  ${COLOR_YELLOW}Configure DNS & SSL:${COLOR_RESET}"
    echo "    - Point your domain to the LoadBalancer/Ingress IP/hostname."
    echo "    - Ensure SSL certificates are configured (e.g., AWS ACM, cert-manager)."

    log_info "Refer to 'docs/INSTALLATION.md' and 'docs/DEPLOYMENT_KUBERNETES.md' for complete details."
    log_success "Preparation guidance for Kubernetes deployment complete."
}

# --- Main Script Logic ---
main() {
    echo -e "${COLOR_GREEN}=====================================================${COLOR_RESET}"
    echo -e "${COLOR_GREEN}  ArkFoundry Sovereign AI Platform - Installation   ${COLOR_RESET}"
    echo -e "${COLOR_GREEN}  Release 1.7                                       ${COLOR_RESET}"
    echo -e "${COLOR_GREEN}=====================================================${COLOR_RESET}"
    echo ""

    perform_environment_checks
    echo ""

    log_info "Please choose an installation path:"
    echo "1. Local Development/Testing Setup (using Docker Compose)"
    echo "2. Prepare for Kubernetes Deployment (Guidance and Checks)"
    echo "3. Exit"
    echo ""
    read -r -p "Enter your choice (1-3): " choice

    case "$choice" in
        1)
            install_local_docker_compose
            ;;
        2)
            prepare_for_kubernetes
            ;;
        3)
            log_info "Exiting installation script."
            exit 0
            ;;
        *)
            log_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac

    log_success "ArkFoundry Platform setup process finished."
}

# --- Trap Errors ---
trap 'log_error "An error occurred. Exiting script." >&2; exit 1;' ERR

# --- Run Main Function ---
main
