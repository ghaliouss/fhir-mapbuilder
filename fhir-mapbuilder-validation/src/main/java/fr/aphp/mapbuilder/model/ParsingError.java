package fr.aphp.mapbuilder.model;

public class ParsingError extends Exception {
    public ParsingError(String message, Throwable cause) {
        super(message, cause);
    }
}
