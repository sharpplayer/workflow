CREATE TABLE users
(
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_hash      VARCHAR(255),
    roles         TEXT[] NOT NULL DEFAULT '{}',
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    password_reset BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_username ON users (username);