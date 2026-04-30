package uk.co.matchboard.app.service;

import org.springframework.stereotype.Service;
import uk.co.matchboard.app.exception.InvalidUserException;
import uk.co.matchboard.app.functional.Result;
import uk.co.matchboard.app.model.wastage.CreateWastage;
import uk.co.matchboard.app.model.wastage.WastageView;
import uk.co.matchboard.app.model.wastage.Wastages;

@Service
public class WastageServiceImpl implements WastageService {

    private final DatabaseService databaseService;

    public WastageServiceImpl(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @Override
    public Result<WastageView> createWastage(CreateWastage wastage) {
        return databaseService.findUser(wastage.reportedBy()).fold(user ->
                        databaseService.createWastage(user.id(), wastage)
                                .map(w -> new WastageView(wastage.rpi(), wastage.quantity(),
                                        wastage.reportedBy(), wastage.reason(), w.createDate())),
                Result::failure, () -> Result.failure(new InvalidUserException(true)));
    }

    @Override
    public Result<Wastages> getWastage(int jobPhaseId) {
        return databaseService.getWastage(jobPhaseId).map(Wastages::new);
    }
}
