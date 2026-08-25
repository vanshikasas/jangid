FROM rust:1.89-bookworm AS builder

WORKDIR /workspace
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --uid 10001 skja
WORKDIR /app

COPY --from=builder /workspace/target/release/skja-api /app/skja-api
RUN chown skja:skja /app/skja-api

USER skja

ENV NODE_ENV=development
ENV API_HOST=0.0.0.0
ENV API_PORT=5000
ENV APP_ORIGINS=http://localhost:3000

EXPOSE 5000
ENTRYPOINT ["/app/skja-api"]
