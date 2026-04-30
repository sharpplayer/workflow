package uk.co.matchboard.app.model.job;

import java.util.List;
import java.util.Map;

public record ScheduleForRole(List<ScheduledJobPartParam> params, Map<Integer, ScheduleSummary> scheduleSummary) {

}
