package uk.co.matchboard.app.service;

import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.wastage.CreateWastage;
import uk.co.matchboard.app.model.wastage.WastageView;
import uk.co.matchboard.app.model.wastage.Wastages;

public interface WastageService {

    Result<WastageView> createWastage(CreateWastage wastage);

    Result<Wastages> getWastage(int jobPhaseId);
}
