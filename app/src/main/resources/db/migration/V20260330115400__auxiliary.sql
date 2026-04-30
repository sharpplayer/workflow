CREATE TABLE customer
(
    id             SERIAL PRIMARY KEY,
    code           TEXT        NOT NULL,
    name           TEXT        NOT NULL,
    zone           TEXT        NOT NULL,
    contact        TEXT        NOT NULL,
    contact_number TEXT        NOT NULL,
    proforma       BOOLEAN     NOT NULL DEFAULT TRUE,
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_customer_code
    ON customer (code);

CREATE TABLE carrier
(
    id             SERIAL PRIMARY KEY,
    code           TEXT        NOT NULL,
    name           TEXT        NOT NULL,
    contact_name   TEXT        NOT NULL,
    contact_number TEXT        NOT NULL,
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_carrier_code
    ON carrier (code);
