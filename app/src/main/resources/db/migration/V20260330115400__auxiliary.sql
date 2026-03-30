CREATE TABLE customer
(
    id             SERIAL PRIMARY KEY,
    code           VARCHAR(20) NOT NULL,
    name           VARCHAR(50) NOT NULL,
    zone           VARCHAR(30) NOT NULL,
    contact        VARCHAR(50) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_customer_code
    ON customer (code);

CREATE TABLE carrier
(
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(20) NOT NULL,
    name       VARCHAR(50) NOT NULL,
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_carrier_code
    ON carrier (code);
