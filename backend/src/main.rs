mod api;
mod config;
mod state;

use std::sync::Arc;
use axum::{
    Router, http::{HeaderName, HeaderValue, Method, StatusCode}, routing::get
};
use config::Config;
use state::AppState;
use tower_http::{
    cors::CorsLayer, 
    limit::RequestBodyLimitLayer, 
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer}, 
    set_header::SetResponseHeaderLayer, timeout::TimeoutLayer, trace::TraceLayer
};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = Config::from_env().expect("invalid environment configuration");
    let state = Arc::new(AppState::new(config.clone()).await);

    let cors = CorsLayer::new()
        .allow_origin(config.allowed_origins())
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE, Method::OPTIONS])
        .allow_headers([http::header::CONTENT_TYPE, HeaderName::from_static("x-csrf-token")]);

    let app = Router::new()
        .route("/health", get(api::health))
        .merge(api::router())
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(20 * 1024 * 1024))
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            std::time::Duration::from_secs(15),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            http::header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(PropagateRequestIdLayer::new(HeaderName::from_static("x-request-id")))
        .layer(SetRequestIdLayer::new(HeaderName::from_static("x-request-id"), MakeRequestUuid))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(config.bind_address()).await.expect("failed to bind API port");
    println!("SKJA API listening on http://{}", config.bind_address());
    axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await.expect("API server failed");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}
