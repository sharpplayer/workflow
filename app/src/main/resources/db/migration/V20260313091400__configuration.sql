CREATE TABLE configuration
(
    id    VARCHAR(20) PRIMARY KEY,
    type  VARCHAR(20),
    value VARCHAR(255)
);

INSERT INTO configuration (id,
                           type,
                           value)
VALUES ('ROLES',
        'string[]',
        'ADMIN');