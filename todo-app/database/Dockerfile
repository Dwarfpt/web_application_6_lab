FROM postgres:15-alpine

COPY init.sql /docker-entrypoint-initdb.d/

ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=todo_db

EXPOSE 5432