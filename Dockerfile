FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY requirements-advanced.txt ./
RUN python3 -m venv /opt/drevia-python && /opt/drevia-python/bin/pip install --no-cache-dir -r requirements-advanced.txt
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node . .
USER node
ENV NODE_ENV=production PORT=3000
ENV PYTHON_BIN=/opt/drevia-python/bin/python
EXPOSE 3000
CMD ["node","server.js"]
