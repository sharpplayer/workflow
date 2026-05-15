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
    free_issue BOOLEAN     NOT NULL,
    enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_products_name
    ON products (name);

CREATE UNIQUE INDEX idx_products_old_name
    ON products (old_name);

CREATE TABLE machines
(
    id                  SERIAL PRIMARY KEY,
    name                TEXT UNIQUE NOT NULL,
    thickness_setup     INTEGER     NOT NULL DEFAULT 600,
    edge_setup          INTEGER     NOT NULL DEFAULT 900,
    pitch_setup         INTEGER     NOT NULL DEFAULT 4500,
    profile_setup       INTEGER     NOT NULL DEFAULT 600,
    major_profile_setup INTEGER     NOT NULL DEFAULT 4500
);

INSERT INTO machines (name, thickness_setup, edge_setup, pitch_setup, profile_setup,
                      major_profile_setup)
VALUES ('BEAMSAW', 0, 0, 0, 0, 0),
       ('MULTI PRO', 600, 900, 4500, 600, 4500),
       ('1525', 600, 900, 4500, 600, 4500),
       ('MINI PRO', 600, 900, 4500, 600, 4500),
       ('MORBIDELLI', 600, 900, 4500, 600, 4500),
       ('ANDERSON', 600, 900, 4500, 600, 4500),
       ('LOGIC', 0, 0, 0, 0, 0),
       ('SPINDLE', 0, 0, 0, 0, 0),
       ('DENIBBING', 0, 0, 0, 0, 0),
       ('MEZZ UNIT 24', 0, 0, 0, 0, 0),
       ('FOIL', 0, 0, 0, 0, 0),
       ('EDGEBANDING', 0, 0, 0, 0, 0),
       ('PRINT', 0, 0, 0, 0, 0),
       ('3DPRINT', 0, 0, 0, 0, 0);

CREATE TABLE product_machines
(
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER NOT NULL,
    step_number      INTEGER NOT NULL,
    machine_id       INTEGER NOT NULL,
    seconds_per_unit INTEGER NOT NULL,
    seconds_per_pack INTEGER NOT NULL,

    UNIQUE (product_id, step_number)
);

CREATE TABLE phase
(
    id          SERIAL PRIMARY KEY,
    description TEXT    NOT NULL,
    usage       INTEGER NOT NULL,
    machine_ids INTEGER[] NOT NULL DEFAULT '{}',
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

-- 1 is for from call off (from stock)
-- 2 is for call off orders (to stock)
-- 4 is parameters are for each RPI
-- 8 is scheduling phase (per machine)
-- 16 is parameters are per product pack
-- 32 is doubled for landscape for specified machines
-- 64 is cross job
INSERT INTO phase (description, usage, machine_ids, enabled)
VALUES ('Material Logistics', (1 | 2), '{}', TRUE),
       ('Manufacture: Start', (8 | 2), '{}', TRUE),
       ('Manufacture: Setting Instructions', (8 | 2), ARRAY(SELECT m.id FROM machines m WHERE m.name = ANY (
        ARRAY['ANDERSON','MORBIDELLI'])), TRUE),
       ('Manufacture: First Off', (8 | 2), ARRAY(SELECT m.id FROM machines m WHERE m.name = ANY (
        ARRAY['ANDERSON','MORBIDELLI','BEAMSAW'])), TRUE),
       ('Manufacture: First Off QC Inspection', (8 | 2), ARRAY(SELECT m.id FROM machines m WHERE m.name = ANY (
        ARRAY['ANDERSON','MORBIDELLI','BEAMSAW'])), TRUE),
       ('Manufacture: First Off QC Inspection (Multiple Operative)', (8 | 2), ARRAY(SELECT m.id FROM machines m WHERE m.name = ANY (
        ARRAY['MULTI PRO','1525','MINI PRO'])), TRUE),
       ('Manufacture: Completion', (2 | 8), '{}', TRUE),
       ('RPI Data and QC Inspection', (2 | 4 | 32), ARRAY(SELECT m.id FROM machines m WHERE m.name = ANY (
        ARRAY['MORBIDELLI'])), TRUE),
       ('Racking and Spraying', (1 | 2), '{}', TRUE),
       ('Drying', (1 | 2), '{}', TRUE),
       ('Stacking and Strapping', (1 | 2 | 16), '{}', TRUE),
       ('Palletising and Shrinkwrap', (1 | 64), '{}', TRUE),
       ('Bearers, Labels, Shrinkwrap', (1 | 64), '{}', TRUE),
       ('Storage', (1 | 64), '{}', TRUE),
       ('Dispatch Docs', (1 | 64), '{}', TRUE);



INSERT INTO phase_param (phase_id, name, config, input, "order")
SELECT p.id, v.name, v.config, v.input, v."order"
FROM phase p
         JOIN (VALUES ('Material Logistics', 'Free Issue', 'PRODUCT(freeIssue)', 1, 1),
                      ('Material Logistics', 'Material', 'PRODUCT(material)', 1, 2),
                      ('Material Logistics', 'From Location', 'string', 1, 3),
                      ('Material Logistics', 'To Location', 'string', 3, 4),
                      ('Material Logistics', 'Wastage', 'WASTAGE', 3, 5),
                      ('Material Logistics', 'Sign', 'SIGN(LOGISTICS)', 3, 6),
                      ('Manufacture: Setting Instructions', 'Material', 'PRODUCT(material)', 1, 1),
                      ('Manufacture: Setting Instructions', 'Orientation', 'PRODUCT(format)', 1, 2),
                      ('Manufacture: Setting Instructions', 'Length', 'PRODUCT(length)', 1, 3),
                      ('Manufacture: Setting Instructions', 'Width', 'PRODUCT(width)', 1, 4),
                      ('Manufacture: Setting Instructions', 'Thickness', 'PRODUCT(thickness)', 1,
                       5),
                      ('Manufacture: Setting Instructions', 'Profile', 'PRODUCT(profile)', 1, 6),
                      ('Manufacture: Setting Instructions', 'Pitch', 'PRODUCT(pitch)', 1, 7),
                      ('Manufacture: Setting Instructions', 'Edge', 'PRODUCT(edge)', 1, 8),
                      ('Manufacture: Setting Instructions', 'Sign', 'SIGN(SETTER)', 3, 10),
                      ('Manufacture: First Off QC Inspection', 'Material',
                       'CHECK(PRODUCT(material))', 3, 1),
                      ('Manufacture: First Off QC Inspection', 'Orientation',
                       'CHECK(PRODUCT(format))', 3, 2),
                      ('Manufacture: First Off QC Inspection', 'Length', 'CHECK(PRODUCT(length))',
                       3, 3),
                      ('Manufacture: First Off QC Inspection', 'Width', 'CHECK(PRODUCT(width))', 3,
                       4),
                      ('Manufacture: First Off QC Inspection', 'Thickness',
                       'CHECK(PRODUCT(thickness))', 3, 5),
                      ('Manufacture: First Off QC Inspection', 'Profile', 'CHECK(PRODUCT(profile))',
                       3, 6),
                      ('Manufacture: First Off QC Inspection', 'Pitch', 'CHECK(PRODUCT(pitch))', 3,
                       7),
                      ('Manufacture: First Off QC Inspection', 'Edge', 'CHECK(PRODUCT(edge))', 3,
                       8),
                      ('Manufacture: First Off QC Inspection', 'RPI', 'int', 3, 9),
                      ('Manufacture: First Off QC Inspection', 'Operator', 'OPERATOR', 3, 10),
                      ('Manufacture: First Off QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3,
                       12),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Material',
                       'CHECK(PRODUCT(material))', 3, 1),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Orientation',
                       'CHECK(PRODUCT(format))', 3, 2),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Length',
                       'CHECK(PRODUCT(length))', 3, 3),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Width',
                       'CHECK(PRODUCT(width))', 3, 4),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Thickness',
                       'CHECK(PRODUCT(thickness))', 3, 5),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Profile',
                       'CHECK(PRODUCT(profile))', 3, 6),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Pitch',
                       'CHECK(PRODUCT(pitch))', 3, 7),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Edge',
                       'CHECK(PRODUCT(edge))', 3, 8),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'RPI', 'int', 3,
                       9),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Feeder',
                       'OPERATOR', 3, 10),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Stacker',
                       'OPERATOR', 3, 11),
                      ('Manufacture: First Off QC Inspection (Multiple Operative)', 'Inspector',
                       'SIGN(INSPECTOR)', 3,
                       12),
                      ('RPI Data and QC Inspection', 'Quantity', 'int', 3, 1),
                      ('RPI Data and QC Inspection', 'Parallel', 'boolean', 3, 2),
                      ('RPI Data and QC Inspection', 'Finish', 'SMOOTHNESS', 3, 3),
                      ('RPI Data and QC Inspection', 'Equidistant Spacings', 'boolean', 3, 4),
                      ('RPI Data and QC Inspection', 'Width', 'float', 3, 5),
                      ('RPI Data and QC Inspection', 'Left', 'float', 3, 6),
                      ('RPI Data and QC Inspection', 'Centre', 'float', 3, 7),
                      ('RPI Data and QC Inspection', 'Right', 'float', 3, 8),
                      ('RPI Data and QC Inspection', 'Wastage', 'WASTAGE', 3, 9),
                      ('RPI Data and QC Inspection', 'Inspector', 'SIGN(INSPECTOR)', 3,
                       10),
                      ('RPI Data and QC Inspection', 'Finish', 'SIGN(INSPECTOR)', 4,
                       11),
                      ('Racking and Spraying', 'Rack Level Type', 'PRODUCT(rackType)', 1, 1),
                      ('Racking and Spraying', 'Quantity', 'RACKS', 2, 2),
                      ('Racking and Spraying', 'Pack ID Colour', 'COLOUR', 3, 3),
                      ('Racking and Spraying', 'Operator', 'SIGN(RACKING)', 3, 4),
                      ('Racking and Spraying', 'Start', 'AWAIT(OP)', 3, 5),
                      ('Racking and Spraying', 'Paint', 'PRODUCT(finish)', 1, 6),
                      ('Racking and Spraying', 'Surface', 'SURFACE', 1, 7),
                      ('Racking and Spraying', 'Microns', 'int', 3, 8),
                      ('Racking and Spraying', 'Wastage', 'WASTAGE', 3, 9),
                      ('Racking and Spraying', 'Operator', 'SIGN(SPRAYER)', 3, 10),
                      ('Drying', 'Temperature', 'float', 3, 1),
                      ('Drying', 'Humidity(%)', 'float', 3, 2),
                      ('Drying', 'Wastage', 'WASTAGE', 3, 3),
                      ('Drying', 'Operator', 'SIGN(SPRAYER)', 3, 4),
                      ('Stacking and Strapping', 'Start', 'AWAIT(STACKING)', 3, 1),
                      ('Stacking and Strapping', 'Quantity', 'PACKSIZE', 2, 2),
                      ('Stacking and Strapping', 'Paper Inserts', 'INSERTS', 1, 3),
                      ('Stacking and Strapping', 'Wastage', 'WASTAGE', 3, 4),
                      ('Stacking and Strapping', 'Operator', 'SIGN(STACKING)', 3, 5),
                      ('Palletising and Shrinkwrap', 'Start', 'AWAIT(PALLETISING)', 3, 1),
                      ('Palletising and Shrinkwrap', 'Wastage', 'WASTAGE', 3, 2),
                      ('Palletising and Shrinkwrap', 'Operator', 'SIGN(PALLETISING)', 3, 3),
                      ('Bearers, Labels, Shrinkwrap', 'Start', 'AWAIT(WRAPPING)', 3, 1),
                      ('Bearers, Labels, Shrinkwrap', 'Labels', 'boolean', 3, 2),
                      ('Bearers, Labels, Shrinkwrap', 'Recycled Paper', 'boolean', 3, 3),
                      ('Bearers, Labels, Shrinkwrap', 'Hole Free', 'boolean', 3, 4),
                      ('Bearers, Labels, Shrinkwrap', 'Pallet', 'string', 3, 5),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Straps', 'int', 3, 6),
                      ('Bearers, Labels, Shrinkwrap', 'Extra Labels', 'boolean', 3, 7),
                      ('Bearers, Labels, Shrinkwrap', 'Quantity Bearers', 'int', 3, 8),
                      ('Bearers, Labels, Shrinkwrap', 'Stamped', 'boolean', 3, 9),
                      ('Bearers, Labels, Shrinkwrap', 'Operator', 'SIGN(WRAPPING)', 3, 10),
                      ('Storage', 'Holding Bay', 'string', 3, 1),
                      ('Storage', 'FLT', 'SIGN(FLT)', 3, 2),
                      ('Dispatch Docs', 'Wagon Photo', 'PHOTO', 3, 1),
                      ('Dispatch Docs', 'FLT', 'SIGN(FLT)', 3, 2))
    AS v(phase_desc, name, config, input, "order")
              ON p.description = v.phase_desc;