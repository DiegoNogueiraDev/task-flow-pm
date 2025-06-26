# 🐳 Task Flow PM Docker Image
FROM node:18-alpine AS base

# 📦 Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# 🔧 Set working directory
WORKDIR /app

# 📋 Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# 🏗️ Build stage
FROM base AS builder

# 📦 Install all dependencies (including dev)
RUN npm ci --include=dev

# 📁 Copy source code
COPY src/ ./src/
COPY bin/ ./bin/
COPY scripts/ ./scripts/

# 🔨 Build the application
RUN npm run build
RUN npm run test

# 🚀 Production stage
FROM base AS production

# 👤 Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S taskflow -u 1001

# 📦 Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# 📁 Copy built application from builder stage
COPY --from=builder --chown=taskflow:nodejs /app/dist ./dist
COPY --from=builder --chown=taskflow:nodejs /app/package*.json ./

# 📂 Create necessary directories
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R taskflow:nodejs /app

# 🔧 Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/uploads

# 🔗 Expose port
EXPOSE 3000

# 👤 Switch to non-root user
USER taskflow

# 🏥 Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/bin/server.js --health-check || exit 1

# 🚀 Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/bin/server.js"]

# 📊 Labels for metadata
LABEL maintainer="Task Flow PM Team <hello@task-flow-pm.org>"
LABEL version="1.0.0"
LABEL description="AI-powered task management with document processing"
LABEL org.opencontainers.image.title="Task Flow PM"
LABEL org.opencontainers.image.description="Transform documents into actionable tasks with AI"
LABEL org.opencontainers.image.vendor="Task Flow PM"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/diegonogueira/task-flow-pm"
LABEL org.opencontainers.image.documentation="https://github.com/diegonogueira/task-flow-pm/blob/main/README.md" 