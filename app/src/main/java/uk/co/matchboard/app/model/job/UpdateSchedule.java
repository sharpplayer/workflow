package uk.co.matchboard.app.model.job;

import java.util.List;

public record UpdateSchedule(String date, List<Integer> jobPartIds) {

}
