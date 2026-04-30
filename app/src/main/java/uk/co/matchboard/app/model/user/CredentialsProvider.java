package uk.co.matchboard.app.model.user;

public interface CredentialsProvider {

    boolean pin();

    String user();

    String password();

    String role();
}
