CREATE TABLE job
(
    id                SERIAL PRIMARY KEY,
    number            BIGINT      NOT NULL UNIQUE,
    parts             INTEGER     NOT NULL,
    due               TIMESTAMPTZ NOT NULL,
    customer_id       INTEGER,
    carrier_id        INTEGER,
    call_off          BOOLEAN     NOT NULL DEFAULT FALSE,
    payment_confirmed TIMESTAMPTZ,
    status            INTEGER     NOT NULL,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_status ON job (status);

CREATE INDEX idx_job_number ON job (number);

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
    started_at         TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_job_part_job_id_part_number
        UNIQUE (job_id, part_number)
);

CREATE INDEX idx_job_part_status ON job_part (status);

CREATE TABLE job_part_phases
(
    id                  SERIAL PRIMARY KEY,
    job_part_id         INTEGER     NOT NULL,
    phase_id            INTEGER     NOT NULL,
    phase_number        INTEGER     NOT NULL,
    special_instruction TEXT,
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
    original_param_id INTEGER     NOT NULL,
    name              TEXT        NOT NULL,
    config            TEXT        NOT NULL,
    input             INTEGER     NOT NULL,
    value             TEXT,
    status            INTEGER     NOT NULL,
    machine_id        INTEGER,
    pack              INTEGER,
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

CREATE TABLE job_part_operation
(
    id                          SERIAL PRIMARY KEY,
    job_part_id                 INTEGER     NOT NULL,
    machine_id                  INTEGER     NOT NULL,
    step_number                 INTEGER     NOT NULL,

    quantity                    INTEGER     NOT NULL,
    planned_start_at            TIMESTAMPTZ,
    planned_finish_at           TIMESTAMPTZ,
    setup_minutes               INTEGER     NOT NULL,
    break_minutes               INTEGER     NOT NULL,
    pack_minutes                INTEGER     NOT NULL,
    planned_minutes             INTEGER     NOT NULL,

    scheduled_for_date          DATE        NOT NULL,
    machine_queue_position      INTEGER,

    status                      INTEGER,

    actual_start_at             TIMESTAMPTZ,
    actual_finish_at            TIMESTAMPTZ,
    start_job_part_param_id     INTEGER,
    first_off_job_part_param_id INTEGER,
    finish_job_part_param_id    INTEGER,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (job_part_id, step_number),
    UNIQUE (scheduled_for_date, machine_id, machine_queue_position)
);

CREATE TABLE job_part_operation_delay
(
    id                     SERIAL PRIMARY KEY,
    job_part_operation_id  INTEGER     NOT NULL,
    old_scheduled_for_date DATE,
    new_scheduled_for_date DATE,
    old_machine_id         INTEGER,
    new_machine_id         INTEGER,
    old_queue_position     INTEGER,
    new_queue_position     INTEGER,
    reason                 TEXT        NOT NULL,
    delayed_by_user_id     INTEGER     NOT NULL,
    delayed_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);