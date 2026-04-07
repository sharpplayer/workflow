package uk.co.matchboard.app.model.job;

import java.time.LocalDateTime;
import java.util.List;

public record Job(int id, long number, LocalDateTime due, Integer customer, Integer carrier,
                  boolean callOff, List<JobPart> parts, int status) {

}
