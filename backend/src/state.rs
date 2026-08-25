use std::{collections::HashMap, sync::Arc};
use argon2::{
    password_hash::SaltString,
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use uuid::Uuid;
use crate::config::Config;

pub const EMPLOYER_ROLES: [&str; 7] = ["ADMIN", "PRINCIPAL", "PROJECT_MANAGER", "ARCHITECT", "DESIGNER", "FINANCE", "HR"];
pub const CLIENT_ROLES: [&str; 1] = ["CLIENT"];
pub const PROJECT_MANAGER_ROLES: [&str; 3] = ["ADMIN", "PRINCIPAL", "PROJECT_MANAGER"];

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub store: Arc<RwLock<Store>>,
    pub sessions: Arc<RwLock<HashMap<String, Session>>>,
    pub oauth_states: Arc<RwLock<HashMap<String, OAuthState>>>,
    pub limits: Arc<RwLock<HashMap<String, RateWindow>>>,
    pub events: tokio::sync::broadcast::Sender<String>,
}

#[derive(Default)]
pub struct Store {
    pub services: Vec<Service>,
    pub projects: Vec<Project>,
    pub users: Vec<User>,
    pub inquiries: Vec<Inquiry>,
    pub tasks: Vec<Task>,
    pub attendance: Vec<Attendance>,
    pub messages: Vec<Message>,
    pub files: Vec<FileRecord>,
    pub audit_events: Vec<AuditEvent>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Service { pub id: String, pub number: String, pub title: String, pub summary: String, pub details: Vec<String>, pub image: String }

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project { pub id: String, pub title: String, pub category: String, pub place: String, pub image: String, pub status: String, pub client_status: String }

#[derive(Clone)]
pub struct User { pub id: String, pub name: String, pub email: String, pub password_hash: String, pub roles: Vec<String>, pub is_active: bool, pub created_at: String }

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser { pub id: String, pub name: String, pub email: String, pub roles: Vec<String>, pub is_active: bool }

impl From<&User> for PublicUser {
    fn from(user: &User) -> Self { Self { id: user.id.clone(), name: user.name.clone(), email: user.email.clone(), roles: user.roles.clone(), is_active: user.is_active } }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inquiry { pub id: String, pub kind: String, pub name: String, pub email: String, pub phone: Option<String>, pub subject: String, pub payload: serde_json::Value, pub created_at: String }

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task { pub id: String, pub title: String, pub description: String, pub project_id: Option<String>, pub assigned_to: Option<String>, pub status: String, pub progress: u8, pub created_at: String, pub updated_at: String }

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Attendance { pub id: String, pub user_id: String, pub name: String, pub timestamp: String }

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message { pub id: String, pub sender_id: String, pub sender_name: String, pub content: String, pub recipient_ids: Vec<String>, pub project_id: Option<String>, pub is_global: bool, pub created_at: String }

#[derive(Clone)]
pub struct FileRecord { pub id: String, pub filename: String, pub content_type: String, pub bytes: Vec<u8>, pub uploader_id: String, pub uploader_email: String, pub created_at: String, pub scope: Option<String>, pub public_url: String }

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSummary { pub id: String, pub filename: String, pub content_type: String, pub length: usize, pub metadata: FileMetadata, pub upload_date: String, pub scope: Option<String>, pub public_url: String }

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata { pub uploader_id: String, pub uploader_email: String, pub uploaded_at: String }

impl From<&FileRecord> for FileSummary {
    fn from(file: &FileRecord) -> Self { Self { id: file.id.clone(), filename: file.filename.clone(), content_type: file.content_type.clone(), length: file.bytes.len(), metadata: FileMetadata { uploader_id: file.uploader_id.clone(), uploader_email: file.uploader_email.clone(), uploaded_at: file.created_at.clone() }, upload_date: file.created_at.clone(), scope: file.scope.clone(), public_url: file.public_url.clone() } }
}

#[derive(Clone)]
pub struct AuditEvent { pub id: String, pub actor_id: Option<String>, pub action: String, pub entity_type: String, pub entity_id: Option<String>, pub created_at: String }

#[derive(Clone)]
pub struct Session { pub user_id: String, pub csrf: String, pub expires_at: std::time::SystemTime }

#[derive(Clone)]
pub struct RateWindow { pub opened_at: std::time::SystemTime, pub count: u32 }

#[derive(Clone)]
pub struct OAuthState { pub created_at: std::time::SystemTime }

impl AppState {
    pub async fn new(config: Config) -> Self {
        let (events, _) = tokio::sync::broadcast::channel(64);
        let state = Self { config, store: Arc::new(RwLock::new(Store { services: seed_services(), projects: seed_projects(), ..Default::default() })), sessions: Arc::new(RwLock::new(HashMap::new())), oauth_states: Arc::new(RwLock::new(HashMap::new())), limits: Arc::new(RwLock::new(HashMap::new())), events };
        state.seed_initial_admin().await;
        state
    }

    async fn seed_initial_admin(&self) {
        let (Some(email), Some(password)) = (&self.config.initial_admin_email, &self.config.initial_admin_password) else { return; };
        let mut store = self.store.write().await;
        if store.users.iter().any(|user| user.email == email.trim().to_lowercase()) { return; }
        store.users.push(User { id: Uuid::new_v4().to_string(), name: "Initial Administrator".into(), email: email.trim().to_lowercase(), password_hash: hash_password(password).expect("initial administrator password could not be hashed"), roles: vec!["ADMIN".into()], is_active: true, created_at: now() });
    }

    pub async fn record_audit(&self, actor_id: Option<String>, action: &str, entity_type: &str, entity_id: Option<String>) {
        self.store.write().await.audit_events.push(AuditEvent { id: Uuid::new_v4().to_string(), actor_id, action: action.into(), entity_type: entity_type.into(), entity_id, created_at: now() });
    }

    pub fn broadcast_event<T: Serialize>(&self, event_type: &str, payload: T) {
        let _ = self.events.send(serde_json::json!({ "type": event_type, "payload": payload }).to_string());
    }
}

pub fn now() -> String { time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap_or_default() }
pub fn normalize_email(value: &str) -> String { value.trim().to_lowercase() }
pub fn has_role(user: &User, roles: &[&str]) -> bool { user.roles.iter().any(|role| roles.contains(&role.as_str())) }
pub fn hash_password(value: &str) -> Result<String, argon2::password_hash::Error> { let salt = SaltString::generate(&mut OsRng); Ok(Argon2::default().hash_password(value.as_bytes(), &salt)?.to_string()) }
pub fn verify_password(hash: &str, password: &str) -> bool { PasswordHash::new(hash).ok().and_then(|parsed| Argon2::default().verify_password(password.as_bytes(), &parsed).ok()).is_some() }

fn seed_services() -> Vec<Service> {
    vec![
        Service { id: "architecture".into(), number: "01".into(), title: "Architecture".into(), summary: "Buildings shaped by site, climate, and the lives that unfold inside them.".into(), details: vec!["Residential architecture".into(), "Commercial environments".into(), "Hospitality and mixed-use".into()], image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85".into() },
        Service { id: "interior-design".into(), number: "02".into(), title: "Interior Design".into(), summary: "Composed interiors where material, light, proportion, and comfort are held in balance.".into(), details: vec!["Spatial planning".into(), "Material and furniture selection".into(), "Custom detailing".into()], image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85".into() },
        Service { id: "project-delivery".into(), number: "03".into(), title: "Project Delivery".into(), summary: "A clear route from early possibilities to precise, buildable outcomes.".into(), details: vec!["Design coordination".into(), "Tender documentation".into(), "Site support".into()], image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=85".into() },
    ]
}

fn project(id: &str, title: &str, category: &str, place: &str, image: &str, status: &str, client_status: &str) -> Project { Project { id: id.into(), title: title.into(), category: category.into(), place: place.into(), image: image.into(), status: status.into(), client_status: client_status.into() } }
fn seed_projects() -> Vec<Project> {
    vec![
        project("courtyard-house", "Courtyard House", "Residential", "India", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85", "InProgress", "None"),
        project("the-light-well", "The Light Well", "Workplace", "India", "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85", "Published", "None"),
        project("quiet-terrain", "Quiet Terrain", "Hospitality", "India", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85", "Upcoming", "None"),
        project("long-house", "Long House", "Residential", "India", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85", "Past", "ClientDeclined"),
        project("civic-threshold", "Civic Threshold", "Workplace", "India", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=85", "Published", "ClientInquired"),
        project("monsoon-court", "Monsoon Court", "Hospitality", "India", "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85", "Published", "None"),
    ]
}
