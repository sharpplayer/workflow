package uk.co.matchboard.app.model.job;

import java.time.LocalDate;

public record ScheduleView(LocalDate date, int machineId, String machine) {

}
