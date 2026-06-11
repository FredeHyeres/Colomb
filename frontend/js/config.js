// ===== CONFIGURATION API =====
// Mode local (Docker Desktop) : le frontend est servi sur :8080 (nginx)
// et l'API FastAPI sur :8001 (voir docker-compose.yml).
// Mode déploiement (Railway, etc.) : frontend et API sont servis depuis
// la même origine, donc on appelle l'API en relatif.
const API_ROOT = (window.location.port === '8080')
  ? `${window.location.protocol}//${window.location.hostname}:8001`
  : window.location.origin;

const API_URL = `${API_ROOT}/api`;
