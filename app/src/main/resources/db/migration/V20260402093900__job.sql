CREATE TABLE job
(
    id               SERIAL PRIMARY KEY,
    number           BIGINT      NOT NULL UNIQUE,
    parts            INTEGER     NOT NULL,
    due              TIMESTAMPTZ NOT NULL,
    customer_id      INTEGER,
    carrier_id       INTEGER,
    call_off         BOOLEAN     NOT NULL DEFAULT FALSE,
    payment_received BOOLEAN     NOT NULL DEFAULT FALSE,
    status           INTEGER     NOT NULL,
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_status ON job (status);

CREATE TABLE job_part
(
    id                 SERIAL PRIMARY KEY,
    job_id             INTEGER     NOT NULL,
    part_number        INTEGER     NOT NULL,
    product_id         INTEGER     NOT NULL,
    quantity           INTEGER     NOT NULL,
    from_call_off      BOOLEAN     NOT NULL DEFAULT FALSE,
    material_available BOOLEAN     NOT NULL DEFAULT TRUE,
    status             INTEGER     NOT NULL,
    schedule_for       TIMESTAMPTZ,
    run_on             TIMESTAMPTZ,
    run_order          INTEGER,
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_part_job_id_part_number
        UNIQUE (job_id, part_number)
);

CREATE INDEX idx_job_part_status ON job_part (status);

CREATE INDEX idx_job_part_status_schedule_for
    ON job_part (status, schedule_for) WHERE schedule_for IS NOT NULL;

CREATE INDEX idx_job_part_run_on_status_run_order
    ON job_part (status, run_on, run_order) WHERE run_on IS NOT NULL;

CREATE TABLE job_part_phases
(
    id                  SERIAL PRIMARY KEY,
    job_part_id         INTEGER     NOT NULL,
    phase_id            INTEGER     NOT NULL,
    phase_number        INTEGER     NOT NULL,
    special_instruction VARCHAR(256),
    status              INTEGER     NOT NULL,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_job_part_phases_params_triplet
        UNIQUE (job_part_id, phase_id, phase_number)
);

CREATE INDEX idx_job_part_phases_status ON job_part_phases (status);

CREATE TABLE job_part_params
(
    id                SERIAL PRIMARY KEY,
    job_part_phase_id INTEGER     NOT NULL,
    name              VARCHAR(50) NOT NULL,
    config            VARCHAR(50) NOT NULL,
    input             INTEGER     NOT NULL,
    value             VARCHAR(20),
    "order"           INTEGER     NOT NULL,
    valued_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE job_number_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;