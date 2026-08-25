use std::env;
use axum::http::HeaderValue;

#[derive(Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub origins: Vec<String>,
    pub is_production: bool,
    pub public_api_base_url: String,
    pub initial_admin_email: Option<String>,
    pub initial_admin_password: Option<String>,
    pub initial_client_email: Option<String>,
    pub initial_client_password: Option<String>,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_redirect_uri: Option<String>,
    pub google_portal_redirect_url: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let node_env = env::var("NODE_ENV").unwrap_or_else(|_| "development".into());
        let is_production = node_env == "production";
        let origins = env::var("APP_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000".into())
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();
        if origins.is_empty() { return Err("APP_ORIGINS must contain at least one URL".into()); }
        if is_production && env::var("DATABASE_URL").unwrap_or_default().is_empty() {
            return Err("Production requires DATABASE_URL. The memory store cannot be deployed.".into());
        }

        let initial_admin_email = env::var("INITIAL_ADMIN_EMAIL").ok().filter(|value| !value.is_empty());
        let initial_admin_password = env::var("INITIAL_ADMIN_PASSWORD").ok().filter(|value| !value.is_empty());
        if initial_admin_email.is_some() ^ initial_admin_password.is_some() {
            return Err("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must both be provided together.".into());
        }

        let initial_client_email = env::var("INITIAL_CLIENT_EMAIL").ok().filter(|value| !value.is_empty());
        let initial_client_password = env::var("INITIAL_CLIENT_PASSWORD").ok().filter(|value| !value.is_empty());
        if initial_client_email.is_some() ^ initial_client_password.is_some() {
            return Err("INITIAL_CLIENT_EMAIL and INITIAL_CLIENT_PASSWORD must both be provided together.".into());
        }

        Ok(Self {
            host: env::var("API_HOST").unwrap_or_else(|_| "127.0.0.1".into()),
            port: env::var("API_PORT").ok().and_then(|value| value.parse().ok()).unwrap_or(5000),
            origins,
            is_production,
            public_api_base_url: env::var("PUBLIC_API_BASE_URL").unwrap_or_else(|_| "http://localhost:5000/api/v1".into()),
            initial_admin_email,
            initial_admin_password,
            initial_client_email,
            initial_client_password,
            google_client_id: env::var("GOOGLE_CLIENT_ID").ok().filter(|value| !value.is_empty()),
            google_client_secret: env::var("GOOGLE_CLIENT_SECRET").ok().filter(|value| !value.is_empty()),
            google_redirect_uri: env::var("GOOGLE_REDIRECT_URI").ok().filter(|value| !value.is_empty()),
            google_portal_redirect_url: env::var("GOOGLE_PORTAL_REDIRECT_URL").ok().filter(|value| !value.is_empty()),
        })
    }

    pub fn bind_address(&self) -> String { format!("{}:{}", self.host, self.port) }

    pub fn allowed_origins(&self) -> Vec<HeaderValue> {
        self.origins.iter().filter_map(|origin| HeaderValue::from_str(origin).ok()).collect()
    }
}
