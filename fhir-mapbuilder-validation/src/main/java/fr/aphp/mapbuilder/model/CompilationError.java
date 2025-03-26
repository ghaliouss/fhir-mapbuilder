package fr.aphp.mapbuilder.model;

public class CompilationError extends Exception {
    public CompilationError(String message) {
        super(message);
    }
}
