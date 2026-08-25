use std::{collections::HashMap, sync::Arc, time::{Duration, SystemTime}};
use axum::{Router, Json, body::Body, extract::{Multipart, Path, Query, State, WebSocketUpgrade, ws::{Message as WebSocketMessage, WebSocket}}, http::{HeaderMap, HeaderValue, StatusCode, header}, response::{IntoResponse, Response}, routing::{delete, get, patch, post}};
use futures_util::StreamExt;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use crate::state::{self, AppState, Attendance, CLIENT_ROLES, FileRecord, FileSummary, Inquiry, Message, OAuthState, PROJECT_MANAGER_ROLES, Project, PublicUser, RateWindow, Service, Session, Task, User, EMPLOYER_ROLES};

const SESSION_TTL: Duration = Duration::from_secs(15 * 60);
const OAUTH_STATE_TTL: Duration = Duration::from_secs(10 * 60);
const MAX_FILE_SIZE: usize = 20 * 1024 * 1024;

#[derive(Serialize)]
struct Envelope<T: Serialize> { data: T }
#[derive(Serialize)]
struct ErrorEnvelope { error: ErrorPayload }
#[derive(Serialize)]
struct ErrorPayload { code: &'static str }
#[derive(Debug)]
pub struct ApiError { status: StatusCode, code: &'static str }

impl ApiError {
    const fn new(status: StatusCode, code: &'static str) -> Self { Self { status, code } }
    const fn invalid() -> Self { Self::new(StatusCode::BAD_REQUEST, "INVALID_REQUEST") }
    const fn forbidden() -> Self { Self::new(StatusCode::FORBIDDEN, "FORBIDDEN") }
    const fn unauthenticated() -> Self { Self::new(StatusCode::UNAUTHORIZED, "AUTHENTICATION_REQUIRED") }
}
impl IntoResponse for ApiError {
    fn into_response(self) -> Response { (self.status, Json(ErrorEnvelope { error: ErrorPayload { code: self.code } })).into_response() }
}
fn ok<T: Serialize>(data: T) -> Response { (StatusCode::OK, Json(Envelope { data })).into_response() }
fn created<T: Serialize>(data: T) -> Response { (StatusCode::CREATED, Json(Envelope { data })).into_response() }
fn no_content() -> Response { StatusCode::NO_CONTENT.into_response() }

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/v1/public/projects", get(public_projects))
        .route("/api/v1/public/services", get(public_services))
        .route("/api/v1/public/media/{scope}", get(public_media))
        .route("/api/v1/public/files/{id}", get(public_file))
        .route("/api/v1/inquiries/client", post(client_inquiry))
        .route("/api/v1/inquiries/employment", post(employment_inquiry))
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/me", get(me))
        .route("/api/v1/auth/logout", post(logout))
        .route("/api/v1/auth/forgot", post(not_implemented))
        .route("/api/v1/auth/reset", post(not_implemented))
        .route("/api/v1/auth/google", get(google_login))
        .route("/api/v1/auth/google/callback", get(google_callback))
        .route("/api/v1/admin/overview", get(admin_overview))
        .route("/api/v1/admin/users", get(admin_users).post(create_user))
        .route("/api/v1/admin/users/{id}", delete(delete_user))
        .route("/api/v1/admin/users/{id}/password", patch(reset_user_password))
        .route("/api/v1/admin/inquiries", get(admin_inquiries))
        .route("/api/v1/admin/projects", get(admin_projects).post(create_project))
        .route("/api/v1/admin/projects/{id}", patch(update_project).delete(delete_project))
        .route("/api/v1/admin/tasks", get(admin_tasks).post(create_task))
        .route("/api/v1/admin/tasks/{id}", patch(update_task))
        .route("/api/v1/admin/attendance", get(admin_attendance).post(mark_attendance))
        .route("/api/v1/admin/files", get(list_files))
        .route("/api/v1/admin/files/upload", post(upload_file))
        .route("/api/v1/admin/files/{id}", get(download_file).delete(delete_file))
        .route("/api/v1/admin/media/{scope}", get(admin_media))
        .route("/api/v1/admin/media/{scope}/upload", post(upload_media))
        .route("/api/v1/admin/media/{scope}/{id}", delete(delete_media))
        .route("/api/v1/client/projects", get(client_projects))
        .route("/api/v1/client/team", get(client_team))
        .route("/api/v1/client/overview", get(client_overview))
        .route("/api/v1/chat/messages", get(list_messages).post(create_message))
        .route("/ws", get(websocket))
}

async fn websocket(State(state): State<Arc<AppState>>, headers: HeaderMap, upgrade: WebSocketUpgrade) -> Result<Response, ApiError> {
    authenticate(&state, &headers).await?;
    let events = state.events.subscribe();
    Ok(upgrade.on_upgrade(move |socket| websocket_session(socket, events)))
}

async fn websocket_session(mut socket: WebSocket, mut events: tokio::sync::broadcast::Receiver<String>) {
    loop {
        tokio::select! {
            incoming = socket.next() => match incoming {
                Some(Ok(WebSocketMessage::Text(message))) if message == "PING" => {
                    if socket.send(WebSocketMessage::Text("PONG".into())).await.is_err() { break; }
                }
                Some(Ok(WebSocketMessage::Close(_))) | None | Some(Err(_)) => break,
                _ => {}
            },
            event = events.recv() => match event {
                Ok(message) => if socket.send(WebSocketMessage::Text(message.into())).await.is_err() { break; },
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
            }
        }
    }
}

pub async fn health(State(state): State<Arc<AppState>>) -> Response {
    ok(json!({ "status": "ok", "mode": if state.config.is_production { "persistent" } else { "memory" } }))
}

async fn public_projects(State(state): State<Arc<AppState>>) -> Result<Response, ApiError> {
    let store = state.store.read().await;
    let media = media_for_scope(&store.files, "projects");
    let projects = with_media_images(store.projects.clone(), &media);
    let mut response = ok(projects);
    response.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=60, s-maxage=600, stale-while-revalidate=120"));
    Ok(response)
}
async fn public_services(State(state): State<Arc<AppState>>) -> Result<Response, ApiError> {
    let store = state.store.read().await;
    let media = media_for_scope(&store.files, "services");
    let services = with_media_images(store.services.clone(), &media);
    let mut response = ok(services);
    response.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=60, s-maxage=600, stale-while-revalidate=120"));
    Ok(response)
}

async fn public_media(State(state): State<Arc<AppState>>, Path(scope): Path<String>) -> Result<Response, ApiError> {
    let scope = normalize_media_scope(&scope)?;
    let files = state.store.read().await.files.iter().filter(|file| file.scope.as_deref() == Some(scope)).map(FileSummary::from).collect::<Vec<_>>();
    Ok(ok(files))
}

async fn public_file(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Result<Response, ApiError> {
    let file = state.store.read().await.files.iter().find(|file| file.id == id && file.scope.is_some()).cloned().ok_or(ApiError::new(StatusCode::NOT_FOUND, "FILE_NOT_FOUND"))?;
    let mut response = Body::from(file.bytes).into_response();
    response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_str(&file.content_type).unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")));
    response.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("public, max-age=300, s-maxage=3600, stale-while-revalidate=600"));
    Ok(response)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientInquiryRequest { name: String, email: String, project_type: String, message: String }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmploymentInquiryRequest { name: String, email: String, phone: String, position: String, portfolio_url: String, message: String }

async fn client_inquiry(State(state): State<Arc<AppState>>, Json(body): Json<ClientInquiryRequest>) -> Result<Response, ApiError> {
    validate_inquiry(&body.name, &body.email, &body.message)?;
    if !["Residential", "Commercial", "Hospitality", "Interiors", "Other"].contains(&body.project_type.as_str()) { return Err(ApiError::invalid()); }
    if is_limited(&state, format!("client:{}", state::normalize_email(&body.email)), 8, Duration::from_secs(3600)).await { return Err(ApiError::new(StatusCode::TOO_MANY_REQUESTS, "RATE_LIMITED")); }
    let inquiry = Inquiry { id: Uuid::new_v4().to_string(), kind: "CLIENT".into(), name: body.name.trim().into(), email: state::normalize_email(&body.email), phone: None, subject: body.project_type.clone(), payload: json!({ "projectType": body.project_type, "message": body.message.trim() }), created_at: state::now() };
    let id = inquiry.id.clone(); state.store.write().await.inquiries.push(inquiry);
    state.record_audit(None, "INQUIRY_CREATED", "INQUIRY", Some(id.clone())).await;
    Ok(created(json!({ "id": id })))
}
async fn employment_inquiry(State(state): State<Arc<AppState>>, Json(body): Json<EmploymentInquiryRequest>) -> Result<Response, ApiError> {
    validate_inquiry(&body.name, &body.email, &body.message)?;
    validate_text(&body.phone, 7, 30)?; validate_text(&body.position, 2, 120)?;
    if !body.portfolio_url.trim().is_empty() && !valid_url(&body.portfolio_url) { return Err(ApiError::invalid()); }
    if is_limited(&state, format!("employment:{}", state::normalize_email(&body.email)), 5, Duration::from_secs(3600)).await { return Err(ApiError::new(StatusCode::TOO_MANY_REQUESTS, "RATE_LIMITED")); }
    let inquiry = Inquiry { id: Uuid::new_v4().to_string(), kind: "EMPLOYMENT".into(), name: body.name.trim().into(), email: state::normalize_email(&body.email), phone: Some(body.phone.trim().into()), subject: body.position.trim().into(), payload: json!({ "position": body.position.trim(), "portfolioUrl": non_empty(&body.portfolio_url), "message": body.message.trim() }), created_at: state::now() };
    let id = inquiry.id.clone(); state.store.write().await.inquiries.push(inquiry);
    state.record_audit(None, "INQUIRY_CREATED", "INQUIRY", Some(id.clone())).await;
    Ok(created(json!({ "id": id })))
}

#[derive(Deserialize)]
struct LoginRequest { email: String, password: String }
async fn login(State(state): State<Arc<AppState>>, Json(body): Json<LoginRequest>) -> Result<Response, ApiError> {
    if !valid_email(&body.email) || body.password.is_empty() || body.password.len() > 256 { return Err(ApiError::invalid()); }
    let email = state::normalize_email(&body.email);
    let maximum = if state.config.is_production { 5 } else { 30 };
    if is_limited(&state, format!("login:{email}"), maximum, Duration::from_secs(900)).await { return Err(ApiError::new(StatusCode::TOO_MANY_REQUESTS, "RATE_LIMITED")); }
    let user = state.store.read().await.users.iter().find(|user| user.email == email).cloned();
    let Some(user) = user.filter(|user| user.is_active && state::verify_password(&user.password_hash, &body.password)) else {
        state.record_audit(None, "LOGIN_REJECTED", "AUTH", None).await;
        return Err(ApiError::new(StatusCode::UNAUTHORIZED, "INVALID_CREDENTIALS"));
    };
    let session_id = secure_token(); let csrf = secure_token();
    state.sessions.write().await.insert(session_id.clone(), Session { user_id: user.id.clone(), csrf: csrf.clone(), expires_at: SystemTime::now() + SESSION_TTL });
    state.record_audit(Some(user.id.clone()), "LOGIN_SUCCEEDED", "AUTH", None).await;
    let mut response = ok(json!({ "user": PublicUser::from(&user), "csrfToken": csrf }));
    set_session_cookies(&mut response, &state, &session_id, &csrf)?;
    Ok(response)
}
async fn me(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?;
    Ok(ok(json!({ "user": PublicUser::from(&user), "csrfToken": session.csrf })))
}
async fn logout(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?;
    if let Some(session_id) = cookie_value(&headers, "skja_session") { state.sessions.write().await.remove(session_id); }
    state.record_audit(Some(user.id), "LOGOUT", "AUTH", None).await;
    let mut response = no_content();
    response.headers_mut().append(header::SET_COOKIE, HeaderValue::from_static("skja_session=; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=0"));
    response.headers_mut().append(header::SET_COOKIE, HeaderValue::from_static("skja_csrf=; Path=/api/v1; SameSite=Lax; Max-Age=0"));
    Ok(response)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleCallbackQuery { code: Option<String>, state: Option<String>, error: Option<String> }
#[derive(Deserialize)]
struct GoogleTokenResponse { access_token: String }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleUserInfo { email: String, name: Option<String>, verified_email: Option<bool> }

async fn google_login(State(state): State<Arc<AppState>>) -> Result<Response, ApiError> {
    let (Some(client_id), Some(redirect_uri)) = (&state.config.google_client_id, &state.config.google_redirect_uri) else {
        return Ok(ok(json!({
            "enabled": false,
            "provider": "google",
            "message": "Google sign-in is not configured yet. Add provider credentials to enable it.",
            "redirectUrl": null
        })));
    };

    let oauth_state = secure_token();
    state.oauth_states.write().await.insert(oauth_state.clone(), OAuthState { created_at: SystemTime::now() });
    let redirect_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&access_type=online&prompt=select_account",
        urlencoding::encode(client_id),
        urlencoding::encode(redirect_uri),
        urlencoding::encode("openid email profile"),
        urlencoding::encode(&oauth_state),
    );
    Ok(ok(json!({ "enabled": true, "provider": "google", "message": "Redirecting to Google.", "redirectUrl": redirect_url })))
}

async fn google_callback(State(state): State<Arc<AppState>>, Query(query): Query<GoogleCallbackQuery>) -> Result<Response, ApiError> {
    let portal_redirect = state.config.google_portal_redirect_url.clone().unwrap_or_else(|| format!("{}/portal", state.config.origins.first().cloned().unwrap_or_else(|| "http://localhost:3000".into())));
    if query.error.is_some() { return redirect_with_status(&portal_redirect, "google", "cancelled"); }

    let Some(oauth_state) = query.state else { return redirect_with_status(&portal_redirect, "google", "invalid_state"); };
    let Some(code) = query.code else { return redirect_with_status(&portal_redirect, "google", "missing_code"); };

    let mut oauth_states = state.oauth_states.write().await;
    let Some(saved_state) = oauth_states.remove(&oauth_state) else { return redirect_with_status(&portal_redirect, "google", "invalid_state"); };
    if SystemTime::now().duration_since(saved_state.created_at).unwrap_or_default() > OAUTH_STATE_TTL {
        return redirect_with_status(&portal_redirect, "google", "expired_state");
    }
    drop(oauth_states);

    let (Some(client_id), Some(client_secret), Some(redirect_uri)) = (&state.config.google_client_id, &state.config.google_client_secret, &state.config.google_redirect_uri) else {
        return redirect_with_status(&portal_redirect, "google", "not_configured");
    };

    let client = reqwest::Client::new();
    let token_response = client.post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|_| ApiError::new(StatusCode::BAD_GATEWAY, "GOOGLE_AUTH_FAILED"))?;
    if !token_response.status().is_success() {
        return redirect_with_status(&portal_redirect, "google", "token_exchange_failed");
    }
    let token = token_response.json::<GoogleTokenResponse>().await.map_err(|_| ApiError::new(StatusCode::BAD_GATEWAY, "GOOGLE_AUTH_FAILED"))?;

    let userinfo_response = client.get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(&token.access_token)
        .send()
        .await
        .map_err(|_| ApiError::new(StatusCode::BAD_GATEWAY, "GOOGLE_AUTH_FAILED"))?;
    if !userinfo_response.status().is_success() {
        return redirect_with_status(&portal_redirect, "google", "userinfo_failed");
    }
    let profile = userinfo_response.json::<GoogleUserInfo>().await.map_err(|_| ApiError::new(StatusCode::BAD_GATEWAY, "GOOGLE_AUTH_FAILED"))?;
    if !profile.verified_email.unwrap_or(false) || !valid_email(&profile.email) {
        return redirect_with_status(&portal_redirect, "google", "email_not_verified");
    }

    let email = state::normalize_email(&profile.email);
    let mut store = state.store.write().await;
    let existing = store.users.iter().position(|user| user.email == email);
    let user = if let Some(index) = existing {
        let existing_user = store.users[index].clone();
        if !existing_user.is_active { return redirect_with_status(&portal_redirect, "google", "account_inactive"); }
        existing_user
    } else {
        let candidate_name = profile.name.unwrap_or_else(|| "Client User".into());
        let user = User {
            id: Uuid::new_v4().to_string(),
            name: non_empty(&candidate_name).unwrap_or_else(|| "Client User".into()),
            email,
            password_hash: state::hash_password(&secure_token()).map_err(|_| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"))?,
            roles: vec!["CLIENT".into()],
            is_active: true,
            created_at: state::now(),
        };
        store.users.push(user.clone());
        user
    };
    drop(store);

    let session_id = secure_token();
    let csrf = secure_token();
    state.sessions.write().await.insert(session_id.clone(), Session { user_id: user.id.clone(), csrf: csrf.clone(), expires_at: SystemTime::now() + SESSION_TTL });
    state.record_audit(Some(user.id.clone()), "LOGIN_SUCCEEDED_GOOGLE", "AUTH", None).await;
    let mut response = redirect_with_status(&portal_redirect, "google", "success")?;
    set_session_cookies(&mut response, &state, &session_id, &csrf)?;
    Ok(response)
}

async fn admin_overview(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &EMPLOYER_ROLES)?;
    let store = state.store.read().await; let employees = store.users.iter().filter(|candidate| state::has_role(candidate, &EMPLOYER_ROLES)).count();
    let mut tasks_by_status = HashMap::<String, usize>::new(); for task in &store.tasks { *tasks_by_status.entry(task.status.clone()).or_default() += 1; }
    Ok(ok(json!({ "inquiries": store.inquiries.len(), "employees": employees, "projects": store.projects.len(), "tasks": store.tasks.len(), "tasksByStatus": tasks_by_status })))
}
async fn admin_users(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &EMPLOYER_ROLES)?;
    Ok(ok(state.store.read().await.users.iter().map(PublicUser::from).collect::<Vec<_>>()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUserRequest { name: String, email: String, temporary_password: String, roles: Vec<String> }
async fn create_user(State(state): State<Arc<AppState>>, headers: HeaderMap, Json(body): Json<CreateUserRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &["ADMIN"])?;
    validate_text(&body.name, 2, 120)?;
    let allowed_roles = EMPLOYER_ROLES.iter().copied().chain(CLIENT_ROLES.iter().copied()).collect::<Vec<_>>();
    if !valid_email(&body.email) || body.temporary_password.len() < 12 || body.temporary_password.len() > 256 || body.roles.is_empty() || body.roles.iter().any(|role| !allowed_roles.contains(&role.as_str())) { return Err(ApiError::invalid()); }
    let email = state::normalize_email(&body.email); let mut store = state.store.write().await;
    if store.users.iter().any(|user| user.email == email) { return Err(ApiError::new(StatusCode::CONFLICT, "ACCOUNT_EXISTS")); }
    let user = User { id: Uuid::new_v4().to_string(), name: body.name.trim().into(), email, password_hash: state::hash_password(&body.temporary_password).map_err(|_| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"))?, roles: deduplicate(body.roles), is_active: true, created_at: state::now() };
    let public = PublicUser::from(&user); store.users.push(user); drop(store);
    state.record_audit(Some(actor.id), "EMPLOYEE_CREATED", "USER", Some(public.id.clone())).await; state.broadcast_event("USER_CREATED", &public); Ok(created(public))
}
async fn delete_user(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &["ADMIN"])?;
    if actor.id == id { return Err(ApiError::new(StatusCode::BAD_REQUEST, "CANNOT_REMOVE_SELF")); }
    let mut store = state.store.write().await; let Some(index) = store.users.iter().position(|user| user.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "USER_NOT_FOUND")); }; store.users.remove(index); drop(store);
    state.record_audit(Some(actor.id), "EMPLOYEE_REMOVED", "USER", Some(id.clone())).await; state.broadcast_event("USER_REMOVED", json!({ "id": id })); Ok(no_content())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PasswordRequest { temporary_password: String }
async fn reset_user_password(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(body): Json<PasswordRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &["ADMIN"])?;
    if body.temporary_password.len() < 12 || body.temporary_password.len() > 256 { return Err(ApiError::invalid()); }
    let mut store = state.store.write().await; let Some(user) = store.users.iter_mut().find(|user| user.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "USER_NOT_FOUND")); };
    user.password_hash = state::hash_password(&body.temporary_password).map_err(|_| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"))?; drop(store);
    state.record_audit(Some(actor.id), "EMPLOYEE_PASSWORD_RESET", "USER", Some(id.clone())).await; Ok(ok(json!({ "id": id })))
}
async fn admin_inquiries(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &["ADMIN"])?;
    let mut inquiries = state.store.read().await.inquiries.clone(); inquiries.reverse(); Ok(ok(inquiries))
}
async fn admin_projects(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> { let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &PROJECT_MANAGER_ROLES)?; Ok(ok(state.store.read().await.projects.clone())) }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectRequest { title: String, category: String, place: String, image: String, status: Option<String>, client_status: Option<String> }
fn validate_project(input: &ProjectRequest) -> Result<(), ApiError> {
    validate_text(&input.title, 2, 160)?; validate_text(&input.place, 2, 160)?;
    if !["Residential", "Workplace", "Hospitality"].contains(&input.category.as_str()) || !valid_url(&input.image) { return Err(ApiError::invalid()); }
    if let Some(status) = &input.status { if !["Published", "Upcoming", "InProgress", "Past"].contains(&status.as_str()) { return Err(ApiError::invalid()); } }
    if let Some(status) = &input.client_status { if !["None", "ClientInquired", "ClientDeclined"].contains(&status.as_str()) { return Err(ApiError::invalid()); } }
    Ok(())
}
async fn create_project(State(state): State<Arc<AppState>>, headers: HeaderMap, Json(body): Json<ProjectRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &PROJECT_MANAGER_ROLES)?; validate_project(&body)?;
    let project = Project { id: Uuid::new_v4().to_string(), title: body.title.trim().into(), category: body.category, place: body.place.trim().into(), image: body.image.trim().into(), status: body.status.unwrap_or_else(|| "Published".into()), client_status: body.client_status.unwrap_or_else(|| "None".into()) };
    let id = project.id.clone(); state.store.write().await.projects.push(project.clone()); state.record_audit(Some(actor.id), "PROJECT_CREATED", "PROJECT", Some(id)).await; state.broadcast_event("PROJECT_CREATED", &project); Ok(created(project))
}
async fn update_project(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(body): Json<ProjectRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &PROJECT_MANAGER_ROLES)?; validate_project(&body)?;
    let mut store = state.store.write().await; let Some(project) = store.projects.iter_mut().find(|project| project.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "PROJECT_NOT_FOUND")); };
    project.title = body.title.trim().into(); project.category = body.category; project.place = body.place.trim().into(); project.image = body.image.trim().into(); project.status = body.status.unwrap_or_else(|| project.status.clone()); project.client_status = body.client_status.unwrap_or_else(|| project.client_status.clone()); let result = project.clone(); drop(store);
    state.record_audit(Some(actor.id), "PROJECT_UPDATED", "PROJECT", Some(id)).await; state.broadcast_event("PROJECT_UPDATED", &result); Ok(ok(result))
}
async fn delete_project(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &PROJECT_MANAGER_ROLES)?;
    let mut store = state.store.write().await; let Some(index) = store.projects.iter().position(|project| project.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "PROJECT_NOT_FOUND")); }; store.projects.remove(index); drop(store);
    state.record_audit(Some(actor.id), "PROJECT_DELETED", "PROJECT", Some(id.clone())).await; state.broadcast_event("PROJECT_DELETED", json!({ "id": id })); Ok(no_content())
}

async fn admin_tasks(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> { let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &PROJECT_MANAGER_ROLES)?; Ok(ok(state.store.read().await.tasks.clone())) }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskRequest { title: Option<String>, description: Option<String>, project_id: Option<String>, assigned_to: Option<String>, status: Option<String>, progress: Option<u8> }
fn validate_task(input: &TaskRequest, requires_title: bool) -> Result<(), ApiError> {
    if requires_title && input.title.is_none() { return Err(ApiError::invalid()); }
    if let Some(title) = &input.title { validate_text(title, 2, 160)?; }
    if let Some(description) = &input.description { if description.len() > 2000 { return Err(ApiError::invalid()); } }
    if let Some(status) = &input.status { if !["NotStarted", "InProgress", "Blocked", "Completed"].contains(&status.as_str()) { return Err(ApiError::invalid()); } }
    Ok(())
}
async fn create_task(State(state): State<Arc<AppState>>, headers: HeaderMap, Json(body): Json<TaskRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &PROJECT_MANAGER_ROLES)?; validate_task(&body, true)?;
    let task = Task { id: Uuid::new_v4().to_string(), title: body.title.unwrap_or_default().trim().into(), description: body.description.unwrap_or_default().trim().into(), project_id: body.project_id.and_then(|value| non_empty(&value)), assigned_to: body.assigned_to.and_then(|value| non_empty(&value)), status: body.status.unwrap_or_else(|| "NotStarted".into()), progress: body.progress.unwrap_or(0), created_at: state::now(), updated_at: state::now() };
    let id = task.id.clone(); state.store.write().await.tasks.push(task.clone()); state.record_audit(Some(actor.id), "TASK_CREATED", "TASK", Some(id)).await; state.broadcast_event("TASK_CREATED", &task); Ok(created(task))
}
async fn update_task(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(body): Json<TaskRequest>) -> Result<Response, ApiError> {
    let (actor, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&actor, &PROJECT_MANAGER_ROLES)?; validate_task(&body, false)?;
    let mut store = state.store.write().await; let Some(task) = store.tasks.iter_mut().find(|task| task.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "TASK_NOT_FOUND")); };
    if let Some(value) = body.title { task.title = value.trim().into(); } if let Some(value) = body.description { task.description = value.trim().into(); } if body.project_id.is_some() { task.project_id = body.project_id.and_then(|value| non_empty(&value)); } if body.assigned_to.is_some() { task.assigned_to = body.assigned_to.and_then(|value| non_empty(&value)); } if let Some(value) = body.status { task.status = value; } if let Some(value) = body.progress { task.progress = value; } task.updated_at = state::now(); let result = task.clone(); drop(store);
    state.record_audit(Some(actor.id), "TASK_UPDATED", "TASK", Some(id)).await; state.broadcast_event("TASK_UPDATED", &result); Ok(ok(result))
}
async fn mark_attendance(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    let attendance = Attendance { id: Uuid::new_v4().to_string(), user_id: user.id.clone(), name: user.name.clone(), timestamp: state::now() }; let id = attendance.id.clone(); state.store.write().await.attendance.push(attendance.clone()); state.record_audit(Some(user.id), "ATTENDANCE_MARKED", "ATTENDANCE", Some(id)).await; state.broadcast_event("ATTENDANCE_MARKED", &attendance); Ok(created(attendance))
}
async fn admin_attendance(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> { let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &PROJECT_MANAGER_ROLES)?; Ok(ok(state.store.read().await.attendance.clone())) }

async fn list_files(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> { let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &PROJECT_MANAGER_ROLES)?; Ok(ok(state.store.read().await.files.iter().map(FileSummary::from).collect::<Vec<_>>())) }
async fn admin_media(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(scope): Path<String>) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?;
    require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    let scope = normalize_media_scope(&scope)?;
    let files = state.store.read().await.files.iter().filter(|file| file.scope.as_deref() == Some(scope)).map(FileSummary::from).collect::<Vec<_>>();
    Ok(ok(files))
}
async fn upload_file(State(state): State<Arc<AppState>>, headers: HeaderMap, mut multipart: Multipart) -> Result<Response, ApiError> {
    upload_file_impl(state, headers, None, multipart).await
}
async fn upload_media(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(scope): Path<String>, multipart: Multipart) -> Result<Response, ApiError> {
    let scope = normalize_media_scope(&scope)?.to_owned();
    upload_file_impl(state, headers, Some(scope), multipart).await
}
async fn upload_file_impl(state: Arc<AppState>, headers: HeaderMap, scope: Option<String>, mut multipart: Multipart) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?;
    csrf_protect(&headers, &session)?;
    require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    while let Some(field) = multipart.next_field().await.map_err(|_| ApiError::invalid())? {
        if field.name() != Some("file") { continue; }
        let filename = field.file_name().unwrap_or("attachment").to_string();
        if filename.is_empty() || filename.len() > 160 || filename.contains(['/', '\\']) { return Err(ApiError::invalid()); }
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();
        let bytes = field.bytes().await.map_err(|_| ApiError::invalid())?;
        if bytes.is_empty() || bytes.len() > MAX_FILE_SIZE { return Err(ApiError::new(StatusCode::PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE")); }
        let file_id = Uuid::new_v4().to_string();
        let public_url = format!("{}/public/files/{}", state.config.public_api_base_url.trim_end_matches('/'), file_id);
        let file = FileRecord { id: file_id, filename, content_type, bytes: bytes.to_vec(), uploader_id: user.id.clone(), uploader_email: user.email.clone(), created_at: state::now(), scope: scope.clone(), public_url };
        let summary = FileSummary::from(&file); state.store.write().await.files.push(file); state.record_audit(Some(user.id), "FILE_UPLOADED", "FILE", Some(summary.id.clone())).await; state.broadcast_event("FILE_UPLOADED", &summary); return Ok(created(summary));
    }
    Err(ApiError::new(StatusCode::BAD_REQUEST, "FILE_REQUIRED"))
}
async fn download_file(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    let file = state.store.read().await.files.iter().find(|file| file.id == id).cloned().ok_or(ApiError::new(StatusCode::NOT_FOUND, "FILE_NOT_FOUND"))?;
    let mut response = Body::from(file.bytes).into_response(); response.headers_mut().insert(header::CONTENT_TYPE, HeaderValue::from_str(&file.content_type).unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")));
    let safe_name = file.filename.replace('"', "_"); response.headers_mut().insert(header::CONTENT_DISPOSITION, HeaderValue::from_str(&format!("attachment; filename=\"{safe_name}\"")).unwrap_or_else(|_| HeaderValue::from_static("attachment")));
    Ok(response)
}
async fn delete_file(State(state): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?;
    csrf_protect(&headers, &session)?;
    require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    let mut store = state.store.write().await;
    let Some(index) = store.files.iter().position(|file| file.id == id) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "FILE_NOT_FOUND")); };
    store.files.remove(index);
    drop(store);
    state.record_audit(Some(user.id), "FILE_DELETED", "FILE", Some(id.clone())).await;
    state.broadcast_event("FILE_DELETED", json!({ "id": id }));
    Ok(no_content())
}
async fn delete_media(State(state): State<Arc<AppState>>, headers: HeaderMap, Path((scope, id)): Path<(String, String)>) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?;
    csrf_protect(&headers, &session)?;
    require_roles(&user, &PROJECT_MANAGER_ROLES)?;
    let normalized_scope = normalize_media_scope(&scope)?;
    let mut store = state.store.write().await;
    let Some(index) = store.files.iter().position(|file| file.id == id && file.scope.as_deref() == Some(normalized_scope)) else { return Err(ApiError::new(StatusCode::NOT_FOUND, "FILE_NOT_FOUND")); };
    store.files.remove(index);
    drop(store);
    state.record_audit(Some(user.id), "MEDIA_DELETED", "FILE", Some(id.clone())).await;
    state.broadcast_event("MEDIA_DELETED", json!({ "id": id, "scope": normalized_scope }));
    Ok(no_content())
}

async fn client_projects(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &CLIENT_ROLES)?;
    Ok(ok(state.store.read().await.projects.iter().filter(|project| project.status != "Upcoming" || project.client_status != "None").cloned().collect::<Vec<_>>()))
}
async fn client_team(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &CLIENT_ROLES)?;
    Ok(ok(state.store.read().await.users.iter().filter(|candidate| state::has_role(candidate, &EMPLOYER_ROLES)).map(PublicUser::from).collect::<Vec<_>>()))
}
async fn client_overview(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?; require_roles(&user, &CLIENT_ROLES)?;
    let store = state.store.read().await; let projects = store.projects.iter().filter(|project| project.status != "Upcoming" || project.client_status != "None").count(); let team = store.users.iter().filter(|candidate| state::has_role(candidate, &EMPLOYER_ROLES)).count(); let messages = store.messages.iter().filter(|message| message.is_global || message.sender_id == user.id || message.recipient_ids.contains(&user.id)).count();
    Ok(ok(json!({ "projects": projects, "team": team, "messages": messages })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageQuery { project_id: Option<String> }
async fn list_messages(State(state): State<Arc<AppState>>, headers: HeaderMap, Query(query): Query<MessageQuery>) -> Result<Response, ApiError> {
    let (user, _) = authenticate(&state, &headers).await?;
    let messages = state.store.read().await.messages.iter().filter(|message| message.is_global || message.sender_id == user.id || message.recipient_ids.contains(&user.id)).filter(|message| query.project_id.as_ref().is_none_or(|project_id| message.project_id.as_ref() == Some(project_id))).cloned().collect::<Vec<_>>();
    Ok(ok(messages))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageRequest { content: String, recipient_ids: Option<Vec<String>>, project_id: Option<String>, is_global: Option<bool> }
async fn create_message(State(state): State<Arc<AppState>>, headers: HeaderMap, Json(body): Json<MessageRequest>) -> Result<Response, ApiError> {
    let (user, session) = authenticate(&state, &headers).await?; csrf_protect(&headers, &session)?; validate_text(&body.content, 1, 1000)?;
    let recipient_ids = body.recipient_ids.unwrap_or_default(); let message = Message { id: Uuid::new_v4().to_string(), sender_id: user.id.clone(), sender_name: user.name.clone(), content: body.content.trim().into(), recipient_ids: recipient_ids.clone(), project_id: body.project_id.and_then(|value| non_empty(&value)), is_global: body.is_global.unwrap_or(recipient_ids.is_empty()), created_at: state::now() }; let id = message.id.clone();
    state.store.write().await.messages.push(message.clone()); state.record_audit(Some(user.id), "MESSAGE_SENT", "MESSAGE", Some(id)).await; state.broadcast_event("MESSAGE", &message); Ok(created(message))
}

async fn not_implemented() -> Result<Response, ApiError> { Err(ApiError::new(StatusCode::NOT_IMPLEMENTED, "FEATURE_NOT_CONFIGURED")) }
async fn authenticate(state: &Arc<AppState>, headers: &HeaderMap) -> Result<(User, Session), ApiError> {
    let Some(session_id) = cookie_value(headers, "skja_session") else { return Err(ApiError::unauthenticated()); };
    let session = state.sessions.read().await.get(session_id).cloned().filter(|session| session.expires_at > SystemTime::now()).ok_or_else(ApiError::unauthenticated)?;
    let user = state.store.read().await.users.iter().find(|user| user.id == session.user_id && user.is_active).cloned().ok_or_else(ApiError::unauthenticated)?;
    Ok((user, session))
}
fn require_roles(user: &User, roles: &[&str]) -> Result<(), ApiError> { if state::has_role(user, roles) { Ok(()) } else { Err(ApiError::forbidden()) } }
fn csrf_protect(headers: &HeaderMap, session: &Session) -> Result<(), ApiError> {
    let cookie = cookie_value(headers, "skja_csrf").ok_or_else(|| ApiError::new(StatusCode::FORBIDDEN, "CSRF_REJECTED"))?;
    let value = headers.get("x-csrf-token").and_then(|value| value.to_str().ok()).ok_or_else(|| ApiError::new(StatusCode::FORBIDDEN, "CSRF_REJECTED"))?;
    if constant_time_equal(cookie.as_bytes(), value.as_bytes()) && constant_time_equal(cookie.as_bytes(), session.csrf.as_bytes()) { Ok(()) } else { Err(ApiError::new(StatusCode::FORBIDDEN, "CSRF_REJECTED")) }
}
fn cookie_value<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> { headers.get(header::COOKIE)?.to_str().ok()?.split(';').find_map(|part| { let (key, value) = part.trim().split_once('=')?; (key == name).then_some(value) }) }
fn set_session_cookies(response: &mut Response, state: &AppState, session: &str, csrf: &str) -> Result<(), ApiError> {
    let secure = if state.config.is_production { "; Secure" } else { "" };
    let session_cookie = format!("skja_session={session}; Path=/api/v1; HttpOnly; SameSite=Lax; Max-Age=900{secure}"); let csrf_cookie = format!("skja_csrf={csrf}; Path=/api/v1; SameSite=Lax; Max-Age=900{secure}");
    response.headers_mut().append(header::SET_COOKIE, HeaderValue::from_str(&session_cookie).map_err(|_| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"))?);
    response.headers_mut().append(header::SET_COOKIE, HeaderValue::from_str(&csrf_cookie).map_err(|_| ApiError::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"))?);
    Ok(())
}
async fn is_limited(state: &AppState, key: String, maximum: u32, window: Duration) -> bool {
    let mut limits = state.limits.write().await; let now = SystemTime::now(); let entry = limits.entry(key).or_insert(RateWindow { opened_at: now, count: 0 });
    if now.duration_since(entry.opened_at).unwrap_or_default() >= window { entry.opened_at = now; entry.count = 0; } entry.count += 1; entry.count > maximum
}
fn validate_inquiry(name: &str, email: &str, message: &str) -> Result<(), ApiError> { validate_text(name, 2, 120)?; if !valid_email(email) { return Err(ApiError::invalid()); } validate_text(message, 2, 2000) }
fn validate_text(value: &str, minimum: usize, maximum: usize) -> Result<(), ApiError> { let length = value.trim().chars().count(); if length < minimum || length > maximum { Err(ApiError::invalid()) } else { Ok(()) } }
fn valid_email(value: &str) -> bool { let value = value.trim(); value.len() <= 254 && value.contains('@') && value.split('@').nth(1).is_some_and(|domain| domain.contains('.')) }
fn valid_url(value: &str) -> bool { let value = value.trim(); value.starts_with("https://") || value.starts_with("http://") }
fn normalize_media_scope(scope: &str) -> Result<&str, ApiError> {
    match scope {
        "projects" | "services" => Ok(scope),
        _ => Err(ApiError::invalid()),
    }
}
fn media_for_scope(files: &[FileRecord], scope: &str) -> Vec<String> {
    files.iter().filter(|file| file.scope.as_deref() == Some(scope)).map(|file| file.public_url.clone()).collect()
}
trait HasImage {
    fn set_image(&mut self, value: String);
}
impl HasImage for Project {
    fn set_image(&mut self, value: String) { self.image = value; }
}
impl HasImage for Service {
    fn set_image(&mut self, value: String) { self.image = value; }
}
fn with_media_images<T: HasImage>(mut items: Vec<T>, media: &[String]) -> Vec<T> {
    for (index, item) in items.iter_mut().enumerate() {
        if let Some(image) = media.get(index) {
            item.set_image(image.clone());
        }
    }
    items
}
fn redirect_with_status(base: &str, key: &str, value: &str) -> Result<Response, ApiError> {
    let separator = if base.contains('?') { '&' } else { '?' };
    let location = format!("{base}{separator}{key}={}", urlencoding::encode(value));
    let mut response = StatusCode::FOUND.into_response();
    response.headers_mut().insert(header::LOCATION, HeaderValue::from_str(&location).map_err(|_| ApiError::invalid())?);
    Ok(response)
}
fn non_empty(value: &str) -> Option<String> { let value = value.trim(); (!value.is_empty()).then(|| value.to_owned()) }
fn deduplicate(values: Vec<String>) -> Vec<String> { let mut result = Vec::new(); for value in values { if !result.contains(&value) { result.push(value); } } result }
fn secure_token() -> String { let mut bytes = [0_u8; 32]; rand::rng().fill(&mut bytes); base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes) }
fn constant_time_equal(left: &[u8], right: &[u8]) -> bool { if left.len() != right.len() { return false; } let mut difference = 0_u8; for (a, b) in left.iter().zip(right) { difference |= a ^ b; } difference == 0 }
