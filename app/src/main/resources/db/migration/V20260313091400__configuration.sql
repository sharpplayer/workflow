CREATE TABLE configuration
(
    id    TEXT PRIMARY KEY,
    type  TEXT,
    value TEXT
);

INSERT INTO configuration (id,
                           type,
                           value)
VALUES ('ROLES', 'string[]', 'ADMIN,SETTER,OP,INSPECTOR,STACKING,PALLETISING,WRAPPING,RACKING,LOGISTICS'),
       ('FINISH', 'string[]', 'RAW,TRADE,TRADE PLUS,SUPREME'),
       ('SURFACE', 'string[]', 'SINGLE FACE,FRONT AND BACK,ALL 6 SIDES'),
       ('INSERTS', 'string[]', 'TOP BOARD ONLY,EVERY BOARD,NONE'),
       ('COLOUR', 'colour[]', 'RED,BLUE,GREEN,YELLOW,PURPLE,ORANGE,BROWN,PINK'),
       ('PRODUCTCSV', 'string[]',
        'part=PART No.,owner=OWNER,material=MATERIAL,profile=PROFILE,edge=EDGE,format=FORMAT,dimensions=Dimensions,thickness=THICKNESS,pitch=PITCH,machinery=MACHINERY,enabled=AVAILABLE,racktype=RACKTYPE,finish=FINISH,packsize=PACK SIZE'),
       ('CUSTOMERCSV', 'string[]',
        'code=code,name=name,zone=zone,contact=contact,contactNumber=contactNumber,proforma=proforma,enabled=enabled'),
       ('NEXTJOB', 'int', '20000')
;

