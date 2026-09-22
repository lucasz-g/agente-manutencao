FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# As dependencias vivem no pyproject.toml e sao lidas de la, para nao existirem
# duas listas que divergem. O uv instala a partir do pyproject sem precisar
# empacotar o projeto.
#
# requirements.txt e um pip freeze do ambiente Windows (pywin32, pyinstaller...)
# e nao instala em Linux; o .dockerignore o mantem fora do build.
COPY pyproject.toml ./
RUN pip install --no-cache-dir uv==0.9.29 \
    && uv pip install --system --no-cache -r pyproject.toml \
    && pip uninstall -y uv

COPY main.py ./
COPY service ./service

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
