# 🦁 Savage Frameworks - Demo Server
# 
# Dockerfile for serving the Savage Frameworks demo site
# Uses nginx:alpine for minimal footprint and maximum performance
#
# Standards: Dockerfile best practices 2026
# Repository: https://github.com/savagenights/savage_frameworks.git

FROM nginx:alpine

# Set maintainer label
LABEL maintainer="Savage Nights Collective"
LABEL version="0.1.0-alpha"
LABEL description="Savage Frameworks Demo Server"

# Install curl for health checks
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy framework source and examples
COPY src/ /usr/share/nginx/html/src/
COPY examples/ /usr/share/nginx/html/examples/
COPY demo/ /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/
COPY LICENSE /usr/share/nginx/html/
COPY technology_living_standards.md /usr/share/nginx/html/

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
