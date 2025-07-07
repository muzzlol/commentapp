# CommentApp

This is a full-stack, backend-focused comment application designed to demonstrate clean architecture, database design, and DevOps practices.

The entire application is containerized and can be run with a single command.

## Tech Stack

-   **Backend**: NestJS, TypeScript
-   **Frontend**: React, TypeScript
-   **Database**: PostgreSQL
-   **Containerization**: Docker & Docker Compose

## Prerequisites

-   Docker
-   Docker Compose

## Running the Application

1.  Clone the repository:
    ```bash
    git clone https://github.com/muzzlol/commentapp.git
    cd commentapp
    ```

2.  Start the entire application stack:
    ```bash
    docker compose up --build
    ```

The `--build` flag is recommended for the first run to ensure the Docker images are built from the latest source code.

## Accessing the Services

Once the containers are up and running, you can access the different parts of the application:

-   **Frontend Application**: [http://localhost:3000](http://localhost:3000)
-   **Backend API**: [http://localhost:3001](http://localhost:3001)
-   **Database**: Connect via `localhost:5432` (credentials are in `backend/.env.db`)

The application is now ready for use. You can sign up for a new account and begin posting comments. 