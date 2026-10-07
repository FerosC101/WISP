"""Local SQLite store.

* Baselines are encrypted at rest (Fernet, key kept in a local file).
* Measurements are HMAC-signed when produced by the sensing service; anything
  without a valid signature for the active session is rejected.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from cryptography.fernet import Fernet

from . import config
from .schemas import AuditEvent, Baseline, CaseState, CareDisposition, FunctionalAssessment, UserProfile

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
  case_json TEXT NOT NULL, disposition_json TEXT, previous_session_id TEXT,
  agent TEXT NOT NULL DEFAULT 'local_agent', agent_state TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, ts TEXT NOT NULL,
  role TEXT NOT NULL, text TEXT NOT NULL, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS measurements (
  measurement_id TEXT PRIMARY KEY, session_id TEXT, user_id TEXT, created_at TEXT NOT NULL,
  json TEXT NOT NULL, debug_json TEXT, purpose TEXT NOT NULL DEFAULT 'assessment'
);
CREATE TABLE IF NOT EXISTS grants (
  grant_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS baselines (user_id TEXT PRIMARY KEY, enc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, session_id TEXT NOT NULL, actor TEXT NOT NULL,
  event TEXT NOT NULL, tool TEXT, result TEXT, data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS rechecks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, user_id TEXT NOT NULL,
  due_at TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled'
);
CREATE TABLE IF NOT EXISTS shares (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sensor_validation (
  id INTEGER PRIMARY KEY AUTOINCREMENT, measurement_id TEXT NOT NULL, ground_truth_seconds REAL NOT NULL,
  method TEXT NOT NULL, participant TEXT, notes TEXT, created_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_key(path: Path) -> bytes:
    if path.exists():
        return path.read_bytes().strip()
    path.parent.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    path.write_bytes(key)
    path.chmod(0o600)
    return key


class Store:
    def __init__(self, db_path: Path | None = None, key_path: Path | None = None):
        self.db_path = db_path or config.DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        key = _load_key(key_path or config.KEY_PATH)
        self._fernet = Fernet(key)
        self._hmac_key = hashlib.sha256(b"wisp-measurement-signing" + key).digest()

    def _exec(self, sql: str, args: tuple = ()) -> sqlite3.Cursor:
        with self._lock:
            cur = self.conn.execute(sql, args)
            self.conn.commit()
            return cur

    def _one(self, sql: str, args: tuple = ()) -> sqlite3.Row | None:
        with self._lock:
            return self.conn.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self.conn.execute(sql, args).fetchall()

    # ------------------------------------------------------------------ profiles
    def put_profile(self, p: UserProfile) -> None:
        self._exec("INSERT OR REPLACE INTO profiles VALUES (?, ?)", (p.user_id, p.model_dump_json()))

    def get_profile(self, user_id: str) -> UserProfile | None:
        r = self._one("SELECT json FROM profiles WHERE user_id=?", (user_id,))
        return UserProfile.model_validate_json(r["json"]) if r else None

    def list_profiles(self) -> list[UserProfile]:
        return [UserProfile.model_validate_json(r["json"]) for r in self._all("SELECT json FROM profiles ORDER BY user_id")]

    # ------------------------------------------------------------------ sessions
    def create_session(self, user_id: str, *, agent: str, previous_session_id: str | None = None) -> CaseState:
        sid = "s_" + uuid.uuid4().hex[:12]
        case = CaseState(session_id=sid, user_id=user_id, previous_session_id=previous_session_id)
        self._exec(
            "INSERT INTO sessions (session_id, user_id, created_at, case_json, previous_session_id, agent) VALUES (?,?,?,?,?,?)",
            (sid, user_id, case.created_at.isoformat(), case.model_dump_json(), previous_session_id, agent),
        )
        return case

    def get_case(self, session_id: str) -> CaseState | None:
        r = self._one("SELECT case_json FROM sessions WHERE session_id=?", (session_id,))
        return CaseState.model_validate_json(r["case_json"]) if r else None

    def save_case(self, case: CaseState) -> None:
        self._exec("UPDATE sessions SET case_json=? WHERE session_id=?", (case.model_dump_json(), case.session_id))

    def session_meta(self, session_id: str) -> dict | None:
        r = self._one("SELECT session_id, user_id, created_at, previous_session_id, agent, agent_state FROM sessions WHERE session_id=?", (session_id,))
        if not r:
            return None
        d = dict(r)
        d["agent_state"] = json.loads(d["agent_state"])
        return d

    def set_agent_state(self, session_id: str, state: dict) -> None:
        self._exec("UPDATE sessions SET agent_state=? WHERE session_id=?", (json.dumps(state), session_id))

    def set_agent(self, session_id: str, agent: str) -> None:
        self._exec("UPDATE sessions SET agent=? WHERE session_id=?", (agent, session_id))

    def save_disposition(self, session_id: str, d: CareDisposition) -> None:
        self._exec("UPDATE sessions SET disposition_json=? WHERE session_id=?", (d.model_dump_json(), session_id))

    def get_disposition(self, session_id: str) -> CareDisposition | None:
        r = self._one("SELECT disposition_json FROM sessions WHERE session_id=?", (session_id,))
        return CareDisposition.model_validate_json(r["disposition_json"]) if r and r["disposition_json"] else None

    def list_sessions(self, user_id: str | None = None, limit: int = 50) -> list[dict]:
        sql = "SELECT session_id, user_id, created_at, previous_session_id, agent, disposition_json, case_json FROM sessions"
        args: tuple = ()
        if user_id:
            sql += " WHERE user_id=?"
            args = (user_id,)
        rows = self._all(sql + " ORDER BY created_at DESC LIMIT ?", (*args, limit))
        out = []
        for r in rows:
            disp = json.loads(r["disposition_json"]) if r["disposition_json"] else None
            case = json.loads(r["case_json"])
            out.append(
                {
                    "session_id": r["session_id"],
                    "user_id": r["user_id"],
                    "created_at": r["created_at"],
                    "previous_session_id": r["previous_session_id"],
                    "complaint": case.get("complaint_text"),
                    "tier": disp["tier"] if disp else None,
                    "title": disp["title"] if disp else None,
                    "sensing_used": disp["sensing_used"] if disp else False,
                    "agent": r["agent"],
                    # Semantic movement result for the timeline (never timings).
                    "functional_status": case.get("functional_status"),
                    "comparison_status": (case.get("comparison") or {}).get("status"),
                    "comparison_severity": (case.get("comparison") or {}).get("severity"),
                }
            )
        return out

    def latest_finished_session(self, user_id: str) -> str | None:
        r = self._one(
            "SELECT session_id FROM sessions WHERE user_id=? AND disposition_json IS NOT NULL ORDER BY created_at DESC LIMIT 1", (user_id,)
        )
        return r["session_id"] if r else None

    # ------------------------------------------------------------------ messages
    def add_message(self, session_id: str, role: str, text: str, data: dict | None = None) -> dict:
        ts = _now()
        cur = self._exec("INSERT INTO messages (session_id, ts, role, text, data_json) VALUES (?,?,?,?,?)", (session_id, ts, role, text, json.dumps(data or {})))
        return {"id": cur.lastrowid, "ts": ts, "role": role, "text": text, "data": data or {}}

    def messages(self, session_id: str) -> list[dict]:
        return [
            {"id": r["id"], "ts": r["ts"], "role": r["role"], "text": r["text"], "data": json.loads(r["data_json"])}
            for r in self._all("SELECT * FROM messages WHERE session_id=? ORDER BY id", (session_id,))
        ]

    # ------------------------------------------------------------------ grants
    def create_grant(self, session_id: str, expires_at: datetime) -> str:
        gid = "g_" + uuid.uuid4().hex[:12]
        self._exec("INSERT INTO grants VALUES (?,?,?,0)", (gid, session_id, expires_at.isoformat()))
        return gid

    def consume_grant(self, grant_id: str, session_id: str) -> bool:
        r = self._one("SELECT * FROM grants WHERE grant_id=? AND session_id=? AND used=0", (grant_id, session_id))
        if not r or datetime.fromisoformat(r["expires_at"]) < datetime.now(timezone.utc):
            return False
        self._exec("UPDATE grants SET used=1 WHERE grant_id=?", (grant_id,))
        return True

    # ------------------------------------------------------------------ measurements
    def _sign(self, m: FunctionalAssessment) -> str:
        payload = m.model_dump(mode="json", exclude={"signature", "verified"})
        return hmac.new(self._hmac_key, json.dumps(payload, sort_keys=True).encode(), hashlib.sha256).hexdigest()

    def save_measurement(self, m: FunctionalAssessment, *, user_id: str, debug: dict | None = None, purpose: str = "assessment") -> FunctionalAssessment:
        m = m.model_copy(update={"verified": False, "signature": None})
        m = m.model_copy(update={"signature": self._sign(m)})
        self._exec(
            "INSERT OR REPLACE INTO measurements VALUES (?,?,?,?,?,?,?)",
            (m.measurement_id, m.session_id, user_id, _now(), m.model_dump_json(), json.dumps(debug or {}), purpose),
        )
        return m.model_copy(update={"verified": True})

    def update_measurement(self, m: FunctionalAssessment) -> FunctionalAssessment:
        """Re-sign after a server-side update (e.g. recording the self-reported arm use)."""
        m = m.model_copy(update={"verified": False, "signature": None})
        m = m.model_copy(update={"signature": self._sign(m)})
        self._exec("UPDATE measurements SET json=? WHERE measurement_id=?", (m.model_dump_json(), m.measurement_id))
        return m.model_copy(update={"verified": True})

    def get_measurement(self, measurement_id: str, session_id: str | None = None) -> FunctionalAssessment | None:
        """Load a measurement and verify its signature (and session binding if given)."""
        r = self._one("SELECT json FROM measurements WHERE measurement_id=?", (measurement_id,))
        if not r:
            return None
        m = FunctionalAssessment.model_validate_json(r["json"])
        ok = m.signature is not None and hmac.compare_digest(m.signature, self._sign(m))
        if session_id is not None and m.session_id != session_id:
            ok = False
        return m.model_copy(update={"verified": ok})

    def measurement_debug(self, measurement_id: str) -> dict:
        r = self._one("SELECT debug_json FROM measurements WHERE measurement_id=?", (measurement_id,))
        return json.loads(r["debug_json"]) if r and r["debug_json"] else {}

    def list_measurements(self, purpose: str | None = None) -> list[FunctionalAssessment]:
        sql = "SELECT json FROM measurements"
        args: tuple = ()
        if purpose:
            sql += " WHERE purpose=?"
            args = (purpose,)
        return [FunctionalAssessment.model_validate_json(r["json"]) for r in self._all(sql + " ORDER BY created_at", args)]

    # ------------------------------------------------------------------ baselines (encrypted)
    def put_baseline(self, b: Baseline) -> None:
        enc = self._fernet.encrypt(b.model_dump_json().encode()).decode()
        self._exec("INSERT OR REPLACE INTO baselines VALUES (?, ?)", (b.user_id, enc))

    def get_baseline(self, user_id: str) -> Baseline | None:
        r = self._one("SELECT enc FROM baselines WHERE user_id=?", (user_id,))
        if not r:
            return None
        return Baseline.model_validate_json(self._fernet.decrypt(r["enc"].encode()))

    def delete_baseline(self, user_id: str) -> None:
        self._exec("DELETE FROM baselines WHERE user_id=?", (user_id,))

    def version(self, session_id: str) -> int:
        """Monotonic change counter for a session (audit + message ids)."""
        a = self._one("SELECT COALESCE(MAX(id), 0) AS v FROM audit WHERE session_id=?", (session_id,))
        m = self._one("SELECT COALESCE(MAX(id), 0) AS v FROM messages WHERE session_id=?", (session_id,))
        return int(a["v"]) + int(m["v"])

    # ------------------------------------------------------------------ audit
    def log(self, ev: AuditEvent) -> AuditEvent:
        cur = self._exec(
            "INSERT INTO audit (ts, session_id, actor, event, tool, result, data_json) VALUES (?,?,?,?,?,?,?)",
            (ev.timestamp.isoformat(), ev.session_id, ev.actor, ev.event, ev.tool, ev.result, json.dumps(ev.data, default=str)),
        )
        return ev.model_copy(update={"id": cur.lastrowid})

    def audit(self, session_id: str | None = None, limit: int = 500) -> list[AuditEvent]:
        sql = "SELECT * FROM audit"
        args: tuple = ()
        if session_id:
            sql += " WHERE session_id=?"
            args = (session_id,)
        rows = self._all(sql + " ORDER BY id LIMIT ?", (*args, limit))
        return [
            AuditEvent(
                id=r["id"], timestamp=r["ts"], session_id=r["session_id"], actor=r["actor"], event=r["event"],
                tool=r["tool"], result=r["result"], data=json.loads(r["data_json"]),
            )
            for r in rows
        ]

    # ------------------------------------------------------------------ rechecks / shares / validation
    def add_recheck(self, session_id: str, user_id: str, due_at: datetime, reason: str) -> int:
        return self._exec("INSERT INTO rechecks (session_id, user_id, due_at, reason) VALUES (?,?,?,?)", (session_id, user_id, due_at.isoformat(), reason)).lastrowid

    def rechecks(self, user_id: str | None = None) -> list[dict]:
        sql = "SELECT * FROM rechecks"
        args: tuple = ()
        if user_id:
            sql += " WHERE user_id=?"
            args = (user_id,)
        return [dict(r) for r in self._all(sql + " ORDER BY due_at", args)]

    def complete_recheck(self, session_id: str) -> None:
        self._exec("UPDATE rechecks SET status='completed' WHERE session_id=?", (session_id,))

    def add_share(self, session_id: str, data: dict) -> None:
        self._exec("INSERT INTO shares (session_id, json) VALUES (?, ?)", (session_id, json.dumps(data, default=str)))

    def shares(self, session_id: str) -> list[dict]:
        return [json.loads(r["json"]) for r in self._all("SELECT json FROM shares WHERE session_id=? ORDER BY id", (session_id,))]

    def add_validation(self, measurement_id: str, gt: float, method: str, participant: str | None, notes: str | None) -> None:
        self._exec(
            "INSERT INTO sensor_validation (measurement_id, ground_truth_seconds, method, participant, notes, created_at) VALUES (?,?,?,?,?,?)",
            (measurement_id, gt, method, participant, notes, _now()),
        )

    def validations(self) -> list[dict]:
        return [dict(r) for r in self._all("SELECT * FROM sensor_validation ORDER BY id")]

    def wipe_user(self, user_id: str) -> None:
        sids = [r["session_id"] for r in self._all("SELECT session_id FROM sessions WHERE user_id=?", (user_id,))]
        for sid in sids:
            for t in ("messages", "grants", "audit", "rechecks", "shares"):
                self._exec(f"DELETE FROM {t} WHERE session_id=?", (sid,))
        self._exec("DELETE FROM measurements WHERE user_id=?", (user_id,))
        self._exec("DELETE FROM sessions WHERE user_id=?", (user_id,))
