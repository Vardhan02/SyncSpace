FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# deps first so code changes don't reinstall them
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY main.py .
COPY src ./src

# model files and job logs live on mounted volumes, not in the image
RUN mkdir -p VLMmodels logs data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=4)"

CMD ["python", "main.py"]
