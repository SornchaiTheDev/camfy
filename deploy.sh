#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="camfy"
SERVICE_USER="${SUDO_USER:-$(whoami)}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[camfy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
die()  { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# Guard: don't run as root — sudo strips PATH and loses bun
if [[ $EUID -eq 0 ]]; then
  die "Run as normal user, not root. Script uses sudo internally for systemd.\n  Usage: ./deploy.sh"
fi

# ── 1. Prerequisites ──────────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v bun    >/dev/null 2>&1 || die "bun not found — install: curl -fsSL https://bun.sh/install | bash"
command -v ffmpeg >/dev/null 2>&1 || die "ffmpeg not found — install: sudo apt install ffmpeg"
command -v ffprobe >/dev/null 2>&1 || die "ffprobe not found — install: sudo apt install ffmpeg"
log "bun $(bun --version) | ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"

# ── 2. .env ───────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
if [[ ! -f .env ]]; then
  cp .env.example .env
  warn ".env created from .env.example — edit values before use"
fi

# shellcheck disable=SC1091
set -a; source .env; set +a
STORAGE_PATH="${STORAGE_PATH:-./recordings}"
DB_PATH="${DB_PATH:-./data/camfy.db}"

# Resolve relative paths from project root
[[ "$STORAGE_PATH" != /* ]] && STORAGE_PATH="$SCRIPT_DIR/$STORAGE_PATH"
[[ "$DB_PATH"      != /* ]] && DB_PATH="$SCRIPT_DIR/$DB_PATH"

# ── 3. Data directories ───────────────────────────────────────────────────────
log "Creating data directories..."
mkdir -p "$(dirname "$DB_PATH")" "$STORAGE_PATH"

# ── 4. Dependencies ───────────────────────────────────────────────────────────
log "Installing dependencies..."
bun install --frozen-lockfile

# ── 5. Frontend build ─────────────────────────────────────────────────────────
log "Building frontend..."
cd frontend && bun run build && cd ..
log "Frontend built → frontend/dist"

# ── 6. Systemd (optional) ─────────────────────────────────────────────────────
if command -v systemctl >/dev/null 2>&1 && [[ "${1:-}" != "--no-systemd" ]]; then
  log "Setting up systemd service: ${SERVICE_NAME}"

  BUN_BIN="$(command -v bun)"

  sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Camfy NVR
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${SCRIPT_DIR}
EnvironmentFile=${SCRIPT_DIR}/.env
ExecStart=${BUN_BIN} run backend/src/index.ts
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE_NAME}"
  sudo systemctl restart "${SERVICE_NAME}"

  log ""
  log "Deployed. Service: ${SERVICE_NAME}"
  log "  Status:  sudo systemctl status ${SERVICE_NAME}"
  log "  Logs:    journalctl -u ${SERVICE_NAME} -f"
  log "  Stop:    sudo systemctl stop ${SERVICE_NAME}"
  log "  Restart: sudo systemctl restart ${SERVICE_NAME}"
  log ""
  log "App running on port ${PORT:-3001}"

else
  # No systemd — run in foreground (use screen/tmux/nohup yourself)
  if [[ "${1:-}" == "--no-systemd" ]]; then
    log "Skipping systemd (--no-systemd). Starting in foreground..."
  else
    warn "systemctl not found — running in foreground. Use screen/tmux/nohup for persistence."
  fi
  log "App running on port ${PORT:-3001} (Ctrl+C to stop)"
  exec bun run backend/src/index.ts
fi
