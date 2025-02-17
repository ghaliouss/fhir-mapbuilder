package aphp.mapbuilder.Models;

public class ValidationError extends Exception {
    public ValidationError(String message) {
        super(message);
    }
}