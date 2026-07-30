# AI/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Upgrade pip to prevent hash mismatch issues
RUN pip install --no-cache-dir --upgrade pip

# Pre-install CPU-only PyTorch to bypass the massive 520MB+ GPU download
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]