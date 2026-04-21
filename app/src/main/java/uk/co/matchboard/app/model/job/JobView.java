package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;

public record JobView(int id, long number, int parts, OffsetDateTime due, String customer,
                      int status) {
}

