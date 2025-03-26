package fr.aphp.mapbuilder.model;

public class ValidationError extends Exception {
    public ValidationError(String message) {
        super(message);
    }
}
