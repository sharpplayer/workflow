CREATE TABLE products
(
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    old_name   TEXT        NOT NULL,
    width      INTEGER     NOT NULL,
    length     INTEGER     NOT NULL,
    thickness  INTEGER     NOT NULL,
    profile    TEXT        NOT NULL,
    material   TEXT        NOT NULL,
    owner      TEXT        NOT NULL,
    edge       TEXT        NOT NULL,
    pitch      TEXT        NOT NULL,
    finish     TEXT        NOT NULL,
    rack_type  INTEGER     NOT NULL,
    pack_size  INTEGER     NOT NULL,
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_products_name
    ON products (name);

CREATE UNIQUE INDEX idx_products_old_name
    ON products (old_name);

CREATE TABLE machines
(
    id               SERIAL PRIMARY KEY,
    name             TEXT UNIQUE NOT NULL,
    run_minutes_unit NUMERIC DEFAULT 1
);

CREATE TABLE product_machines
(
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    machine_id  INTEGER NOT NULL,

    UNIQUE (product_id, step_number)
);

CREATE TABLE phase
(
    id          SERIAL PRIMARY KEY,
    description TEXT    NOT NULL,
    usage       INTEGER NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE
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
    phase_id INTEGER NOT NULL,
    name     TEXT    NOT NULL,
    config   TEXT    NOT NULL,
    input    INTEGER NOT NULL,
    "order"  INTEGER NOT NULL
);

CREATE INDEX idx_phase_param_phase_id_input_order
    ON phase_param (phase_id, input, "order");

-- 1 is from stock (from call off)
-- 2 is call off stock orders
-- 4 is per-pack
INSERT INTO phase (description, usage, enabled)
VALUES ('Material Logistics', (1 | 2), TRUE),
       ('Workstations', (1), TRUE),
       ('Setting Instructions', (1), TRUE),
       ('First Off QC Inspection', (1), TRUE),
       ('RPI Data and QC Inspection', (4|1), TRUE),
       ('Racking Prep', (1), TRUE),
       ('Spraying', (1 | 2), TRUE),
       ('Drying', (1 | 2), TRUE),
       ('Stacking and Strapping', (1 | 2), TRUE),
       ('Palletising and Shrinkwrap', (1 | 2), TRUE),
       ('Bearers, Labels, Shrinkwrap', (1 | 2), TRUE),
       ('Loading and Dispatch Docs', (1 | 2), TRUE);



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
                      ('First Off QC Inspection', 'Material', 'CHECK(PRODUCT(material))', 3, 1),
                      ('First Off QC Inspection', 'Orientation', 'CHECK(PRODUCT(format))', 3, 2),
                      ('First Off QC Inspection', 'Length', 'CHECK(PRODUCT(length))', 3, 3),
                      ('First Off QC Inspection', 'Width', 'CHECK(PRODUCT(width))', 3, 4),
                      ('First Off QC Inspection', 'Thickness', 'CHECK(PRODUCT(thickness))', 3, 5),
                      ('First Off QC Inspection', 'Profile', 'CHECK(PRODUCT(profile))', 3, 6),
                      ('First Off QC Inspection', 'Pitch', 'CHECK(PRODUCT(pitch))', 3, 7),
                      ('First Off QC Inspection', 'Edge', 'CHECK(PRODUCT(edge))', 3, 8),
                      ('First Off QC Inspection', 'Operator', 'SIGN(OP)', 3, 9),
                      ('First Off QC Inspection', 'Operator', 'SIGN(OP)', 3, 10),
                      ('First Off QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3, 11),
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
                      ('Racking Prep', 'Rack Level Type', 'PRODUCT(rackType)', 1, 1),
                      ('Racking Prep', 'Quantity', 'JOB(quantity)/PRODUCT(rackType)', 3, 2),
                      ('Racking Prep', 'Pack ID Colour', 'COLOUR', 3, 3),
                      ('Racking Prep', 'Operator', 'SIGN(RACKING)', 3, 4),
                      ('Spraying', 'Paint', 'PRODUCT(finish)', 1, 1),
                      ('Spraying', 'Surface', 'SURFACE', 1, 2),
                      ('Spraying', 'Microns', 'int', 3, 3),
                      ('Spraying', 'Wastage', 'WASTAGE', 3, 4),
                      ('Spraying', 'Operator', 'SIGN(OP)', 3, 5),
                      ('Drying', 'Temperature', 'float', 3, 1),
                      ('Drying', 'Humidity(%)', 'float', 3, 2),
                      ('Drying', 'Wastage', 'WASTAGE', 3, 3),
                      ('Drying', 'Operator', 'SIGN(OP)', 3, 4),
                      ('Stacking and Strapping', 'Quantity', 'Product(packSize)', 3, 1),
                      ('Stacking and Strapping', 'Paper Inserts', 'INSERTS', 2, 2),
                      ('Stacking and Strapping', 'Wastage', 'WASTAGE', 3, 3),
                      ('Stacking and Strapping', 'Operator', 'SIGN(STACKING)', 3, 4),
                      ('Stacking and Strapping', 'Operator', 'SIGN(STACKING)', 3, 4),
                      ('Palletising and Shrinkwrap', 'Wastage', 'WASTAGE', 3, 1),
                      ('Palletising and Shrinkwrap', 'Operator', 'SIGN(PALLETISING)', 3, 2),
                      ('Bearers, Labels, Shrinkwrap', 'Labels', 'boolean', 3, 1),
                      ('Bearers, Labels, Shrinkwrap', 'Recycled Paper', 'boolean', 3, 2),
                      ('Bearers, Labels, Shrinkwrap', 'Hole Free', 'boolean', 3, 3),
                      ('Bearers, Labels, Shrinkwrap', 'Pallet', 'int', 3, 4),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Straps', 'int', 3, 5),
                      ('Bearers, Labels, Shrinkwrap', 'Extra Labels', 'boolean', 3, 6),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Bearers', 'boolean', 3, 7),
                      ('Bearers, Labels, Shrinkwrap', 'Stamped', 'boolean', 3, 8),
                      ('Bearers, Labels, Shrinkwrap', 'Operator', 'SIGN(WRAPPING)', 3, 9),
                      ('Loading and Dispatch Docs', 'Holding Bay', 'int', 3, 1),
                      ('Loading and Dispatch Docs', 'Wagon Photo', 'PHOTO', 3, 2),
                      ('Loading and Dispatch Docs', 'FLT', 'SIGN(FLT)', 3,
                       3))
    AS v(phase_desc, name, config, input, "order")
              ON p.description = v.phase_desc;