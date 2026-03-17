CREATE TABLE users
(
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    pin_hash       VARCHAR(255),
    roles          TEXT[] NOT NULL DEFAULT '{}',
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    password_reset BOOLEAN      NOT NULL DEFAULT TRUE,
    pin_reset      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_username ON users (username);

INSERT INTO users (username,
                   password_hash,
                   pin_hash,
                   roles,
                   enabled,
                   password_reset,
                   created_at)
VALUES ('admin',
        '$argon2id$v=19$m=65536,t=3,p=1$Nv2kuq0FFx6RfSsWpF4EsQ$Bk3t0/iCjdaTPNuFqsP8vIboF3lgD1wgIxrWL5tLHjg',
        NULL,
        ARRAY['ADMIN'],
        TRUE,
        TRUE,
        '2026-03-12 12:37:18.599341'::timestamp);