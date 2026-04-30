CREATE TABLE wastage
(
    id           SERIAL PRIMARY KEY,
    job_phase_id INTEGER     NOT NULL,
    rpi          INTEGER     NOT NULL,
    quantity     INTEGER     NOT NULL,
    reported_by  INTEGER     NOT NULL,
    reason       TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wastage_job_phase_id
    ON wastage (job_phase_id);