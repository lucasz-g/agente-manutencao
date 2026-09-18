FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# requirements.txt e um pip freeze do ambiente Windows (pywin32, pyinstaller, etc.)
# e nao instala em Linux. Aqui usamos as dependencias declaradas no pyproject.
COPY pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi[standard]>=0.141.1" \
    "azure-identity>=1.19.0" \
    "mcp>=1.0.0" \
    "python-dotenv>=1.0.0" \
    "uvicorn>=0.30.0"

COPY main.py ./
COPY service ./service

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
