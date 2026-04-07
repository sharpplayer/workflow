CREATE TABLE configuration
(
    id    VARCHAR(20) PRIMARY KEY,
    type  VARCHAR(20),
    value VARCHAR(255)
);

INSERT INTO configuration (id,
                           type,
                           value)
VALUES ('ROLES', 'string[]', 'ADMIN,SETTER,OP,INSPECTOR'),
       ('FINISH', 'string[]', 'RAW,TRADE,TRADE PLUS,SUPREME'),
       ('SURFACE', 'string[]', 'SINGLE FACE,FRONT AND BACK,ALL 6 SIDES'),
       ('INSERTS', 'string[]', 'TOP BOARD ONLY,EVERY BOARD,NONE'),
       ('COLOUR', 'colour[]', 'RED,BLUE,GREEN,YELLOW,PURPLE,ORANGE,BROWN,PINK'),
       ('SAGECSV', 'string[]',
        'part=PART No.,owner=OWNER,material=MATERIAL,profile=PROFILE,edge=EDGE,format=FORMAT,dimensions=Dimensions,thickness=THICKNESS,pitch=PITCH,machinery=MACHINERY,enabled=AVAILABLE,racktype=RACKTYPE,finish=FINISH'),
       ('NEXTJOB', 'int', '20000')
;

