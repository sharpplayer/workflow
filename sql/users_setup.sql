INSERT INTO users (
    id,
    username,
    password_hash,
    pin_hash,
    roles,
    enabled,
    password_reset,
    pin_reset,
    created_at
)
VALUES
(
    1,
    'admin',
    '$argon2id$v=19$m=65536,t=3,p=1$gQQH+nO7FJxxJJ/ijGHlkw$uX/0yO+PQKSX5g895jfLL/fY4IjK1mTZvTHx7+TF73E',
    NULL,
    ARRAY['ADMIN'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-11 12:02:19.908383+00'
),
(
    2,
    'lo',
    '$argon2id$v=19$m=65536,t=3,p=1$EK+u9Y9A80BqJs8YEy17ew$qUwnMyEW74V3wRlxrRSCrZiODtsyPt9MUDV5l1N9ijM',
    '$argon2id$v=19$m=65536,t=3,p=1$73aUkmkhfYllML5hxJW3Qg$BwwrRAeKW6tf2b+gSE+CXdFxMsboBLUkzBRHIib0yyM',
    ARRAY['LOGISTICS'],
    TRUE,
    FALSE,
    FALSE,
    '2026-05-11 13:10:11.60947+00'
),
(
    3,
    'bs',
    '$argon2id$v=19$m=65536,t=3,p=1$ZfefxReJ1KJm3kKl0AoVgg$ve08/EkEPg3z+xSnwGnjdCqBk+8rMH2Cww3OpNod/kA',
    '$argon2id$v=19$m=65536,t=3,p=1$M3nMGDL+0Cum+APbabj8zg$Jwnj3vnrMJcprZQ4ffAXorJXE2XoaZNKiyqv/niC7go',
    ARRAY['BEAMSAW'],
    TRUE,
    FALSE,
    FALSE,
    '2026-05-11 13:10:23.137086+00'
),
(
    4,
    'an',
    '$argon2id$v=19$m=65536,t=3,p=1$EMJkQaNAA4mRTMQO9gTxAQ$Ju5wL4SsnvMXkMQ0SRfO7vLrGQTqAW3MU88SwSJMElU',
    NULL,
    ARRAY['ANDERSON'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-11 13:10:33.053841+00'
),
(
    5,
    'se',
    '$argon2id$v=19$m=65536,t=3,p=1$680lUxIo4Og3ydCpn+p6ew$Fgjcr/ETouaPEJV6ftQYa1tjE41JdF9gIYqxJSxFXOM',
    NULL,
    ARRAY['SETTER'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-11 13:10:43.816379+00'
),
(
    6,
    'in',
    '$argon2id$v=19$m=65536,t=3,p=1$LDki+23hYxcBdDMGbvwxKA$QvxdVSQYEE9/IIOXkOooXMz0qU7+flSB3DtbXP690m8',
    '$argon2id$v=19$m=65536,t=3,p=1$5nLIgbEt+JSJKQqsO+Ujfw$O9GRHhhSXOce2F1+gb7hRo7kkjLuyGTmhJ8dv6vE43Y',
    ARRAY['INSPECTOR'],
    TRUE,
    FALSE,
    FALSE,
    '2026-05-11 13:10:54.655911+00'
),
(
    7,
    'ra',
    '$argon2id$v=19$m=65536,t=3,p=1$PuYpuLgyRayLDrdh09xl3w$ohe1GVZbqdiWSazo2RsSgx7PciiN3z+ZYpsJloDyGc4',
    NULL,
    ARRAY['RACKING'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-11 13:11:06.96516+00'
),
(
    8,
    'op',
    '$argon2id$v=19$m=65536,t=3,p=1$vnz/tC41IwCRRwTq1rl1ow$q5K17PZoGT1Bzy7aluxjbmZRDwOzjoDoDamTsJKvObY',
    NULL,
    ARRAY['OP'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-13 13:18:14.691837+00'
),
(
    9,
    'pa',
    '$argon2id$v=19$m=65536,t=3,p=1$sordeEeR1fVYSUlK1gsP1w$p8pOFptkvRSEZudxTdgxrh6xvX2iHJ4pjAWGlATHXwg',
    NULL,
    ARRAY['PALLETISING'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-13 13:18:30.039053+00'
),
(
    10,
    'fl',
    '$argon2id$v=19$m=65536,t=3,p=1$a9poJbgR7pwjGANqc3UEfw$OQYxl32BhlcpiO2ats9BFV7vlmOg5QYt5E5vIqTJo1g',
    NULL,
    ARRAY['FLT'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-13 13:18:47.006713+00'
),
(
    11,
    'wr',
    '$argon2id$v=19$m=65536,t=3,p=1$WPKB1hp1++/ciedfufqIYw$fbjwcFE6gbpKN5bGpYxAmJRrIQmVg9hYL86O3JpsOis',
    NULL,
    ARRAY['WRAPPING'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-13 13:19:02.481059+00'
),
(
    12,
    'st',
    '$argon2id$v=19$m=65536,t=3,p=1$zE2mSvcXxsn6MS88NFyYuA$CwlD2fRfL3Ie5E7Sg/ImsLjgAtfVbjAglYlM97omEro',
    NULL,
    ARRAY['STACKING'],
    TRUE,
    FALSE,
    TRUE,
    '2026-05-13 13:44:14.057914+00'
);

-- Reset sequence to avoid duplicate key issues
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));