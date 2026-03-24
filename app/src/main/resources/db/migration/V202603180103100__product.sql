CREATE TABLE products
(
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    old_name   VARCHAR(50) NOT NULL,
    width      INTEGER     NOT NULL,
    length     INTEGER     NOT NULL,
    thickness  INTEGER     NOT NULL,
    profile    VARCHAR(50) NOT NULL,
    material   VARCHAR(50) NOT NULL,
    owner      VARCHAR(50) NOT NULL,
    edge       VARCHAR(50) NOT NULL,
    pitch      VARCHAR(50) NOT NULL,
    finish     VARCHAR(30) NOT NULL,
    rack_type  VARCHAR(30) NOT NULL,
    machinery  TEXT[] NOT NULL DEFAULT '{}',
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_products_name
    ON products (name);

CREATE UNIQUE INDEX idx_products_old_name
    ON products (old_name);

CREATE TABLE phase
(
    id          SERIAL PRIMARY KEY,
    description VARCHAR(100) NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE product_phase
(
    product_id INTEGER NOT NULL,
    phase_id   INTEGER NOT NULL,
    "order"    INTEGER NOT NULL,
    CONSTRAINT product_phase_pkey PRIMARY KEY (product_id, phase_id)
);

CREATE TABLE phase_param
(
    id       SERIAL PRIMARY KEY,
    phase_id INTEGER     NOT NULL,
    name     VARCHAR(50) NOT NULL,
    config   VARCHAR(20) NOT NULL,
    input    BOOLEAN     NOT NULL,
    "order"  INTEGER     NOT NULL
);
