FROM python:3.12-slim AS base
WORKDIR /app
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ .
EXPOSE 9050
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9050"]