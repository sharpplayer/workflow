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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    CONSTRAINT product_phase_pkey PRIMARY KEY (product_id, phase_id, "order")
);


CREATE TABLE phase_param
(
    id       SERIAL PRIMARY KEY,
    phase_id INTEGER     NOT NULL,
    name     VARCHAR(50) NOT NULL,
    config   VARCHAR(50) NOT NULL,
    input    INTEGER     NOT NULL,
    "order"  INTEGER     NOT NULL
);

CREATE INDEX idx_phase_param_phase_id_input_order
    ON phase_param (phase_id, input, "order");


INSERT INTO phase (description, enabled)
VALUES ('Material Logistics', TRUE),
       ('Workstations', TRUE),
       ('Setting Instructions', TRUE),
       ('First Off QC Inspection', TRUE),
       ('RPI Data and QC Inspection', TRUE),
       ('Racking Prep', TRUE),
       ('Spraying', TRUE),
       ('Drying', TRUE),
       ('Stacking and Strapping', TRUE),
       ('Palletising and Shrinkwrap', TRUE),
       ('Bearers, Labels, Shrinkwrap', TRUE),
       ('Loading and Dispatch Docs', TRUE);



INSERT INTO phase_param (phase_id, name, config, input, "order")
SELECT p.id, v.name, v.config, v.input, v."order"
FROM phase p
         JOIN (VALUES ('Material Logistics', 'Material', 'PRODUCT(material)', 1, 1),
                      ('Material Logistics', 'From', '', 3, 2),
                      ('Material Logistics', 'To', '', 3, 3),
                      ('Material Logistics', 'Wastage', 'WASTAGE', 3, 4),
                      ('Setting Instructions', 'Sign', 'SIGN(INSPECTOR)', 3, 9),
                      ('Workstations', 'Machinery', 'PRODUCT(machinery)', 1, 1),
                      ('Setting Instructions', 'Material', 'PRODUCT(material)', 1, 1),
                      ('Setting Instructions', 'Orientation', 'PRODUCT(format)', 1, 2),
                      ('Setting Instructions', 'Length', 'PRODUCT(length)', 1, 3),
                      ('Setting Instructions', 'Width', 'PRODUCT(width)', 1, 4),
                      ('Setting Instructions', 'Thickness', 'PRODUCT(thickness)', 1, 5),
                      ('Setting Instructions', 'Profile', 'PRODUCT(profile)', 1, 6),
                      ('Setting Instructions', 'Pitch', 'PRODUCT(pitch)', 1, 7),
                      ('Setting Instructions', 'Edge', 'PRODUCT(edge)', 1, 8),
                      ('Setting Instructions', 'Wastage', 'WASTAGE', 3, 9),
                      ('Setting Instructions', 'Sign', 'SIGN(SETTER)', 3, 10),
                      ('First Off QC Inspection', 'Material', 'PRODUCT(material)', 3, 1),
                      ('First Off QC Inspection', 'Orientation', 'PRODUCT(format)', 3, 2),
                      ('First Off QC Inspection', 'Length', 'int', 3, 3),
                      ('First Off QC Inspection', 'Length', 'int', 3, 4),
                      ('First Off QC Inspection', 'Thickness', 'float', 3, 5),
                      ('First Off QC Inspection', 'Profile', 'PRODUCT(profile)', 3, 6),
                      ('First Off QC Inspection', 'Pitch', 'PRODUCT(pitch)', 3, 7),
                      ('First Off QC Inspection', 'Edge', 'PRODUCT(edge)', 3, 8),
                      ('First Off QC Inspection', 'Operatives', 'SIGN(OP,OP)', 3, 9),
                      ('First Off QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3, 10),
                      ('RPI Data and QC Inspection', 'Pack', 'PACK', 3, 1),
                      ('RPI Data and QC Inspection', 'RPI', 'string', 3, 2),
                      ('RPI Data and QC Inspection', 'Date', 'now', 3, 3),
                      ('RPI Data and QC Inspection', 'Time', 'now', 3, 4),
                      ('RPI Data and QC Inspection', 'Finish', 'string', 3, 5),
                      ('RPI Data and QC Inspection', 'Par', 'string', 3, 6),
                      ('RPI Data and QC Inspection', 'Width', 'int', 3, 7),
                      ('RPI Data and QC Inspection', 'Left', 'float', 3, 8),
                      ('RPI Data and QC Inspection', 'Centre', 'float', 3, 9),
                      ('RPI Data and QC Inspection', 'Right', 'float', 3, 10),
                      ('RPI Data and QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3, 11),
                      -- PER PACK INDICATOR REQD -> ('RPI Data and QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3, 11)
                      ('Racking Prep', 'Rack Level Type', 'PRODUCT(rackType)', 1, 1),
                      ('Racking Prep', 'Quantity', 'JOB(quantity)/PRODUCT(rackType)', 3, 2),
                      ('Racking Prep', 'Pack ID Colour', 'COLOUR', 2, 3),
                      ('Racking Prep', 'Operator', 'SIGN(OP)', 3, 4),
                      ('Spraying', 'Paint', 'PRODUCT(finish)', 1, 1),
                      ('Spraying', 'Surface', 'SURFACE', 1, 2),
                      ('Spraying', 'Microns', 'int', 3, 3),
                      ('Spraying', 'Wastage', 'WASTAGE', 3, 4),
                      ('Spraying', 'Operator', 'SIGN(OP)', 3, 5),
                      ('Drying', 'Temperature', 'float', 3, 1),
                      ('Drying', 'Humidity(%)', 'float', 3, 2),
                      ('Drying', 'Wastage', 'WASTAGE', 3, 3),
                      ('Drying', 'Operator', 'SIGN(OP)', 3, 4),
                      ('Stacking and Strapping', 'Quantity', 'PACK', 3, 1),
                      ('Stacking and Strapping', 'Inserts', 'INSERTS', 3, 2),
                      ('Stacking and Strapping', 'Wastage', 'WASTAGE', 3, 3),
                      ('Stacking and Strapping', 'Operatives', 'SIGN(OP,OP)', 3, 4),
                      ('Palletising and Shrinkwrap', 'Wastage', 'WASTAGE', 3, 1),
                      ('Palletising and Shrinkwrap', 'Operative', 'SIGN(OP)', 3, 2),
                      ('Bearers, Labels, Shrinkwrap', 'Labels', 'boolean', 3, 1),
                      ('Bearers, Labels, Shrinkwrap', 'Recycled Paper', 'boolean', 3, 2),
                      ('Bearers, Labels, Shrinkwrap', 'Hole Free', 'boolean', 3, 3),
                      ('Bearers, Labels, Shrinkwrap', 'Pallet', 'int', 3, 4),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Straps', 'int', 3, 5),
                      ('Bearers, Labels, Shrinkwrap', 'Extra Labels', 'boolean', 3, 6),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Bearers', 'boolean', 3, 7),
                      ('Bearers, Labels, Shrinkwrap', 'Stamped', 'boolean', 3, 8),
                      ('Bearers, Labels, Shrinkwrap', 'Operative', 'SIGN(OP)', 3, 9),
                      ('Loading and Dispatch Docs', 'Holding Bay', 'int', 3, 1),
                      ('Loading and Dispatch Docs', 'Wagon Photo', 'PHOTO', 3, 2),
                      ('Loading and Dispatch Docs', 'FLT', 'SIGN(FLT)', 3,
                       3))
    AS v(phase_desc, name, config, input, "order")
              ON p.description = v.phase_desc;