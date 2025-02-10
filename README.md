<p align="center">
    <a href="http://nestjs.com/" target="blank">
        <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
    </a>
    <br/>
    <strong>File Storage Service</strong>
    <br/>
    A test task for VReal Soft
</p>

## Description

This project is a simple file storage service that allows users to upload, manage, and edit files. Key features include:

- File and folder management with access permissions
- Real-time synchronization of data between users
- Ability to share file access via email with specific permissions (similar to Google Drive)
- Files are stored securely on **AWS S3**

The project is built using **NestJS** and **PostgreSQL**, with **Docker** support for easy setup.

A deployed version of this service is available at: **[https://vreal-soft-test-task.onrender.com/docs](https://vreal-soft-test-task.onrender.com/docs)**

## Installation

Clone the repository and install dependencies:

```bash
$ git clone https://github.com/bohdan-ilienko-work/vreal-soft-test-task.git
$ cd vreal-soft-test-task
$ npm install
```

## Setup PostgreSQL with Docker

To run the PostgreSQL database using Docker Compose, follow these steps:

1. Create a `docker-compose.yml` file with the following content:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: local_postgres
    restart: always
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
      POSTGRES_DB: vreal_test_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2. Start PostgreSQL:

```bash
$ docker-compose up -d
```

## Running the Project

To start the service, use one of the following commands:

```bash
# Development mode
$ npm run start
```

```bash
# Watch mode (auto-restart on file changes)
$ npm run start:dev
```

```bash
# Production mode
$ npm run build

$ npm run start:prod
```

## API Documentation

Once the service is running, you can access the API documentation at:

🔗 **[Swagger API Docs](https://vreal-soft-test-task.onrender.com/docs)**

This page provides details on available endpoints, request formats, and response structures.
