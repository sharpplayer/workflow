CREATE TABLE configuration
(
    id    TEXT PRIMARY KEY,
    type  TEXT,
    value TEXT
);

INSERT INTO configuration (id,
                           type,
                           value)
VALUES ('ROLES', 'string[]',
        'ADMIN,SETTER,OP,INSPECTOR,STACKING,PALLETISING,WRAPPING,RACKING,LOGISTICS,FLT'),
       ('FINISH', 'string[]', 'RAW,TRADE,TRADE PLUS,SUPREME'),
       ('SMOOTHNESS', 'string[]', '5,4,3,2,1'),
       ('SURFACE', 'string[]', 'SINGLE FACE,FRONT AND BACK,ALL 6 SIDES'),
       ('INSERTS', 'string[]', 'TOP BOARD ONLY,EVERY BOARD,NONE'),
       ('COLOUR', 'colour[]', 'RED,BLUE,GREEN,YELLOW,PURPLE,ORANGE,BROWN,PINK'),
       ('PRODUCTCSV', 'string[]',
        'part=PART No.,owner=OWNER,material=MATERIAL,profile=PROFILE,edge=EDGE,format=FORMAT,dimensions=Dimensions,thickness=THICKNESS,pitch=PITCH,machinery=MACHINERY,enabled=AVAILABLE,racktype=RACKTYPE,finish=FINISH,packsize=PACK SIZE'),
       ('CUSTOMERCSV', 'string[]',
        'code=code,name=name,zone=zone,contact=contact,contactNumber=contactNumber,proforma=proforma,enabled=enabled'),
       ('NEXTJOB', 'int', '20000'),
       ('DATA', 'string', 'C:\data\'),
       ('WASTAGEREASON', 'string[]',
        '1=Mechanical Handling,2=Setter Procedure Error,3=Machine Mechanical Breakdown,4=Tool Worn or Damaged,5=Feeder/Flipper Handling Error,6=Faulty Gun/Pump,7=Dirt in Paint,8=Handling From Rack to Stack,9=Shrink Wrap Gun Too Near Material,0=Other');
;

