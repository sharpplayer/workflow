package uk.co.matchboard.app.model.job;

import java.time.OffsetDateTime;
import java.util.List;

public record Job(int id, long number, OffsetDateTime due, Integer customer, Integer carrier,
                  boolean callOff, List<JobPart> parts, int status, OffsetDateTime paymentConfirmed) {

}
