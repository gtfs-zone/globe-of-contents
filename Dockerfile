# Serves the built site as an immutable image, deployed to k3s by ArgoCD
# (deploy-gtfs-rt, sites/globe-of-contents.yaml). Expects `dist/` to exist: run
# `pnpm build` first, which is what CI does before calling docker build.
#
# nginx-unprivileged listens on :8080 as uid 101 and never needs root, so the
# pod can run with runAsNonRoot + readOnlyRootFilesystem.
FROM nginxinc/nginx-unprivileged:1.29-alpine

# The image's entrypoint renders nginx.conf as an envsubst template at start.
# It writes to /tmp, which the pod already mounts writable under
# readOnlyRootFilesystem; conf.d holds only the include of the rendered file.
# PAGES_UPSTREAM is where feed page fragments and the sitemap are fetched from;
# the cluster points it at Garage directly. NGINX_ENTRYPOINT_LOCAL_RESOLVERS
# exports /etc/resolv.conf's nameservers as NGINX_LOCAL_RESOLVERS.
ENV PAGES_UPSTREAM=https://data.gtfs.zone \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_OUTPUT_DIR=/tmp

COPY nginx.conf /etc/nginx/templates/default.conf.template
RUN echo 'include /tmp/default.conf;' > /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 8080
