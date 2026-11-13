# The Microsoft image keeps an old Node 22 (22.16 at the time of writing), but
# Angular CLI 22 needs >= 22.22.3 (engines in the root package.json).
# The official tarball replaces Node and npm in /usr/local; bump NODE_VERSION
# and both checksums (https://nodejs.org/dist/v<version>/SHASUMS256.txt) together.
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

ARG NODE_VERSION=22.23.5
ARG NODE_SHA256_X64=cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8
ARG NODE_SHA256_ARM64=2babb9eb5264860d540849f4b064a6fbdebcdc323657d9d382ce23d313fd5e09

RUN set -eux; \
    case "$(uname -m)" in \
      x86_64)  ARCH=x64;   SHA="$NODE_SHA256_X64" ;; \
      aarch64) ARCH=arm64; SHA="$NODE_SHA256_ARM64" ;; \
      *) echo "unsupported architecture $(uname -m)" >&2; exit 1 ;; \
    esac; \
    FILE="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"; \
    curl -fsSL -o "/tmp/${FILE}" "https://nodejs.org/dist/v${NODE_VERSION}/${FILE}"; \
    echo "${SHA}  /tmp/${FILE}" | sha256sum -c -; \
    tar -xJf "/tmp/${FILE}" -C /usr/local --strip-components=1 --no-same-owner \
      --exclude='*/CHANGELOG.md' --exclude='*/LICENSE' --exclude='*/README.md'; \
    rm "/tmp/${FILE}"; \
    node -v
