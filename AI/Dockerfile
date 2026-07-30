# AI/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Upgrade pip to prevent hash mismatch issues with modern packages
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]